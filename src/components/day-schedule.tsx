import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  formatClockTime,
  type DayViewActivityBlock,
  type DayViewEventMarker,
} from "@/src/lib/domain";
import { colors, fontSize, radius, spacing } from "@/src/theme";

type DisplaySeed = {
  id: string;
  startMinute: number;
  endMinute: number;
};

type DisplayLanePlacement = {
  laneIndex: number;
  laneCount: number;
  laneSpan: number;
};

type DayScheduleProps = {
  activityBlocks: DayViewActivityBlock[];
  eventMarkers: DayViewEventMarker[];
  currentTime?: Date;
  showCurrentTimeIndicator?: boolean;
  autoScrollToCurrentTimeOnMount?: boolean;
  maxVisibleHeight?: number;
  onPressActivityBlock?: (block: DayViewActivityBlock) => void;
  onPressEventMarker?: (marker: DayViewEventMarker) => void;
};

function seedsOverlap(left: DisplaySeed, right: DisplaySeed): boolean {
  return left.startMinute < right.endMinute && right.startMinute < left.endMinute;
}

function buildDisplayLaneMap(
  blocks: DayViewActivityBlock[],
  firstHour: number,
): Map<string, DisplayLanePlacement> {
  const seeds: DisplaySeed[] = blocks
    .map((block) => ({
      id: block.id,
      startMinute: (block.startTimestamp.getHours() - firstHour) * 60 + block.startTimestamp.getMinutes(),
      endMinute: (block.endTimestamp.getHours() - firstHour) * 60 + block.endTimestamp.getMinutes(),
    }))
    .sort((left, right) => {
      if (left.startMinute !== right.startMinute) {
        return left.startMinute - right.startMinute;
      }

      return left.endMinute - right.endMinute;
    });

  const clusters: DisplaySeed[][] = [];
  let currentCluster: DisplaySeed[] = [];
  let clusterEndMinute = -1;

  for (const seed of seeds) {
    if (currentCluster.length === 0 || seed.startMinute < clusterEndMinute) {
      currentCluster.push(seed);
      clusterEndMinute = Math.max(clusterEndMinute, seed.endMinute);
      continue;
    }

    clusters.push(currentCluster);
    currentCluster = [seed];
    clusterEndMinute = seed.endMinute;
  }

  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  const laneMap = new Map<string, DisplayLanePlacement>();

  for (const cluster of clusters) {
    const laneEndMinutes: number[] = [];
    const laneById = new Map<string, number>();
    const itemsByLane = new Map<number, DisplaySeed[]>();

    for (const seed of cluster) {
      let laneIndex = -1;

      for (let lane = 0; lane < laneEndMinutes.length; lane += 1) {
        if (laneEndMinutes[lane] <= seed.startMinute) {
          laneIndex = lane;
          break;
        }
      }

      if (laneIndex === -1) {
        laneIndex = laneEndMinutes.length;
        laneEndMinutes.push(seed.endMinute);
      } else {
        laneEndMinutes[laneIndex] = seed.endMinute;
      }

      laneById.set(seed.id, laneIndex);
      const laneItems = itemsByLane.get(laneIndex) ?? [];
      laneItems.push(seed);
      itemsByLane.set(laneIndex, laneItems);
    }

    const laneCount = Math.max(laneEndMinutes.length, 1);

    for (const seed of cluster) {
      const laneIndex = laneById.get(seed.id) ?? 0;
      let laneSpan = 1;

      for (let lane = laneIndex + 1; lane < laneCount; lane += 1) {
        const laneItems = itemsByLane.get(lane) ?? [];
        const hasConflict = laneItems.some((laneItem) => seedsOverlap(seed, laneItem));

        if (hasConflict) {
          break;
        }

        laneSpan += 1;
      }

      laneMap.set(seed.id, {
        laneIndex,
        laneCount,
        laneSpan,
      });
    }
  }

  return laneMap;
}

function getActivityColor(index: number): string {
  const activityColors = [
    colors.emerald600,
    colors.indigo600,
    colors.amber600,
    colors.orange700,
    colors.rose700,
  ];

  return activityColors[index % activityColors.length];
}

