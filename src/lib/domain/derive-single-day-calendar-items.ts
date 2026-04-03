import type { ActivityEntry, EventEntry } from "./models";
import { deriveCompletedActivitySessions } from "./derive-activity-totals";
import { getLocalDayBounds, isOnLocalDay } from "./local-day";

const MINUTES_PER_DAY = 24 * 60;
const EVENT_STACK_THRESHOLD_MS = 6 * 60 * 1000;

export type DayViewActivityBlock = {
  id: string;
  label: string;
  normalizedLabel: string;
  startTimestamp: Date;
  endTimestamp: Date;
  durationMs: number;
  topPercent: number;
  heightPercent: number;
  laneIndex: number;
  laneCount: number;
  laneSpan: number;
};

export type DayViewEventMarker = {
  id: string;
  label: string;
  normalizedLabel: string;
  timestamp: Date;
  topPercent: number;
  stackIndex: number;
  stackSize: number;
};

export type SingleDayCalendarItems = {
  activityBlocks: DayViewActivityBlock[];
  eventMarkers: DayViewEventMarker[];
};

function getMinutesFromDayStart(timestamp: Date, startOfDay: Date): number {
  return (timestamp.getTime() - startOfDay.getTime()) / (1000 * 60);
}

function toPercent(value: number): number {
  return (value / MINUTES_PER_DAY) * 100;
}

type BlockPlacementSeed = {
  id: string;
  label: string;
  normalizedLabel: string;
  startTimestamp: Date;
  endTimestamp: Date;
  durationMs: number;
  startMinute: number;
  endMinute: number;
};

function overlaps(left: BlockPlacementSeed, right: BlockPlacementSeed): boolean {
  return left.startMinute < right.endMinute && right.startMinute < left.endMinute;
}

function withOverlapLanes(seeds: BlockPlacementSeed[]): DayViewActivityBlock[] {
  const sortedSeeds = [...seeds].sort((left, right) => {
    if (left.startMinute !== right.startMinute) {
      return left.startMinute - right.startMinute;
    }

    return left.endMinute - right.endMinute;
  });

  const groups: BlockPlacementSeed[][] = [];
  let currentGroup: BlockPlacementSeed[] = [];
  let currentGroupEndMinute = -1;

  for (const seed of sortedSeeds) {
    if (currentGroup.length === 0 || seed.startMinute < currentGroupEndMinute) {
      currentGroup.push(seed);
      currentGroupEndMinute = Math.max(currentGroupEndMinute, seed.endMinute);
      continue;
    }

    groups.push(currentGroup);
    currentGroup = [seed];
    currentGroupEndMinute = seed.endMinute;
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  const blocks: DayViewActivityBlock[] = [];

  for (const group of groups) {
    const columnEndMinutes: number[] = [];
    const columnById = new Map<string, number>();
    const itemsByColumn = new Map<number, BlockPlacementSeed[]>();

    for (const seed of group) {
      let assignedColumn = -1;

      for (let column = 0; column < columnEndMinutes.length; column += 1) {
        if (columnEndMinutes[column] <= seed.startMinute) {
          assignedColumn = column;
          break;
        }
      }

      if (assignedColumn === -1) {
        assignedColumn = columnEndMinutes.length;
        columnEndMinutes.push(seed.endMinute);
      } else {
        columnEndMinutes[assignedColumn] = seed.endMinute;
      }

      columnById.set(seed.id, assignedColumn);
      const columnItems = itemsByColumn.get(assignedColumn) ?? [];
      columnItems.push(seed);
      itemsByColumn.set(assignedColumn, columnItems);
    }

    const groupColumnCount = columnEndMinutes.length;

    for (const seed of group) {
      const laneIndex = columnById.get(seed.id) ?? 0;
      let laneSpan = 1;

      for (let column = laneIndex + 1; column < groupColumnCount; column += 1) {
        const columnItems = itemsByColumn.get(column) ?? [];
        const hasOverlapInColumn = columnItems.some((columnItem) => overlaps(seed, columnItem));

        if (hasOverlapInColumn) {
          break;
        }

        laneSpan += 1;
      }

      blocks.push({
        id: seed.id,
        label: seed.label,
        normalizedLabel: seed.normalizedLabel,
        startTimestamp: seed.startTimestamp,
        endTimestamp: seed.endTimestamp,
        durationMs: seed.durationMs,
        topPercent: toPercent(seed.startMinute),
        heightPercent: toPercent(seed.endMinute - seed.startMinute),
        laneIndex,
        laneCount: groupColumnCount,
        laneSpan,
      });
    }
  }

  return blocks.sort((left, right) => left.startTimestamp.getTime() - right.startTimestamp.getTime());
}

function withEventStacks(markers: DayViewEventMarker[]): DayViewEventMarker[] {
  const sortedMarkers = [...markers].sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());
  const stackedMarkers: DayViewEventMarker[] = [];
  let cluster: DayViewEventMarker[] = [];

  const flushCluster = () => {
    if (cluster.length === 0) {
      return;
    }

    for (let index = 0; index < cluster.length; index += 1) {
      stackedMarkers.push({
        ...cluster[index],
        stackIndex: index,
        stackSize: cluster.length,
      });
    }

    cluster = [];
  };

  for (const marker of sortedMarkers) {
    const previousMarker = cluster[cluster.length - 1];

    if (!previousMarker) {
      cluster.push(marker);
      continue;
    }

    const differenceMs = marker.timestamp.getTime() - previousMarker.timestamp.getTime();

    if (differenceMs <= EVENT_STACK_THRESHOLD_MS) {
      cluster.push(marker);
      continue;
    }

    flushCluster();
    cluster.push(marker);
  }

  flushCluster();
  return stackedMarkers;
}

