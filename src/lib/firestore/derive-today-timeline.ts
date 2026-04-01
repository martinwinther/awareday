import type { ActivityEntry, EventEntry } from "@/lib/firestore/models";
import { isOnLocalDay } from "@/lib/firestore/local-day";

export type TodayTimelineItem =
  | {
      kind: "activity-start";
      entry: ActivityEntry;
    }
  | {
      kind: "activity-end";
      entry: ActivityEntry;
    }
  | {
      kind: "event";
      entry: EventEntry;
    };


export function deriveTodayTimeline(
  activityEntries: ActivityEntry[],
  eventEntries: EventEntry[],
  day: Date
): TodayTimelineItem[] {
  const timelineItems: TodayTimelineItem[] = [];

  for (const entry of activityEntries) {
    if (!isOnLocalDay(entry.timestamp.toDate(), day)) {
      continue;
    }

    timelineItems.push({
      kind: entry.action === "start" ? "activity-start" : "activity-end",
      entry,
    });
  }

  for (const entry of eventEntries) {
    if (!isOnLocalDay(entry.timestamp.toDate(), day)) {
      continue;
    }

    timelineItems.push({
      kind: "event",
      entry,
    });
  }

  return timelineItems.sort((left, right) => {
    const timestampDifference = right.entry.timestamp.toMillis() - left.entry.timestamp.toMillis();

    if (timestampDifference !== 0) {
      return timestampDifference;
    }

    if (left.kind !== right.kind) {
      return left.kind.localeCompare(right.kind);
    }

    return right.entry.id.localeCompare(left.entry.id);
  });
}