function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const normalized = value.length === 3
    ? value.split("").map((char) => `${char}${char}`).join("")
    : value;

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function buildHours(
  activityBlocks: DayViewActivityBlock[],
  eventMarkers: DayViewEventMarker[],
  currentTime: Date | undefined,
): number[] {
  const hasEntries = activityBlocks.length > 0 || eventMarkers.length > 0;

  if (!hasEntries) {
    if (!currentTime) {
      return [9, 10, 11, 12];
    }

    const focusHour = currentTime.getHours();
    const first = Math.max(0, focusHour - 1);
    const last = Math.min(23, focusHour + 2);
    const result: number[] = [];

    for (let hour = first; hour <= last; hour += 1) {
      result.push(hour);
    }

    return result;
  }

  const allHours = new Set<number>();

  for (const block of activityBlocks) {
    const startHour = block.startTimestamp.getHours();
    const endHour = block.endTimestamp.getHours();
    for (let hour = startHour; hour <= endHour; hour += 1) {
      allHours.add(hour);
    }
  }

  for (const marker of eventMarkers) {
    allHours.add(marker.timestamp.getHours());
  }

  if (currentTime) {
    allHours.add(currentTime.getHours());
  }

  const sorted = Array.from(allHours).sort((left, right) => left - right);
  const first = Math.max(0, (sorted[0] ?? 9) - 1);
  const last = Math.min(23, (sorted[sorted.length - 1] ?? 12) + 1);
  const result: number[] = [];

  for (let hour = first; hour <= last; hour += 1) {
    result.push(hour);
  }

  return result;
}

