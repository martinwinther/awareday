import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable, ActivityIndicator, Platform, Modal, TextInput, useWindowDimensions } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { FirebaseError } from "firebase/app";
import { Timestamp } from "firebase/firestore";
import { Card } from "@/src/components/card";
import { DaySchedule as SharedDaySchedule } from "@/src/components/day-schedule";
import { SectionLabel } from "@/src/components/section-label";
import { useAuthUser } from "@/src/lib/firebase/auth";
import {
  deriveDailyActivityTotals,
  deriveDailyEventCounts,
  deriveTodayTimeline,
  deriveSingleDayCalendarItems,
  formatClockTime,
  formatDuration,
  type ActivityEntry,
  type EventEntry,
  type DayViewActivityBlock,
  type DayViewEventMarker,
} from "@/src/lib/domain";
import {
  deleteActivityEntry,
  deleteEventEntry,
  listActivityEntriesForDay,
  listEventEntriesForDay,
  updateActivityEntry,
  updateEventEntry,
} from "@/src/lib/firestore/repositories";
import {
  colors,
  spacing,
  radius,
  fontSize,
  controlSize,
  layout,
  getScreenHorizontalPadding,
} from "@/src/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function getStartOfDay(day: Date): Date {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  return start;
}

function shiftLocalDay(day: Date, days: number): Date {
  const shifted = new Date(day);
  shifted.setDate(shifted.getDate() + days);
  return getStartOfDay(shifted);
}

function isSameLocalDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatSelectedDay(day: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(day);
}

type EditableScheduleEntry =
  | { kind: "activity"; entry: ActivityEntry }
  | { kind: "event"; entry: EventEntry };

type ActivityBlockEditChoice = {
  label: string;
  startEntry: ActivityEntry;
  endEntry: ActivityEntry;
};

function formatEditorTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function parseEditorTime(value: string): { hours: number; minutes: number } | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);

  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return { hours, minutes };
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user } = useAuthUser();
  const [selectedDay, setSelectedDay] = useState(() => getStartOfDay(new Date()));
  const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>([]);
  const [eventEntries, setEventEntries] = useState<EventEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activityBlockEditChoice, setActivityBlockEditChoice] = useState<ActivityBlockEditChoice | null>(null);
  const [editableScheduleEntry, setEditableScheduleEntry] = useState<EditableScheduleEntry | null>(null);
  const [entryLabelInput, setEntryLabelInput] = useState("");
  const [entryTimeInput, setEntryTimeInput] = useState("");
  const [isSavingEntryEdit, setIsSavingEntryEdit] = useState(false);

  const isSelectedDayToday = useMemo(() => isSameLocalDay(selectedDay, new Date()), [selectedDay]);
  const formattedSelectedDay = useMemo(() => formatSelectedDay(selectedDay), [selectedDay]);

  useEffect(() => {
    if (!user) {
      setActivityEntries([]);
      setEventEntries([]);
      setIsLoading(false);
      return;
    }

    let isActive = true;

    const loadSelectedDayEntries = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [loadedActivities, loadedEvents] = await Promise.all([
          listActivityEntriesForDay(user.uid, selectedDay),
          listEventEntriesForDay(user.uid, selectedDay),
        ]);

        if (!isActive) {
          return;
        }

        setActivityEntries(loadedActivities);
        setEventEntries(loadedEvents);
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (error instanceof FirebaseError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("We could not load this day. Please try again.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadSelectedDayEntries();

    return () => {
      isActive = false;
    };
  }, [selectedDay, user]);

  const activityTotals = useMemo(
    () => deriveDailyActivityTotals(activityEntries, selectedDay),
    [activityEntries, selectedDay],
  );

  const eventCounts = useMemo(
    () => deriveDailyEventCounts(eventEntries, selectedDay),
    [eventEntries, selectedDay],
  );

  const timelineItems = useMemo(
    () => deriveTodayTimeline(activityEntries, eventEntries, selectedDay),
    [activityEntries, eventEntries, selectedDay],
  );

  const dayCalendarItems = useMemo(
    () => deriveSingleDayCalendarItems(activityEntries, eventEntries, selectedDay),
    [activityEntries, eventEntries, selectedDay],
  );
  const activityEntryById = useMemo(() => new Map(activityEntries.map((entry) => [entry.id, entry])), [activityEntries]);
  const eventEntryById = useMemo(() => new Map(eventEntries.map((entry) => [entry.id, entry])), [eventEntries]);

  const openScheduleEntryEditor = useCallback((entry: EditableScheduleEntry) => {
    const timestamp = entry.entry.timestamp.toDate();
    setEditableScheduleEntry(entry);
    setEntryLabelInput(entry.entry.label);
    setEntryTimeInput(formatEditorTime(timestamp));
  }, []);

  const contentHorizontalPadding = getScreenHorizontalPadding(width, Platform.OS === "web");

  const refreshSelectedDayEntries = useCallback(async () => {
    if (!user) {
      return;
    }

    const [loadedActivities, loadedEvents] = await Promise.all([
      listActivityEntriesForDay(user.uid, selectedDay),
      listEventEntriesForDay(user.uid, selectedDay),
    ]);

    setActivityEntries(loadedActivities);
    setEventEntries(loadedEvents);
  }, [selectedDay, user]);

  const handleScheduleActivityBlockPress = useCallback((block: DayViewActivityBlock) => {
    const [startEntryId, endEntryId] = block.id.split(":");
    const startEntry = activityEntryById.get(startEntryId);
    const endEntry = activityEntryById.get(endEntryId);

    if (startEntry && endEntry) {
      setActivityBlockEditChoice({
        label: block.label,
        startEntry,
        endEntry,
      });
      return;
    }

    if (startEntry) {
      openScheduleEntryEditor({ kind: "activity", entry: startEntry });
      return;
    }

    if (endEntry) {
      openScheduleEntryEditor({ kind: "activity", entry: endEntry });
      return;
    }

    setErrorMessage("We could not find this activity entry. Please refresh and try again.");
  }, [activityEntryById, openScheduleEntryEditor]);

  const handleScheduleEventMarkerPress = useCallback((marker: DayViewEventMarker) => {
    const entry = eventEntryById.get(marker.id);

    if (!entry) {
      setErrorMessage("We could not find this check-in entry. Please refresh and try again.");
      return;
    }

    openScheduleEntryEditor({ kind: "event", entry });
  }, [eventEntryById, openScheduleEntryEditor]);

  const handleSaveEditedScheduleEntry = useCallback(async () => {
    if (!user || !editableScheduleEntry) {
      return;
    }

    const label = entryLabelInput.trim();

    if (label.length === 0) {
      setErrorMessage("Please enter a label before saving.");
      return;
    }

    const parsedTime = parseEditorTime(entryTimeInput);

    if (!parsedTime) {
      setErrorMessage("Enter time as HH:MM in 24-hour format.");
      return;
    }

    const nextTimestamp = new Date(editableScheduleEntry.entry.timestamp.toDate());
    nextTimestamp.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);

    setIsSavingEntryEdit(true);
    setErrorMessage(null);

    try {
      if (editableScheduleEntry.kind === "activity") {
        await updateActivityEntry({
          userId: user.uid,
          id: editableScheduleEntry.entry.id,
          label,
          timestamp: Timestamp.fromDate(nextTimestamp),
        });
      } else {
        await updateEventEntry({
          userId: user.uid,
          id: editableScheduleEntry.entry.id,
          label,
          timestamp: Timestamp.fromDate(nextTimestamp),
        });
      }

      await refreshSelectedDayEntries();
      setEditableScheduleEntry(null);
    } catch (error) {
      setErrorMessage(error instanceof FirebaseError ? error.message : "We could not save this entry. Please try again.");
    } finally {
      setIsSavingEntryEdit(false);
    }
  }, [editableScheduleEntry, entryLabelInput, entryTimeInput, refreshSelectedDayEntries, user]);

  const handleDeleteEditedScheduleEntry = useCallback(async () => {
    if (!user || !editableScheduleEntry) {
      return;
    }

    setIsSavingEntryEdit(true);
    setErrorMessage(null);

    try {
      if (editableScheduleEntry.kind === "activity") {
        await deleteActivityEntry({ userId: user.uid, id: editableScheduleEntry.entry.id });
      } else {
        await deleteEventEntry({ userId: user.uid, id: editableScheduleEntry.entry.id });
      }

      await refreshSelectedDayEntries();
      setEditableScheduleEntry(null);
    } catch (error) {
      setErrorMessage(error instanceof FirebaseError ? error.message : "We could not delete this entry. Please try again.");
    } finally {
      setIsSavingEntryEdit(false);
    }
  }, [editableScheduleEntry, refreshSelectedDayEntries, user]);

  const closeScheduleEntryEditor = () => {
    if (isSavingEntryEdit) {
      return;
    }

    setEditableScheduleEntry(null);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingHorizontal: contentHorizontalPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.slimTopCard}>
          <View style={styles.section}>
            <SectionLabel>History</SectionLabel>
            <View style={styles.dayPicker}>
              <Pressable
                style={styles.dayButton}
                onPress={() => setSelectedDay((previousDay) => shiftLocalDay(previousDay, -1))}
                accessibilityLabel="Previous day"
                accessibilityRole="button"
                accessibilityHint="Show the previous day in history"
              >
                <FontAwesome name="chevron-left" size={12} color={colors.stone700} />
              </Pressable>
              <Text style={styles.dayLabel}>{formattedSelectedDay}</Text>
              <Pressable
                style={[styles.dayButton, isSelectedDayToday && styles.dayButtonDisabled]}
                onPress={() => setSelectedDay((previousDay) => shiftLocalDay(previousDay, 1))}
                disabled={isSelectedDayToday}
                accessibilityLabel="Next day"
                accessibilityRole="button"
                accessibilityHint={isSelectedDayToday ? "Already on today" : "Show the next day in history"}
              >
                <FontAwesome
                  name="chevron-right"
                  size={12}
                  color={isSelectedDayToday ? colors.stone400 : colors.stone700}
                />
              </Pressable>
            </View>
          </View>
        </Card>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>There was a problem.</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <Card>
          <View style={styles.section}>
            <SectionLabel>Day schedule</SectionLabel>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.amber600} />
                <Text style={styles.loadingText}>Loading this day...</Text>
              </View>
            ) : (
              <SharedDaySchedule
                activityBlocks={dayCalendarItems.activityBlocks}
                eventMarkers={dayCalendarItems.eventMarkers}
                onPressActivityBlock={handleScheduleActivityBlockPress}
                onPressEventMarker={handleScheduleEventMarkerPress}
              />
            )}
          </View>
        </Card>

        <Card>
          <View style={styles.summaryGroup}>
            <View style={styles.summarySection}>
              <SectionLabel>Activity totals</SectionLabel>
              {isLoading ? (
                <ActivityIndicator color={colors.amber600} />
              ) : activityTotals.length === 0 ? (
                <Text style={styles.emptyText}>No completed activities for this day.</Text>
              ) : (
                activityTotals.map((total) => (
                  <View key={total.normalizedLabel} style={styles.totalRow}>
                    <Text style={styles.totalLabel}>{total.label}</Text>
                    <Text style={styles.totalValue}>{formatDuration(total.totalDurationMs)}</Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summarySection}>
              <SectionLabel>Check-in counts</SectionLabel>
              {isLoading ? (
                <ActivityIndicator color={colors.amber600} />
              ) : eventCounts.length === 0 ? (
                <Text style={styles.emptyText}>No check-ins logged for this day.</Text>
              ) : (
                eventCounts.map((count) => (
                  <View key={count.normalizedLabel} style={styles.totalRow}>
                    <Text style={styles.totalLabel}>{count.label}</Text>
                    <Text style={styles.totalValue}>{count.count}</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        </Card>

        <Card>
          <View style={styles.section}>
            <SectionLabel>Daily timeline</SectionLabel>
            {isLoading ? (
              <ActivityIndicator color={colors.amber600} />
            ) : timelineItems.length === 0 ? (
              <Text style={styles.emptyText}>No timeline entries for this day.</Text>
            ) : (
              timelineItems.map((item) => {
                const entry = item.entry;
                const badgeLabel = item.kind === "activity-start" ? "Started" : item.kind === "activity-end" ? "Ended" : "Check-in";
                const badgeStyle = item.kind === "activity-start" ? styles.badgeStart : item.kind === "activity-end" ? styles.badgeEnd : styles.badgeEvent;
                const badgeTextStyle = item.kind === "activity-start" ? styles.badgeTextStart : item.kind === "activity-end" ? styles.badgeTextEnd : styles.badgeTextEvent;
                return (
                  <View key={`${item.kind}-${entry.id}`} style={styles.timelineRow}>
                    <View style={styles.timelineRowLeft}>
                      <Text style={styles.timelineRowLabel}>{entry.label}</Text>
                      <Text style={styles.timelineRowTime}>{formatClockTime(entry.timestamp.toDate())}</Text>
                    </View>
                    <View style={[styles.timelineBadge, badgeStyle]}>
                      <Text style={[styles.badgeText, badgeTextStyle]}>{badgeLabel}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </Card>

        <Modal
          visible={activityBlockEditChoice !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setActivityBlockEditChoice(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Activity block details</Text>
              <Text style={styles.modalSubtitle}>Choose the start or end entry to edit for {activityBlockEditChoice?.label}.</Text>

              {activityBlockEditChoice ? (
                <View style={styles.modalList}>
                  <Pressable
                    style={styles.modalListItem}
                    onPress={() => {
                      openScheduleEntryEditor({ kind: "activity", entry: activityBlockEditChoice.startEntry });
                      setActivityBlockEditChoice(null);
                    }}
                  >
                    <View style={styles.modalListTextWrap}>
                      <Text style={styles.modalListLabel}>Start entry</Text>
                      <Text style={styles.modalListTime}>{formatClockTime(activityBlockEditChoice.startEntry.timestamp.toDate())}</Text>
                    </View>
                    <Text style={styles.modalListAction}>Edit</Text>
                  </Pressable>

                  <Pressable
                    style={styles.modalListItem}
                    onPress={() => {
                      openScheduleEntryEditor({ kind: "activity", entry: activityBlockEditChoice.endEntry });
                      setActivityBlockEditChoice(null);
                    }}
                  >
                    <View style={styles.modalListTextWrap}>
                      <Text style={styles.modalListLabel}>End entry</Text>
                      <Text style={styles.modalListTime}>{formatClockTime(activityBlockEditChoice.endEntry.timestamp.toDate())}</Text>
                    </View>
                    <Text style={styles.modalListAction}>Edit</Text>
                  </Pressable>
                </View>
              ) : null}

              <Pressable style={styles.modalCancelButton} onPress={() => setActivityBlockEditChoice(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal
          visible={editableScheduleEntry !== null}
          transparent
          animationType="fade"
          onRequestClose={closeScheduleEntryEditor}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{editableScheduleEntry?.kind === "activity" ? "Edit activity entry" : "Edit check-in entry"}</Text>
              <Text style={styles.modalSubtitle}>Adjust the label or timestamp. Changes apply immediately.</Text>

              <View style={styles.entryEditorGroup}>
                <Text style={styles.entryEditorLabel}>Label</Text>
                <TextInput
                  style={styles.entryEditorInput}
                  value={entryLabelInput}
                  onChangeText={setEntryLabelInput}
                  editable={!isSavingEntryEdit}
                  placeholder={editableScheduleEntry?.kind === "activity" ? "Activity label" : "Check-in label"}
                  placeholderTextColor={colors.stone400}
                />
              </View>

              <View style={styles.entryEditorGroup}>
                <Text style={styles.entryEditorLabel}>Time (HH:MM)</Text>
                <TextInput
                  style={styles.entryEditorInput}
                  value={entryTimeInput}
                  onChangeText={setEntryTimeInput}
                  editable={!isSavingEntryEdit}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="09:30"
                  placeholderTextColor={colors.stone400}
                />
              </View>

              <View style={styles.entryEditorActions}>
                <Pressable
                  style={[styles.entryEditorButton, styles.entryEditorDeleteButton, isSavingEntryEdit && styles.dayButtonDisabled]}
                  onPress={() => void handleDeleteEditedScheduleEntry()}
                  disabled={isSavingEntryEdit}
                >
                  <Text style={styles.entryEditorDeleteText}>Delete</Text>
                </Pressable>
                <Pressable
                  style={[styles.entryEditorButton, styles.entryEditorSaveButton, isSavingEntryEdit && styles.dayButtonDisabled]}
                  onPress={() => void handleSaveEditedScheduleEntry()}
                  disabled={isSavingEntryEdit}
                >
                  <Text style={styles.entryEditorSaveText}>{isSavingEntryEdit ? "Saving..." : "Save"}</Text>
                </Pressable>
              </View>

              <Pressable style={styles.modalCancelButton} onPress={closeScheduleEntryEditor} disabled={isSavingEntryEdit}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: {
    width: "100%",
    maxWidth: layout.contentMaxWidth,
    alignSelf: "center",
    gap: spacing["2xl"],
    paddingBottom: spacing["4xl"],
  },
  section: { gap: spacing.md },
  slimTopCard: {
    minHeight: 96,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  dayPicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.backgroundMuted,
    borderWidth: 1,
    borderColor: colors.borderAmber,
    borderRadius: radius.lg,
    minHeight: controlSize.lg,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  dayButton: {
    borderWidth: 1,
    borderColor: colors.borderAmber,
    backgroundColor: colors.backgroundLight,
    borderRadius: radius.full,
    width: controlSize.md,
    height: controlSize.md,
    alignItems: "center",
    justifyContent: "center",
  },
  dayButtonDisabled: { opacity: 0.45 },
  dayLabel: { flex: 1, textAlign: "center", fontSize: fontSize.xs, fontWeight: "700", color: colors.stone800 },
  errorBox: { backgroundColor: colors.rose50, borderWidth: 1, borderColor: colors.rose200, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  errorTitle: { fontSize: fontSize.sm, fontWeight: "600", color: colors.rose700 },
  errorText: { fontSize: fontSize.xs, color: colors.rose700 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlayBackdrop,
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderAmber,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.base,
    fontWeight: "700",
    color: colors.stone900,
  },
  modalSubtitle: {
    fontSize: fontSize.sm,
    color: colors.stone600,
  },
  modalList: {
    gap: spacing.sm,
  },
  modalListItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.backgroundSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  modalListTextWrap: {
    flex: 1,
    gap: 2,
  },
  modalListLabel: {
    fontSize: fontSize.sm,
    color: colors.stone900,
    fontWeight: "600",
  },
  modalListTime: {
    fontSize: fontSize.xs,
    color: colors.stone500,
  },
  modalListAction: {
    fontSize: fontSize.sm,
    color: colors.orange700,
    fontWeight: "700",
  },
  modalCancelButton: {
    alignSelf: "flex-end",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  modalCancelText: {
    fontSize: fontSize.sm,
    color: colors.stone700,
    fontWeight: "600",
  },
  entryEditorGroup: {
    gap: spacing.xs,
  },
  entryEditorLabel: {
    fontSize: fontSize.xs,
    color: colors.stone600,
    fontWeight: "600",
  },
  entryEditorInput: {
    borderWidth: 1,
    borderColor: colors.borderAmber,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: controlSize.lg,
    fontSize: fontSize.base,
    color: colors.stone900,
    backgroundColor: colors.backgroundLight,
  },
  entryEditorActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  entryEditorButton: {
    flex: 1,
    minHeight: controlSize.lg,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  entryEditorDeleteButton: {
    backgroundColor: colors.rose50,
    borderWidth: 1,
    borderColor: colors.rose200,
  },
  entryEditorSaveButton: {
    backgroundColor: colors.amber900,
  },
  entryEditorDeleteText: {
    color: colors.rose700,
    fontSize: fontSize.sm,
    fontWeight: "700",
  },
  entryEditorSaveText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: "700",
  },
  loadingContainer: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.lg },
  loadingText: { fontSize: fontSize.sm, color: colors.stone500 },
  timelinePreviewEmpty: { gap: 0 },
  timelineHourEmpty: { flexDirection: "row", alignItems: "center", height: 44, gap: spacing.sm },
  timelinePreview: {
    position: "relative",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderAmber,
    backgroundColor: colors.backgroundLight,
    paddingTop: spacing.sm,
  },
  timelineHour: { flexDirection: "row", alignItems: "center", height: 48, gap: spacing.sm },
  timelineHourText: { width: 60, fontSize: fontSize.caption, fontWeight: "500", color: colors.stone500, textAlign: "right" },
  timelineLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.divider },
  emptyNoticeBox: {
    marginTop: spacing.md,
    backgroundColor: colors.backgroundSoft,
    borderWidth: 1,
    borderColor: colors.borderAmber,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  emptyText: { fontSize: fontSize.sm, color: colors.stone500, fontStyle: "italic" },
  emptyDescription: { fontSize: fontSize.xs, color: colors.stone500, lineHeight: 18 },
  summaryGroup: { gap: spacing.lg },
  summarySection: { gap: spacing.sm },
  summaryDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.divider },
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
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.xs },
  totalLabel: { fontSize: fontSize.sm, color: colors.stone700 },
  totalValue: { fontSize: fontSize.sm, fontWeight: "600", color: colors.amber800 },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.backgroundSoft,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  timelineRowLeft: { flex: 1, gap: 2 },
  timelineRowLabel: { fontSize: fontSize.sm, fontWeight: "500", color: colors.stone800 },
  timelineRowTime: { fontSize: fontSize.xs, color: colors.stone500 },
  timelineBadge: { borderRadius: radius.full, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs },
  badgeStart: { backgroundColor: colors.emerald50 },
  badgeEnd: { backgroundColor: colors.backgroundAmberSoft },
  badgeEvent: { backgroundColor: colors.indigo50 },
  badgeText: { fontSize: fontSize.caption, fontWeight: "600" },
  badgeTextStart: { color: colors.emerald600 },
  badgeTextEnd: { color: colors.amber800 },
  badgeTextEvent: { color: colors.indigo600 },
});
