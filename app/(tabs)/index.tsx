import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View, TextInput, Pressable, ActivityIndicator } from "react-native";
import { FirebaseError } from "firebase/app";
import { ScreenHeader } from "@/src/components/screen-header";
import { Card } from "@/src/components/card";
import { SectionLabel } from "@/src/components/section-label";
import { useAuthUser } from "@/src/lib/firebase/auth";
import {
  deriveDailyActivityTotals,
  deriveDailyEventCounts,
  deriveOpenActivities,
  deriveTodayTimeline,
  normalizeLabelName,
  formatClockTime,
  formatDuration,
  type ActivityEntry,
  type EventEntry,
  type TodayTimelineItem,
} from "@/src/lib/domain";
import {
  createActivityEntry,
  createActivityLabelIfMissing,
  createEventEntry,
  createEventLabelIfMissing,
  deleteActivityEntry,
  deleteEventEntry,
  listActivityEntries,
  listActivityLabels,
  listEventLabels,
  listTodayEventEntries,
} from "@/src/lib/firestore/repositories";
import { colors } from "@/src/theme/colors";
import { spacing, radius, fontSize } from "@/src/theme/spacing";
import { isOnLocalDay } from "@/src/lib/domain/local-day";

const fallbackActivityLabels = ["Work", "Walk dog", "Cooking"];
const fallbackEventLabels = ["Coffee", "Water", "Energy drink"];