export function deriveSingleDayCalendarItems(
  activityEntries: ActivityEntry[],
  eventEntries: EventEntry[],
  day: Date,
): SingleDayCalendarItems {
  const { startOfDay, startOfNextDay } = getLocalDayBounds(day);
  const activityBlockSeeds: BlockPlacementSeed[] = [];
  const eventMarkers: DayViewEventMarker[] = [];

  for (const session of deriveCompletedActivitySessions(activityEntries)) {
    if (session.endTimestamp <= startOfDay || session.startTimestamp >= startOfNextDay) {
      continue;
    }

    const clippedStart = session.startTimestamp < startOfDay ? startOfDay : session.startTimestamp;
    const clippedEnd = session.endTimestamp > startOfNextDay ? startOfNextDay : session.endTimestamp;
    const clippedDurationMs = clippedEnd.getTime() - clippedStart.getTime();

    if (clippedDurationMs <= 0) {
      continue;
    }

    const startMinute = getMinutesFromDayStart(clippedStart, startOfDay);
    const endMinute = getMinutesFromDayStart(clippedEnd, startOfDay);

    activityBlockSeeds.push({
      id: `${session.startEntryId}:${session.endEntryId}`,
      label: session.label,
      normalizedLabel: session.normalizedLabel,
      startTimestamp: clippedStart,
      endTimestamp: clippedEnd,
      durationMs: clippedDurationMs,
      startMinute,
      endMinute,
    });
  }

  const activityBlocks = withOverlapLanes(activityBlockSeeds);

  for (const entry of eventEntries) {
    const timestamp = entry.timestamp.toDate();

    if (!isOnLocalDay(timestamp, day)) {
      continue;
    }

    eventMarkers.push({
      id: entry.id,
      label: entry.label,
      normalizedLabel: entry.normalizedLabel,
      timestamp,
      topPercent: toPercent(getMinutesFromDayStart(timestamp, startOfDay)),
      stackIndex: 0,
      stackSize: 1,
    });
  }

  const stackedEventMarkers = withEventStacks(eventMarkers);

  return {
    activityBlocks,
    eventMarkers: stackedEventMarkers,
  };
}
