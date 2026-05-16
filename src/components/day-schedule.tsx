import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  formatClockTime,
  hexToRgba,
  resolveActivityLabelColor,
  type DayViewActivityBlock,
  type DayViewEventMarker,
} from "@/src/lib/domain";
import { colors, controlSize, fontSize, radius, spacing } from "@/src/theme";

type DayScheduleProps = {
  activityBlocks: DayViewActivityBlock[];
  eventMarkers: DayViewEventMarker[];
  currentTime?: Date;
  showCurrentTimeIndicator?: boolean;
  autoScrollToCurrentTimeOnMount?: boolean;
  maxVisibleHeight?: number;
  activityColorByLabel?: Record<string, string>;
  onPressActivityBlock?: (block: DayViewActivityBlock) => void;
  onPressEventMarker?: (marker: DayViewEventMarker) => void;
};

type AgendaItem =
  | { kind: "activity"; id: string; block: DayViewActivityBlock }
  | { kind: "event"; id: string; marker: DayViewEventMarker }
  | { kind: "now"; id: string; timestamp: Date };

function buildAgendaItems(
  activityBlocks: DayViewActivityBlock[],
  eventMarkers: DayViewEventMarker[],
  nowTimestamp?: Date,
): AgendaItem[] {
  const items: AgendaItem[] = [
    ...activityBlocks.map((block) => ({ kind: "activity", id: block.id, block })),
    ...eventMarkers.map((marker) => ({ kind: "event", id: marker.id, marker })),
  ];

  if (nowTimestamp) {
    items.push({ kind: "now", id: "now", timestamp: nowTimestamp });
  }

  return items.sort((left, right) => {
    const leftTime = left.kind === "activity"
      ? left.block.startTimestamp
      : left.kind === "event"
        ? left.marker.timestamp
        : left.timestamp;
    const rightTime = right.kind === "activity"
      ? right.block.startTimestamp
      : right.kind === "event"
        ? right.marker.timestamp
        : right.timestamp;
    const diff = leftTime.getTime() - rightTime.getTime();

    if (diff !== 0) {
      return diff;
    }

    if (left.kind === right.kind) {
      return 0;
    }

    const order: Record<AgendaItem["kind"], number> = {
      activity: 0,
      event: 1,
      now: 2,
    };

    return order[left.kind] - order[right.kind];
  });
}

export function DaySchedule({
  activityBlocks,
  eventMarkers,
  currentTime,
  showCurrentTimeIndicator = false,
  maxVisibleHeight,
  activityColorByLabel,
  onPressActivityBlock,
  onPressEventMarker,
}: DayScheduleProps) {
  const nowTimestamp = showCurrentTimeIndicator && currentTime ? currentTime : undefined;
  const agendaItems = useMemo(
    () => buildAgendaItems(activityBlocks, eventMarkers, nowTimestamp),
    [activityBlocks, eventMarkers, nowTimestamp],
  );
  const hasEntries = activityBlocks.length > 0 || eventMarkers.length > 0;

  const agendaContent = hasEntries ? (
    <View style={styles.agendaList}>
      {agendaItems.map((item) => {
        if (item.kind === "now") {
          return (
            <View key={item.id} style={styles.agendaNowRow}>
              <View style={styles.agendaNowLine} />
              <Text style={styles.agendaNowText}>Now {formatClockTime(item.timestamp)}</Text>
              <View style={styles.agendaNowLine} />
            </View>
          );
        }

        const isActivity = item.kind === "activity";
        const label = isActivity ? item.block.label : item.marker.label;
        const timeLabel = formatClockTime(isActivity ? item.block.startTimestamp : item.marker.timestamp);
        const metaLabel = isActivity
          ? `Ends ${formatClockTime(item.block.endTimestamp)}`
          : "Check-in";
        const baseColor = isActivity
          ? resolveActivityLabelColor({
            normalizedName: item.block.normalizedLabel,
            color: activityColorByLabel?.[item.block.normalizedLabel],
          })
          : colors.indigo600;
        const pillBackground = isActivity
          ? hexToRgba(baseColor, 0.18)
          : colors.eventPillBackground;
        const pillBorder = isActivity
          ? hexToRgba(baseColor, 0.7)
          : colors.eventPillBorder;
        const pillText = isActivity
          ? hexToRgba(baseColor, 0.95)
          : colors.indigo600;
        const onPress = isActivity
          ? onPressActivityBlock
            ? () => onPressActivityBlock(item.block)
            : undefined
          : onPressEventMarker
            ? () => onPressEventMarker(item.marker)
            : undefined;

        return (
          <Pressable
            key={`${item.kind}-${item.id}`}
            style={({ pressed }) => [
              styles.agendaRow,
              pressed && onPress ? styles.agendaRowPressed : null,
            ]}
            onPress={onPress}
            disabled={!onPress}
            hitSlop={onPress ? { top: 6, right: 6, bottom: 6, left: 6 } : undefined}
            accessibilityRole={onPress ? "button" : undefined}
            accessibilityLabel={onPress ? `Open ${label} entry` : undefined}
            accessibilityHint={onPress ? "View and edit this entry" : undefined}
          >
            <View style={styles.agendaTimeColumn}>
              <Text style={styles.agendaTime}>{timeLabel}</Text>
              <Text style={styles.agendaMeta}>{metaLabel}</Text>
            </View>
            <View style={styles.agendaMain}>
              <View
                style={[
                  styles.agendaPill,
                  {
                    backgroundColor: pillBackground,
                    borderColor: pillBorder,
                  },
                ]}
              >
                <Text style={[styles.agendaPillText, { color: pillText }]} numberOfLines={1}>
                  {label}
                </Text>
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  ) : (
    <View style={styles.emptyNoticeBox}>
      <Text style={styles.emptyText}>No entries for this day yet.</Text>
      <Text style={styles.emptyDescription}>Activity blocks and check-in markers appear here once you log that day.</Text>
    </View>
  );

  if (maxVisibleHeight) {
    return (
      <View style={[styles.agendaShell, { maxHeight: maxVisibleHeight }]}
      >
        <ScrollView
          contentContainerStyle={styles.agendaScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {agendaContent}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.agendaShell}>
      {agendaContent}
    </View>
  );
}

const styles = StyleSheet.create({
  agendaShell: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderAmber,
    backgroundColor: colors.backgroundLight,
    padding: spacing.md,
  },
  agendaScrollContent: {
    paddingBottom: spacing.xs,
  },
  agendaList: {
    gap: spacing.sm,
  },
  agendaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.backgroundSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: controlSize.lg,
  },
  agendaRowPressed: {
    backgroundColor: colors.backgroundMuted,
  },
  agendaTimeColumn: {
    width: 78,
    alignItems: "flex-end",
    gap: 2,
  },
  agendaTime: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.stone700,
  },
  agendaMeta: {
    fontSize: fontSize.xs,
    color: colors.stone500,
  },
  agendaMain: {
    flex: 1,
    minWidth: 0,
  },
  agendaNowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  agendaNowLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.scheduleNowLine,
  },
  agendaNowText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.amber700,
  },
  agendaPill: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    maxWidth: "100%",
  },
  agendaPillText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  emptyNoticeBox: {
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
});