export default function TodayScreen() {
  const { user } = useAuthUser();
  const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>([]);
  const [eventEntries, setEventEntries] = useState<EventEntry[]>([]);
  const [activityQuickLabels, setActivityQuickLabels] = useState<string[] | null>(null);
  const [eventQuickLabels, setEventQuickLabels] = useState<string[] | null>(null);
  const [activityLabelInput, setActivityLabelInput] = useState("");
  const [eventLabelInput, setEventLabelInput] = useState("");
  const [isStartingActivity, setIsStartingActivity] = useState(false);
  const [isEndingActivity, setIsEndingActivity] = useState(false);
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadActivities = useCallback(async (userId: string) => {
    setIsLoadingActivities(true);
    try {
      setActivityEntries(await listActivityEntries(userId));
    } catch (error) {
      setErrorMessage(error instanceof FirebaseError ? error.message : "Could not load activities.");
    } finally {
      setIsLoadingActivities(false);
    }
  }, []);

  const loadEvents = useCallback(async (userId: string) => {
    setIsLoadingEvents(true);
    try {
      setEventEntries(await listTodayEventEntries(userId));
    } catch (error) {
      setErrorMessage(error instanceof FirebaseError ? error.message : "Could not load events.");
    } finally {
      setIsLoadingEvents(false);
    }
  }, []);

  const loadActivityLabels = useCallback(async (userId: string) => {
    try {
      const labels = await listActivityLabels(userId);
      setActivityQuickLabels(labels.map((l) => l.name));
    } catch {
      setActivityQuickLabels([]);
    }
  }, []);

  const loadEventLabels = useCallback(async (userId: string) => {
    try {
      const labels = await listEventLabels(userId);
      setEventQuickLabels(labels.map((l) => l.name));
    } catch {
      setEventQuickLabels([]);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setActivityEntries([]);
      setEventEntries([]);
      setActivityQuickLabels(null);
      setEventQuickLabels(null);
      return;
    }
    void loadActivities(user.uid);
    void loadEvents(user.uid);
    void loadActivityLabels(user.uid);
    void loadEventLabels(user.uid);
  }, [loadActivities, loadEvents, loadActivityLabels, loadEventLabels, user]);

  const displayedActivityLabels = useMemo(() => {
    if (activityQuickLabels === null) return [];
    return activityQuickLabels.length === 0 ? [...fallbackActivityLabels] : activityQuickLabels;
  }, [activityQuickLabels]);

  const displayedEventLabels = useMemo(() => {
    if (eventQuickLabels === null) return [];
    return eventQuickLabels.length === 0 ? [...fallbackEventLabels] : eventQuickLabels;
  }, [eventQuickLabels]);

  const openActivitiesToday = useMemo(() => {
    const today = new Date();
    return deriveOpenActivities(activityEntries).filter((e) => isOnLocalDay(e.timestamp.toDate(), today));
  }, [activityEntries]);

  const todayTimeline = useMemo(() => deriveTodayTimeline(activityEntries, eventEntries, new Date()), [activityEntries, eventEntries]);
  const todayTotals = useMemo(() => deriveDailyActivityTotals(activityEntries, new Date()), [activityEntries]);
  const todayEventCounts = useMemo(() => deriveDailyEventCounts(eventEntries, new Date()), [eventEntries]);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  const handleStartActivity = useCallback(async (label: string) => {
    const cleaned = label.trim();
    if (!user || cleaned.length === 0) return;
    setIsStartingActivity(true);
    setErrorMessage(null);
    try {
      await createActivityEntry({ userId: user.uid, label: cleaned, action: "start" });
      try { await createActivityLabelIfMissing({ userId: user.uid, name: cleaned }); } catch {}
      setActivityLabelInput("");
      showSuccess(`Started: ${cleaned}`);
      await loadActivities(user.uid);
      void loadActivityLabels(user.uid);
    } catch (error) {
      setErrorMessage(error instanceof FirebaseError ? error.message : "Could not start activity.");
    } finally {
      setIsStartingActivity(false);
    }
  }, [loadActivities, loadActivityLabels, user]);

  const handleEndActivity = useCallback(async (entry: ActivityEntry) => {
    if (!user) return;
    setIsEndingActivity(true);
    setErrorMessage(null);
    try {
      await createActivityEntry({ userId: user.uid, label: entry.label, action: "end" });
      showSuccess(`Ended: ${entry.label}`);
      await loadActivities(user.uid);
    } catch (error) {
      setErrorMessage(error instanceof FirebaseError ? error.message : "Could not end activity.");
    } finally {
      setIsEndingActivity(false);
    }
  }, [loadActivities, user]);

  const handleLogEvent = useCallback(async (label: string) => {
    const cleaned = label.trim();
    if (!user || cleaned.length === 0) return;
    setIsSubmittingEvent(true);
    setErrorMessage(null);
    try {
      await createEventEntry({ userId: user.uid, label: cleaned });
      try { await createEventLabelIfMissing({ userId: user.uid, name: cleaned }); } catch {}
      setEventLabelInput("");
      showSuccess(`Logged: ${cleaned}`);
      await loadEvents(user.uid);
      void loadEventLabels(user.uid);
    } catch (error) {
      setErrorMessage(error instanceof FirebaseError ? error.message : "Could not log event.");
    } finally {
      setIsSubmittingEvent(false);
    }
  }, [loadEvents, loadEventLabels, user]);

  const handleDeleteTimelineItem = useCallback(async (item: TodayTimelineItem) => {
    if (!user) return;
    setErrorMessage(null);
    try {
      if (item.kind === "event") {
        await deleteEventEntry({ userId: user.uid, id: item.entry.id });
        await loadEvents(user.uid);
      } else {
        await deleteActivityEntry({ userId: user.uid, id: item.entry.id });
        await loadActivities(user.uid);
      }
    } catch (error) {
      setErrorMessage(error instanceof FirebaseError ? error.message : "Could not delete entry.");
    }
  }, [loadActivities, loadEvents, user]);

  const isMutatingActivity = isStartingActivity || isEndingActivity;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <ScreenHeader title="Today" subtitle="Capture the day as it unfolds." />

      {successMessage ? (
        <View style={s.successBox}><Text style={s.successText}>{successMessage}</Text></View>
      ) : null}

      {errorMessage ? (
        <View style={s.errorBox}><Text style={s.errorText}>{errorMessage}</Text></View>
      ) : null}

      {/* Activity quick log */}
      <Card>
        <View style={s.sectionHeader}>
          <SectionLabel>Activity</SectionLabel>
          <View style={s.badge}><Text style={s.badgeText}>{openActivitiesToday.length} open</Text></View>
        </View>
        <TextInput
          style={s.input}
          placeholder="Type an activity label"
          placeholderTextColor={colors.stone400}
          value={activityLabelInput}
          onChangeText={setActivityLabelInput}
          editable={!isMutatingActivity}
        />
        <View style={s.buttonRow}>
          <Pressable style={[s.startButton, isMutatingActivity && s.disabled]} onPress={() => void handleStartActivity(activityLabelInput)} disabled={isMutatingActivity}>
            <Text style={s.buttonTextWhite}>{isStartingActivity ? "Starting..." : "Start"}</Text>
          </Pressable>
          <Pressable
            style={[s.endButton, (isMutatingActivity || openActivitiesToday.length === 0) && s.disabled]}
            onPress={() => {
              const label = activityLabelInput.trim();
              if (label.length > 0) {
                const match = openActivitiesToday.find((e) => e.normalizedLabel === normalizeLabelName(label));
                if (match) void handleEndActivity(match);
                else setErrorMessage(`No open activity found for "${label}".`);
              } else if (openActivitiesToday.length > 0) {
                void handleEndActivity(openActivitiesToday[0]);
              }
            }}
            disabled={isMutatingActivity || openActivitiesToday.length === 0}
          >
            <Text style={s.buttonTextWhite}>{isEndingActivity ? "Ending..." : "End"}</Text>
          </Pressable>
        </View>
        {activityQuickLabels === null ? (
          <ActivityIndicator color={colors.amber600} />
        ) : (
          <View>
            <Text style={s.chipLabel}>Quick start</Text>
            <View style={s.chipRow}>
              {displayedActivityLabels.map((label) => (
                <Pressable key={label} style={[s.chip, isMutatingActivity && s.disabled]} onPress={() => void handleStartActivity(label)} disabled={isMutatingActivity}>
                  <Text style={s.chipText}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </Card>

      {/* Event quick log */}
      <Card>
        <SectionLabel>Event</SectionLabel>
        <TextInput
          style={s.input}
          placeholder="Type an event label"
          placeholderTextColor={colors.stone400}
          value={eventLabelInput}
          onChangeText={setEventLabelInput}
          editable={!isSubmittingEvent}
        />
        <Pressable style={[s.primaryButton, isSubmittingEvent && s.disabled]} onPress={() => void handleLogEvent(eventLabelInput)} disabled={isSubmittingEvent}>
          <Text style={s.buttonTextWhite}>{isSubmittingEvent ? "Logging..." : "Log event"}</Text>
        </Pressable>
        {eventQuickLabels === null ? (
          <ActivityIndicator color={colors.amber600} />
        ) : (
          <View>
            <Text style={s.chipLabel}>Quick log</Text>
            <View style={s.chipRow}>
              {displayedEventLabels.map((label) => (
                <Pressable key={label} style={[s.chip, isSubmittingEvent && s.disabled]} onPress={() => void handleLogEvent(label)} disabled={isSubmittingEvent}>
                  <Text style={s.chipText}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </Card>

      {/* Open activities */}
      <Card>
        <View style={s.sectionHeader}>
          <SectionLabel>Open activities</SectionLabel>
          <Text style={s.countText}>{openActivitiesToday.length} active</Text>
        </View>
        {isLoadingActivities ? (
          <ActivityIndicator color={colors.amber600} />
        ) : openActivitiesToday.length === 0 ? (
          <Text style={s.emptyText}>No open activities right now. Start one above.</Text>
        ) : (
          openActivitiesToday.map((entry) => (
            <View key={entry.id} style={s.openActivityRow}>
              <View style={s.openActivityInfo}>
                <Text style={s.openActivityLabel}>{entry.label}</Text>
                <Text style={s.openActivityTime}>Started {formatClockTime(entry.timestamp.toDate())}</Text>
              </View>
              <Pressable style={s.endSmallButton} onPress={() => void handleEndActivity(entry)} disabled={isEndingActivity}>
                <Text style={s.endSmallButtonText}>End</Text>
              </Pressable>
            </View>
          ))
        )}
      </Card>

      {/* Activity totals */}
      <Card>
        <SectionLabel>Activity totals</SectionLabel>
        {isLoadingActivities ? (
          <ActivityIndicator color={colors.amber600} />
        ) : todayTotals.length === 0 ? (
          <Text style={s.emptyText}>No completed activities yet today.</Text>
        ) : (
          todayTotals.map((total) => (
            <View key={total.normalizedLabel} style={s.totalRow}>
              <Text style={s.totalLabel}>{total.label}</Text>
              <Text style={s.totalValue}>{formatDuration(total.totalDurationMs)}</Text>
            </View>
          ))
        )}
      </Card>

      {/* Event counts */}
      <Card>
        <SectionLabel>Event counts</SectionLabel>
        {isLoadingEvents ? (
          <ActivityIndicator color={colors.amber600} />
        ) : todayEventCounts.length === 0 ? (
          <Text style={s.emptyText}>No events logged yet today.</Text>
        ) : (
          todayEventCounts.map((count) => (
            <View key={count.normalizedLabel} style={s.totalRow}>
              <Text style={s.totalLabel}>{count.label}</Text>
              <Text style={s.totalValue}>{count.count}</Text>
            </View>
          ))
        )}
      </Card>

      {/* Timeline */}
      <Card>
        <SectionLabel>Activity log</SectionLabel>
        {(isLoadingActivities || isLoadingEvents) ? (
          <ActivityIndicator color={colors.amber600} />
        ) : todayTimeline.length === 0 ? (
          <Text style={s.emptyText}>No entries in your activity log yet.</Text>
        ) : (
          todayTimeline.map((item) => {
            const entry = item.entry;
            const badgeColor = item.kind === "activity-start" ? colors.emerald600 : item.kind === "activity-end" ? colors.amber600 : colors.indigo600;
            const badgeLabel = item.kind === "activity-start" ? "Started" : item.kind === "activity-end" ? "Ended" : "Event";
            return (
              <View key={`${item.kind}-${entry.id}`} style={s.timelineRow}>
                <View style={s.timelineLeft}>
                  <View style={[s.timelineBadge, { backgroundColor: badgeColor }]}>
                    <Text style={s.timelineBadgeText}>{badgeLabel}</Text>
                  </View>
                  <Text style={s.timelineLabel}>{entry.label}</Text>
                  <Text style={s.timelineTime}>{formatClockTime(entry.timestamp.toDate())}</Text>
                </View>
                <Pressable onPress={() => void handleDeleteTimelineItem(item)}>
                  <Text style={s.deleteText}>Delete</Text>
                </Pressable>
              </View>
            );
          })
        )}
      </Card>

      <View style={{ height: spacing["3xl"] }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing["3xl"], gap: spacing.lg },
  successBox: { backgroundColor: colors.emerald50, borderWidth: 1, borderColor: colors.emerald600, borderRadius: radius.md, padding: spacing.md },
  successText: { fontSize: fontSize.sm, color: colors.emerald600, fontWeight: "500" },
  errorBox: { backgroundColor: colors.rose50, borderWidth: 1, borderColor: colors.rose200, borderRadius: radius.md, padding: spacing.md },
  errorText: { fontSize: fontSize.sm, color: colors.rose700 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: { backgroundColor: colors.amber100, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeText: { fontSize: fontSize.caption, fontWeight: "500", color: colors.stone600 },
  input: { borderWidth: 1, borderColor: colors.amber200, borderRadius: radius.md, paddingHorizontal: spacing.lg, height: 48, fontSize: fontSize.base, color: colors.stone900, backgroundColor: colors.backgroundLight },
  buttonRow: { flexDirection: "row", gap: spacing.sm },
  startButton: { flex: 1, backgroundColor: colors.emerald600, borderRadius: radius.md, height: 48, alignItems: "center", justifyContent: "center" },
  endButton: { flex: 1, backgroundColor: colors.orange700, borderRadius: radius.md, height: 48, alignItems: "center", justifyContent: "center" },
  primaryButton: { backgroundColor: colors.amber900, borderRadius: radius.md, height: 48, alignItems: "center", justifyContent: "center" },
  buttonTextWhite: { color: colors.white, fontWeight: "600", fontSize: fontSize.base },
  disabled: { opacity: 0.45 },
  chipLabel: { fontSize: fontSize.xs, fontWeight: "500", color: colors.stone500, marginBottom: spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { backgroundColor: colors.backgroundSoft, borderWidth: 1, borderColor: colors.amber300, borderRadius: radius.full, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  chipText: { fontSize: fontSize.sm, color: colors.stone700, fontWeight: "500" },
  countText: { fontSize: fontSize.xs, fontWeight: "500", color: colors.stone600 },
  emptyText: { fontSize: fontSize.sm, color: colors.stone500, fontStyle: "italic" },
  openActivityRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.backgroundSoft, borderRadius: radius.md, padding: spacing.md },
  openActivityInfo: { flex: 1, gap: 2 },
  openActivityLabel: { fontSize: fontSize.sm, fontWeight: "600", color: colors.stone900 },
  openActivityTime: { fontSize: fontSize.xs, color: colors.stone500 },
  endSmallButton: { backgroundColor: colors.orange700, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  endSmallButtonText: { color: colors.white, fontSize: fontSize.xs, fontWeight: "600" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.xs },
  totalLabel: { fontSize: fontSize.sm, color: colors.stone700 },
  totalValue: { fontSize: fontSize.sm, fontWeight: "600", color: colors.amber800 },
  timelineRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider },
  timelineLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
  timelineBadge: { borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  timelineBadgeText: { color: colors.white, fontSize: fontSize.caption, fontWeight: "600" },
  timelineLabel: { fontSize: fontSize.sm, color: colors.stone800, flex: 1 },
  timelineTime: { fontSize: fontSize.xs, color: colors.stone500 },
  deleteText: { fontSize: fontSize.xs, color: colors.rose700, fontWeight: "500" },
});