export function DaySchedule({
  activityBlocks,
  eventMarkers,
  currentTime,
  showCurrentTimeIndicator = false,
  autoScrollToCurrentTimeOnMount = false,
  maxVisibleHeight,
  onPressActivityBlock,
  onPressEventMarker,
}: DayScheduleProps) {
  const hasEntries = activityBlocks.length > 0 || eventMarkers.length > 0;
  const leftAxisWidth = 64;
  const rightEventRailWidth = 106;
  const minBlockHeight = 16;
  const laneGap = 3;
  const hourHeight = 48;

  const [scheduleWidth, setScheduleWidth] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);
  const hasAutoScrolledRef = useRef(false);

  const hours = useMemo(
    () => buildHours(activityBlocks, eventMarkers, showCurrentTimeIndicator ? currentTime : undefined),
    [activityBlocks, currentTime, eventMarkers, showCurrentTimeIndicator],
  );

  const firstHour = hours[0] ?? 0;
  const lastHour = hours[hours.length - 1] ?? firstHour;
  const totalMinutes = (lastHour - firstHour + 1) * 60;
  const totalHeight = hours.length * hourHeight;

  const displayLaneMap = useMemo(
    () => buildDisplayLaneMap(activityBlocks, firstHour),
    [activityBlocks, firstHour],
  );

  const activityCanvasWidth = Math.max(
    scheduleWidth - leftAxisWidth - rightEventRailWidth - spacing.lg,
    180,
  );

  const currentTimeOffset = useMemo(() => {
    if (!showCurrentTimeIndicator || !currentTime) {
      return null;
    }

    const minuteOffset = (currentTime.getHours() - firstHour) * 60 + currentTime.getMinutes();

    if (minuteOffset < 0 || minuteOffset > totalMinutes) {
      return null;
    }

    return (minuteOffset / totalMinutes) * totalHeight;
  }, [currentTime, firstHour, showCurrentTimeIndicator, totalHeight, totalMinutes]);

  const currentTimeLabel = currentTime ? formatClockTime(currentTime) : "";

  useEffect(() => {
    if (!autoScrollToCurrentTimeOnMount || currentTimeOffset === null || hasAutoScrolledRef.current) {
      return;
    }

    if (viewportHeight <= 0 || totalHeight <= viewportHeight) {
      hasAutoScrolledRef.current = true;
      return;
    }

    const maxOffset = totalHeight - viewportHeight;

    // Keep the current-time line visible without snapping to a hard edge.
    const targetOffset = currentTimeOffset - viewportHeight * 0.35;
    const comfortPadding = 20;
    const minComfortOffset = Math.min(comfortPadding, maxOffset);
    const maxComfortOffset = Math.max(minComfortOffset, maxOffset - comfortPadding);
    const clampedOffset = Math.min(
      Math.max(targetOffset, minComfortOffset),
      maxComfortOffset,
    );

    scrollRef.current?.scrollTo({ y: clampedOffset, animated: false });
    hasAutoScrolledRef.current = true;
  }, [autoScrollToCurrentTimeOnMount, currentTimeOffset, totalHeight, viewportHeight]);

  const scheduleBody = (
    <View
      style={[styles.timelinePreview, { height: totalHeight + spacing.md }]}
      onLayout={(event) => {
        const nextWidth = event.nativeEvent.layout.width;
        setScheduleWidth((currentWidth) => (
          currentWidth === nextWidth ? currentWidth : nextWidth
        ));
      }}
    >
      {hours.map((hour) => {
        const label = new Date(2000, 0, 1, hour).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        const top = ((hour - firstHour) * 60 / totalMinutes) * totalHeight;

        return (
          <View key={hour} style={[styles.timelineHour, { position: "absolute", top, left: 0, right: 0 }]}>
            <Text style={styles.timelineHourText}>{label}</Text>
            <View style={styles.timelineLine} />
          </View>
        );
      })}

      {currentTimeOffset !== null ? (
        <View
          pointerEvents="none"
          style={[
            styles.currentTimeWrap,
            {
              top: Math.max(0, Math.min(currentTimeOffset, totalHeight - 1)),
              left: leftAxisWidth + spacing.sm,
              right: spacing.xs,
            },
          ]}
        >
          <View style={styles.currentTimeDot} />
          <View style={styles.currentTimeLine} />
          <View style={styles.currentTimePill}>
            <Text style={styles.currentTimePillText}>Now {currentTimeLabel}</Text>
          </View>
        </View>
      ) : null}

      <View
        style={[
          styles.activityCanvas,
          {
            left: leftAxisWidth + spacing.sm,
            width: activityCanvasWidth,
            height: totalHeight,
          },
        ]}
      >
        {activityBlocks.map((block, idx) => {
          const startMinute = (block.startTimestamp.getHours() - firstHour) * 60 + block.startTimestamp.getMinutes();
          const endMinute = (block.endTimestamp.getHours() - firstHour) * 60 + block.endTimestamp.getMinutes();
          const placement = displayLaneMap.get(block.id) ?? { laneIndex: 0, laneCount: 1, laneSpan: 1 };

          const top = (startMinute / totalMinutes) * totalHeight + 1;
          const height = Math.max(((endMinute - startMinute) / totalMinutes) * totalHeight - 2, minBlockHeight);
          const laneWidthPx = activityCanvasWidth / placement.laneCount;
          const left = placement.laneIndex * laneWidthPx + laneGap / 2;
          const width = Math.max((laneWidthPx * placement.laneSpan) - laneGap, 14);

          const baseColor = getActivityColor(idx);
          const hasRoomForText = width >= 62;
          const hasRoomForCompact = width >= 34;
          const showStandardLabel = height >= 18 && hasRoomForText;
          const showCompactLabel = !showStandardLabel && height >= 13 && hasRoomForCompact;
          const compactLabel = width < 56
            ? block.label.slice(0, 2).toUpperCase()
            : `${block.label.slice(0, 14)}${block.label.length > 14 ? "..." : ""}`;

          return (
            <Pressable
              key={block.id}
              style={({ pressed }) => ({
                position: "absolute",
                top,
                left,
                width,
                height,
                backgroundColor: hexToRgba(baseColor, 0.24),
                borderColor: hexToRgba(baseColor, 0.9),
                borderWidth: 1,
                borderRadius: radius.sm,
                paddingHorizontal: spacing.xs,
                paddingVertical: height < 18 ? 1 : 2,
                justifyContent: "center",
                opacity: pressed && onPressActivityBlock ? 0.7 : 1,
              })}
              onPress={onPressActivityBlock ? () => onPressActivityBlock(block) : undefined}
              disabled={!onPressActivityBlock}
              hitSlop={onPressActivityBlock ? { top: 8, right: 8, bottom: 8, left: 8 } : undefined}
              accessibilityRole={onPressActivityBlock ? "button" : undefined}
              accessibilityLabel={onPressActivityBlock ? `Open activity entry actions for ${block.label}` : undefined}
              accessibilityHint={onPressActivityBlock ? "View and edit the start or end entry for this activity block" : undefined}
            >
              {showStandardLabel ? (
                <Text style={styles.activityBlockText} numberOfLines={1}>
                  {block.label}
                </Text>
              ) : showCompactLabel ? (
                <Text style={styles.activityBlockCompactText} numberOfLines={1}>
                  {compactLabel}
                </Text>
              ) : (
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: hexToRgba(baseColor, 0.95) }} />
              )}
            </Pressable>
          );
        })}
      </View>

      <View
        style={[
          styles.eventRail,
          {
            right: spacing.xs,
            width: rightEventRailWidth - spacing.xs,
            height: totalHeight,
          },
        ]}
      >
        {eventMarkers.map((marker) => {
          const minute = (marker.timestamp.getHours() - firstHour) * 60 + marker.timestamp.getMinutes();
          const top = (minute / totalMinutes) * totalHeight;
          const offset = marker.stackIndex * 14;

          return (
            <Pressable
              key={marker.id}
              style={({ pressed }) => ({
                position: "absolute",
                top: top - 5 + offset,
                left: 0,
                right: 0,
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.xs,
                opacity: pressed && onPressEventMarker ? 0.75 : 1,
              })}
              onPress={onPressEventMarker ? () => onPressEventMarker(marker) : undefined}
              disabled={!onPressEventMarker}
              hitSlop={onPressEventMarker ? { top: 8, right: 8, bottom: 8, left: 8 } : undefined}
              accessibilityRole={onPressEventMarker ? "button" : undefined}
              accessibilityLabel={onPressEventMarker ? `Open check-in entry actions for ${marker.label}` : undefined}
              accessibilityHint={onPressEventMarker ? "View and edit this check-in entry" : undefined}
            >
              <View style={styles.eventConnector} />
              <View style={styles.eventDot} />
              <View style={styles.eventPill}>
                <Text style={styles.eventPillTime}>{formatClockTime(marker.timestamp)}</Text>
                <Text style={styles.eventPillText} numberOfLines={1}>{marker.label}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {!hasEntries ? (
        <View style={styles.emptyNoticeBox}>
          <Text style={styles.emptyText}>No entries for this day yet.</Text>
          <Text style={styles.emptyDescription}>Activity blocks and check-in markers appear here once you log that day.</Text>
        </View>
      ) : null}
    </View>
  );

  if (!autoScrollToCurrentTimeOnMount) {
    return scheduleBody;
  }

  return (
    <View
      style={[
        styles.scrollViewport,
        maxVisibleHeight ? { maxHeight: maxVisibleHeight } : null,
      ]}
      onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
    >
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator
        contentContainerStyle={styles.scrollContent}
      >
        {scheduleBody}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  timelinePreview: {
    position: "relative",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderAmber,
    backgroundColor: colors.backgroundLight,
    paddingTop: spacing.sm,
    overflow: "hidden",
  },
  timelineHour: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    gap: spacing.sm,
  },
  timelineHourText: {
    width: 60,
    fontSize: fontSize.caption,
    fontWeight: "500",
    color: colors.stone500,
    textAlign: "right",
  },
  timelineLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },
  activityCanvas: {
    position: "absolute",
    top: spacing.sm,
    bottom: 0,
  },
  eventRail: {
    position: "absolute",
    top: spacing.sm,
    bottom: 0,
  },
  eventConnector: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },
  eventDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.indigo600,
  },
  eventPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.eventPillBackground,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.eventPillBorder,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    maxWidth: 90,
  },
  eventPillTime: {
    fontSize: fontSize.caption,
    color: colors.indigo600,
    fontWeight: "700",
  },
  eventPillText: {
    flex: 1,
    fontSize: fontSize.caption,
    color: colors.indigo600,
    fontWeight: "600",
  },
  activityBlockText: {
    fontSize: fontSize.caption,
    color: colors.stone900,
    fontWeight: "600",
  },
  activityBlockCompactText: {
    fontSize: fontSize.caption,
    color: colors.stone900,
    fontWeight: "700",
  },
  emptyNoticeBox: {
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    backgroundColor: colors.backgroundSoft,
    borderWidth: 1,
    borderColor: colors.borderAmber,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.stone500,
    fontStyle: "italic",
  },
  emptyDescription: {
    fontSize: fontSize.xs,
    color: colors.stone500,
    lineHeight: 18,
  },
  currentTimeWrap: {
    position: "absolute",
    zIndex: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  currentTimeDot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
    backgroundColor: colors.amber700,
  },
  currentTimeLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.scheduleNowLine,
  },
  currentTimePill: {
    backgroundColor: colors.scheduleNowPillBackground,
    borderWidth: 1,
    borderColor: colors.scheduleNowPillBorder,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  currentTimePillText: {
    fontSize: fontSize.caption,
    color: colors.amber800,
    fontWeight: "700",
  },
  scrollViewport: {
    maxHeight: 360,
    borderRadius: radius.lg,
  },
  scrollContent: {
    paddingBottom: spacing.xs,
  },
});
