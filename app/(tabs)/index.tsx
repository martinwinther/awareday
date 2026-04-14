import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View, TextInput, Pressable, ActivityIndicator, Platform, Modal, useWindowDimensions } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { FirebaseError } from "firebase/app";
import { Timestamp } from "firebase/firestore";
import { Card } from "@/src/components/card";
import { DaySchedule } from "@/src/components/day-schedule";
import { SectionLabel } from "@/src/components/section-label";
import { useAuthUser } from "@/src/lib/firebase/auth";
import {
  deriveCompletedActivitySessions,
  deriveDailyActivityTotals,
  deriveDailyEventCounts,
  deriveSingleDayCalendarItems,
  deriveOpenActivities,
  deriveTodayTimeline,
  normalizeLabelName,
  formatClockTime,
  formatDuration,
  type ActivityEntry,
  type DayViewActivityBlock,
  type DayViewEventMarker,
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
  listActivityEntriesForRecentDays,
  listActivityLabels,
  listEventLabels,
  listTodayEventEntries,
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
import { isOnLocalDay } from "@/src/lib/domain/local-day";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const fallbackActivityLabels = ["Work", "Walk dog", "Cooking"];
const fallbackEventLabels = ["Coffee", "Water", "Medication", "Mood check", "Symptom check"];
const ACTIVITY_FETCH_WINDOW_DAYS = 14;

type EditableScheduleEntry =
  | { kind: "activity"; entry: ActivityEntry }
  | { kind: "event"; entry: EventEntry };

type ActivityBlockEditChoice = {
  label: string;
  startEntry: ActivityEntry;
  endEntry: ActivityEntry;
};

type EditableActivityPair = {
  pair: ActivityBlockEditChoice;
  selectedEntryId: string;
};

type QuickLabel = {
  name: string;
  pinned?: boolean;
};

function sortQuickLabels(labels: QuickLabel[]): string[] {
  return [...labels]
    .sort((a, b) => {
      const pinDiff = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
      if (pinDiff !== 0) {
        return pinDiff;
      }

      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    })
    .map((label) => label.name);
}

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

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user } = useAuthUser();
  const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>([]);
  const [eventEntries, setEventEntries] = useState<EventEntry[]>([]);
  const [activityQuickLabels, setActivityQuickLabels] = useState<QuickLabel[] | null>(null);
  const [eventQuickLabels, setEventQuickLabels] = useState<QuickLabel[] | null>(null);
  const [activityLabelInput, setActivityLabelInput] = useState("");
  const [eventLabelInput, setEventLabelInput] = useState("");
  const [isStartingActivity, setIsStartingActivity] = useState(false);
  const [isEndingActivity, setIsEndingActivity] = useState(false);
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [showEndActivityPicker, setShowEndActivityPicker] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [activityBlockEditChoice, setActivityBlockEditChoice] = useState<ActivityBlockEditChoice | null>(null);
  const [editableActivityPair, setEditableActivityPair] = useState<EditableActivityPair | null>(null);
  const [editableScheduleEntry, setEditableScheduleEntry] = useState<EditableScheduleEntry | null>(null);
  const [activityPairLabelInput, setActivityPairLabelInput] = useState("");
  const [activityPairStartTimeInput, setActivityPairStartTimeInput] = useState("");
  const [activityPairEndTimeInput, setActivityPairEndTimeInput] = useState("");
  const [isSavingActivityPairEdit, setIsSavingActivityPairEdit] = useState(false);
  const [entryLabelInput, setEntryLabelInput] = useState("");
  const [entryTimeInput, setEntryTimeInput] = useState("");
  const [isSavingEntryEdit, setIsSavingEntryEdit] = useState(false);

  const isCompactWidth = width < 380;
  const isWideLayout = width >= layout.wideWebWidth;
  const contentHorizontalPadding = getScreenHorizontalPadding(width, Platform.OS === "web");

  const loadActivities = useCallback(async (userId: string) => {
    setIsLoadingActivities(true);
    try {
      setActivityEntries(await listActivityEntriesForRecentDays(userId, ACTIVITY_FETCH_WINDOW_DAYS));
    } catch (error) {
      setErrorMessage(error instanceof FirebaseError ? error.message : "We could not load your activities. Please try again.");
    } finally {
      setIsLoadingActivities(false);
    }
  }, []);

  const loadEvents = useCallback(async (userId: string) => {
    setIsLoadingEvents(true);
    try {
      setEventEntries(await listTodayEventEntries(userId));
    } catch (error) {
      setErrorMessage(error instanceof FirebaseError ? error.message : "We could not load your check-ins. Please try again.");
    } finally {
      setIsLoadingEvents(false);
    }
  }, []);

  const loadActivityLabels = useCallback(async (userId: string) => {
    try {
      const labels = await listActivityLabels(userId);
      setActivityQuickLabels(labels.map((label) => ({ name: label.name, pinned: label.pinned })));
    } catch {
      setActivityQuickLabels([]);
    }
  }, []);

  const loadEventLabels = useCallback(async (userId: string) => {
    try {
      const labels = await listEventLabels(userId);
      setEventQuickLabels(labels.map((label) => ({ name: label.name, pinned: label.pinned })));
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

  useEffect(() => {
    const timerId = setInterval(() => {
      setCurrentTime(new Date());
    }, 60 * 1000);

    return () => clearInterval(timerId);
  }, []);

  const displayedActivityLabels = useMemo(() => {
    if (activityQuickLabels === null) return [];
    if (activityQuickLabels.length === 0) {
      return [...fallbackActivityLabels];
    }

    return sortQuickLabels(activityQuickLabels);
  }, [activityQuickLabels]);

  const displayedEventLabels = useMemo(() => {
    if (eventQuickLabels === null) return [];
    if (eventQuickLabels.length === 0) {
      return [...fallbackEventLabels];
    }

    return sortQuickLabels(eventQuickLabels);
  }, [eventQuickLabels]);

  const openActivitiesToday = useMemo(() => {
    return deriveOpenActivities(activityEntries).filter((e) => isOnLocalDay(e.timestamp.toDate(), currentTime));
  }, [activityEntries, currentTime]);

  const todayTimeline = useMemo(() => deriveTodayTimeline(activityEntries, eventEntries, currentTime), [activityEntries, currentTime, eventEntries]);
  const todayTotals = useMemo(() => deriveDailyActivityTotals(activityEntries, currentTime), [activityEntries, currentTime]);
  const todayEventCounts = useMemo(() => deriveDailyEventCounts(eventEntries, currentTime), [currentTime, eventEntries]);
  const todayCalendarItems = useMemo(
    () => deriveSingleDayCalendarItems(activityEntries, eventEntries, currentTime),
    [activityEntries, currentTime, eventEntries],
  );
  const activityEntryById = useMemo(() => new Map(activityEntries.map((entry) => [entry.id, entry])), [activityEntries]);
  const eventEntryById = useMemo(() => new Map(eventEntries.map((entry) => [entry.id, entry])), [eventEntries]);
  const activityPairByEntryId = useMemo(() => {
    const pairByEntryId = new Map<string, ActivityBlockEditChoice>();

    for (const session of deriveCompletedActivitySessions(activityEntries)) {
      const startEntry = activityEntryById.get(session.startEntryId);
      const endEntry = activityEntryById.get(session.endEntryId);

      if (!startEntry || !endEntry) {
        continue;
      }

      const pairChoice: ActivityBlockEditChoice = {
        label: startEntry.label,
        startEntry,
        endEntry,
      };

      pairByEntryId.set(startEntry.id, pairChoice);
      pairByEntryId.set(endEntry.id, pairChoice);
    }

    return pairByEntryId;
  }, [activityEntries, activityEntryById]);

  const openActivityPairEditor = useCallback((pairChoice: ActivityBlockEditChoice, selectedEntryId: string) => {
    setEditableActivityPair({ pair: pairChoice, selectedEntryId });
    setEditableScheduleEntry(null);
    setActivityPairLabelInput(pairChoice.startEntry.label);
    setActivityPairStartTimeInput(formatEditorTime(pairChoice.startEntry.timestamp.toDate()));
    setActivityPairEndTimeInput(formatEditorTime(pairChoice.endEntry.timestamp.toDate()));
  }, []);

  const openScheduleEntryEditor = useCallback((entry: EditableScheduleEntry) => {
    const timestamp = entry.entry.timestamp.toDate();
    setEditableActivityPair(null);
    setEditableScheduleEntry(entry);
    setEntryLabelInput(entry.entry.label);
    setEntryTimeInput(formatEditorTime(timestamp));
  }, []);

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
      showSuccess(`Started activity: ${cleaned}`);
      await loadActivities(user.uid);
      void loadActivityLabels(user.uid);
    } catch (error) {
      setErrorMessage(error instanceof FirebaseError ? error.message : "We could not start that activity. Please try again.");
    } finally {
      setIsStartingActivity(false);
    }
  }, [loadActivities, loadActivityLabels, user]);

  const handleEndActivity = useCallback(async (entry: ActivityEntry) => {
    if (!user) return;
    setShowEndActivityPicker(false);
    setIsEndingActivity(true);
    setErrorMessage(null);
    try {
      await createActivityEntry({ userId: user.uid, label: entry.label, action: "end" });
      showSuccess(`Ended activity: ${entry.label}`);
      await loadActivities(user.uid);
    } catch (error) {
      setErrorMessage(error instanceof FirebaseError ? error.message : "We could not end that activity. Please try again.");
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
      showSuccess(`Logged check-in: ${cleaned}`);
      await loadEvents(user.uid);
      void loadEventLabels(user.uid);
    } catch (error) {
      setErrorMessage(error instanceof FirebaseError ? error.message : "We could not log that check-in. Please try again.");
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
      setErrorMessage(error instanceof FirebaseError ? error.message : "We could not delete that entry. Please try again.");
    }
  }, [loadActivities, loadEvents, user]);

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

  const handlePressTimelineItem = useCallback((item: TodayTimelineItem) => {
    if (item.kind === "event") {
      openScheduleEntryEditor({ kind: "event", entry: item.entry });
      return;
    }

    const pairChoice = activityPairByEntryId.get(item.entry.id);

    if (!pairChoice) {
      openScheduleEntryEditor({ kind: "activity", entry: item.entry });
      return;
    }

    const isStartOnToday = isOnLocalDay(pairChoice.startEntry.timestamp.toDate(), currentTime);
    const isEndOnToday = isOnLocalDay(pairChoice.endEntry.timestamp.toDate(), currentTime);

    if (!isStartOnToday || !isEndOnToday) {
      openScheduleEntryEditor({ kind: "activity", entry: item.entry });
      return;
    }

    openActivityPairEditor(pairChoice, item.entry.id);
  }, [activityPairByEntryId, currentTime, openActivityPairEditor, openScheduleEntryEditor]);

  const handleSaveEditedActivityPair = useCallback(async () => {
    if (!user || !editableActivityPair) {
      return;
    }

    const label = activityPairLabelInput.trim();

    if (label.length === 0) {
      setErrorMessage("Please enter an activity label before saving.");
      return;
    }

    const parsedStartTime = parseEditorTime(activityPairStartTimeInput);
    const parsedEndTime = parseEditorTime(activityPairEndTimeInput);

    if (!parsedStartTime || !parsedEndTime) {
      setErrorMessage("Enter start and end times as HH:MM in 24-hour format.");
      return;
    }

    const nextStartTimestamp = new Date(editableActivityPair.pair.startEntry.timestamp.toDate());
    nextStartTimestamp.setHours(parsedStartTime.hours, parsedStartTime.minutes, 0, 0);

    const nextEndTimestamp = new Date(editableActivityPair.pair.endEntry.timestamp.toDate());
    nextEndTimestamp.setHours(parsedEndTime.hours, parsedEndTime.minutes, 0, 0);

    if (nextEndTimestamp.getTime() <= nextStartTimestamp.getTime()) {
      setErrorMessage("End time must be later than start time.");
      return;
    }

    setIsSavingActivityPairEdit(true);
    setErrorMessage(null);

    try {
      await Promise.all([
        updateActivityEntry({
          userId: user.uid,
          id: editableActivityPair.pair.startEntry.id,
          label,
          timestamp: Timestamp.fromDate(nextStartTimestamp),
        }),
        updateActivityEntry({
          userId: user.uid,
          id: editableActivityPair.pair.endEntry.id,
          label,
          timestamp: Timestamp.fromDate(nextEndTimestamp),
        }),
      ]);
      await createActivityLabelIfMissing({ userId: user.uid, name: label });
      await loadActivities(user.uid);
      void loadActivityLabels(user.uid);

      showSuccess("Updated activity times.");
      setEditableActivityPair(null);
    } catch (error) {
      setErrorMessage(error instanceof FirebaseError ? error.message : "We could not save this activity. Please try again.");
    } finally {
      setIsSavingActivityPairEdit(false);
    }
  }, [
    activityPairEndTimeInput,
    activityPairLabelInput,
    activityPairStartTimeInput,
    editableActivityPair,
    loadActivities,
    loadActivityLabels,
    user,
  ]);

  const handleDeleteSelectedActivityPairEntry = useCallback(async () => {
    if (!user || !editableActivityPair) {
      return;
    }

    setIsSavingActivityPairEdit(true);
    setErrorMessage(null);

    try {
      await deleteActivityEntry({
        userId: user.uid,
        id: editableActivityPair.selectedEntryId,
      });

      await loadActivities(user.uid);
      showSuccess("Deleted activity entry.");
      setEditableActivityPair(null);
    } catch (error) {
      setErrorMessage(error instanceof FirebaseError ? error.message : "We could not delete this entry. Please try again.");
    } finally {
      setIsSavingActivityPairEdit(false);
    }
  }, [editableActivityPair, loadActivities, user]);

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
        await createActivityLabelIfMissing({ userId: user.uid, name: label });
        await loadActivities(user.uid);
        void loadActivityLabels(user.uid);
      } else {
        await updateEventEntry({
          userId: user.uid,
          id: editableScheduleEntry.entry.id,
          label,
          timestamp: Timestamp.fromDate(nextTimestamp),
        });
        await createEventLabelIfMissing({ userId: user.uid, name: label });
        await loadEvents(user.uid);
        void loadEventLabels(user.uid);
      }

      showSuccess(editableScheduleEntry.kind === "activity" ? "Updated activity entry." : "Updated check-in entry.");
      setEditableScheduleEntry(null);
    } catch (error) {
      setErrorMessage(error instanceof FirebaseError ? error.message : "We could not save this entry. Please try again.");
    } finally {
      setIsSavingEntryEdit(false);
    }
  }, [
    editableScheduleEntry,
    entryLabelInput,
    entryTimeInput,
    loadActivities,
    loadActivityLabels,
    loadEvents,
    loadEventLabels,
    user,
  ]);

  const handleDeleteEditedScheduleEntry = useCallback(async () => {
    if (!user || !editableScheduleEntry) {
      return;
    }

    setIsSavingEntryEdit(true);
    setErrorMessage(null);

    try {
      if (editableScheduleEntry.kind === "event") {
        await deleteEventEntry({ userId: user.uid, id: editableScheduleEntry.entry.id });
        await loadEvents(user.uid);
      } else {
        await deleteActivityEntry({ userId: user.uid, id: editableScheduleEntry.entry.id });
        await loadActivities(user.uid);
      }

      showSuccess(editableScheduleEntry.kind === "activity" ? "Deleted activity entry." : "Deleted check-in entry.");
      setEditableScheduleEntry(null);
    } catch (error) {
      setErrorMessage(error instanceof FirebaseError ? error.message : "We could not delete this entry. Please try again.");
    } finally {
      setIsSavingEntryEdit(false);
    }
  }, [editableScheduleEntry, loadActivities, loadEvents, user]);

  const closeScheduleEntryEditor = () => {
    if (isSavingEntryEdit) {
      return;
    }

    setEditableScheduleEntry(null);
  };

  const closeActivityPairEditor = () => {
    if (isSavingActivityPairEdit) {
      return;
    }

    setEditableActivityPair(null);
  };

  const isMutatingActivity = isStartingActivity || isEndingActivity;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={[s.content, { paddingTop: insets.top + spacing.lg, paddingHorizontal: contentHorizontalPadding }]}> 

      {successMessage ? (
        <View style={s.successBox}><Text style={s.successText}>{successMessage}</Text></View>
      ) : null}

      {errorMessage ? (
        <View style={s.errorBox}><Text style={s.errorText}>{errorMessage}</Text></View>
      ) : null}

      <View style={s.quickStage}>
        <View style={s.quickStageHeader}>
          <SectionLabel>Quick log</SectionLabel>
          <Text style={s.quickStageHint}>Log now. Edit later.</Text>
        </View>

        <View style={[s.quickLanes, isWideLayout && s.quickLanesWide]}>
          {/* Activity quick log */}
          <Card style={[s.quickLaneCard, isWideLayout && s.quickLaneCardWide]}>
            <View style={s.sectionHeader}>
              <SectionLabel>Activities</SectionLabel>
              <View style={s.badge}><Text style={s.badgeText}>{openActivitiesToday.length} open</Text></View>
            </View>
            <TextInput
              style={s.input}
              placeholder="Activity label"
              placeholderTextColor={colors.stone400}
              value={activityLabelInput}
              onChangeText={setActivityLabelInput}
              editable={!isMutatingActivity}
            />
            <View style={[s.buttonRow, isCompactWidth && s.buttonColumn]}>
              <Pressable style={[s.startButton, isMutatingActivity && s.disabled]} onPress={() => void handleStartActivity(activityLabelInput)} disabled={isMutatingActivity}>
                <Text style={s.buttonTextWhite}>{isStartingActivity ? "Starting..." : "Start activity"}</Text>
              </Pressable>
              <Pressable
                style={[s.endButton, (isMutatingActivity || openActivitiesToday.length === 0) && s.disabled]}
                onPress={() => {
                  const label = activityLabelInput.trim();
                  if (label.length > 0) {
                    const match = openActivitiesToday.find((e) => e.normalizedLabel === normalizeLabelName(label));
                    if (match) void handleEndActivity(match);
                    else setErrorMessage(`No open activity matches "${label}". Choose one from the list below.`);
                  } else if (openActivitiesToday.length > 0) {
                    setShowEndActivityPicker(true);
                  }
                }}
                disabled={isMutatingActivity || openActivitiesToday.length === 0}
              >
                <Text style={s.buttonTextWhite}>{isEndingActivity ? "Ending..." : "End activity"}</Text>
              </Pressable>
            </View>
            <Text style={s.helperText}>Leave this blank to choose from open activities.</Text>
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

          {/* Check-in quick log */}
          <Card style={[s.quickLaneCard, isWideLayout && s.quickLaneCardWide]}>
            <SectionLabel>Counters / check-ins</SectionLabel>
            <TextInput
              style={s.input}
              placeholder="Check-in label"
              placeholderTextColor={colors.stone400}
              value={eventLabelInput}
              onChangeText={setEventLabelInput}
              editable={!isSubmittingEvent}
            />
            <Text style={s.helperText}>Use this for quick recurring logs like coffee, water, medication, mood check, or symptom check.</Text>
            <Pressable style={[s.primaryButton, isSubmittingEvent && s.disabled]} onPress={() => void handleLogEvent(eventLabelInput)} disabled={isSubmittingEvent}>
              <Text style={s.buttonTextWhite}>{isSubmittingEvent ? "Logging..." : "Log check-in"}</Text>
            </Pressable>
            {eventQuickLabels === null ? (
              <ActivityIndicator color={colors.amber600} />
            ) : (
              <View>
                <Text style={s.chipLabel}>Quick check-ins</Text>
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
        </View>
      </View>

      <View style={s.secondaryStack}>
        {/* Open activities */}
        <Card>
          <View style={s.sectionHeader}>
            <SectionLabel>Open activities</SectionLabel>
            <Text style={s.countText}>{openActivitiesToday.length} active</Text>
          </View>
          {isLoadingActivities ? (
            <ActivityIndicator color={colors.amber600} />
          ) : openActivitiesToday.length === 0 ? (
            <Text style={s.emptyText}>No open activities. Start one above.</Text>
          ) : (
            openActivitiesToday.map((entry) => (
              <View key={entry.id} style={s.openActivityRow}>
                <View style={s.openActivityInfo}>
                  <Text style={s.openActivityLabel}>{entry.label}</Text>
                  <Text style={s.openActivityTime}>Started {formatClockTime(entry.timestamp.toDate())}</Text>
                </View>
                <Pressable
                  style={s.endSmallButton}
                  onPress={() => void handleEndActivity(entry)}
                  disabled={isEndingActivity}
                  accessibilityRole="button"
                  accessibilityLabel={`End ${entry.label}`}
                  accessibilityHint="Ends this open activity now"
                >
                  <Text style={s.endSmallButtonText}>End</Text>
                </Pressable>
              </View>
            ))
          )}
        </Card>

        <Card>
          <View style={s.summaryGroup}>
            <View style={s.summarySection}>
              <SectionLabel>Activity totals</SectionLabel>
              {isLoadingActivities ? (
                <ActivityIndicator color={colors.amber600} />
              ) : todayTotals.length === 0 ? (
                <Text style={s.emptyText}>No completed activities yet.</Text>
              ) : (
                todayTotals.map((total) => (
                  <View key={total.normalizedLabel} style={s.totalRow}>
                    <Text style={s.totalLabel}>{total.label}</Text>
                    <Text style={s.totalValue}>{formatDuration(total.totalDurationMs)}</Text>
                  </View>
                ))
              )}
            </View>

            <View style={s.summaryDivider} />

            <View style={s.summarySection}>
              <SectionLabel>Check-in counts</SectionLabel>
              {isLoadingEvents ? (
                <ActivityIndicator color={colors.amber600} />
              ) : todayEventCounts.length === 0 ? (
                <Text style={s.emptyText}>No check-ins logged yet.</Text>
              ) : (
                todayEventCounts.map((count) => (
                  <View key={count.normalizedLabel} style={s.totalRow}>
                    <Text style={s.totalLabel}>{count.label}</Text>
                    <Text style={s.totalValue}>{count.count}</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        </Card>
      </View>

      <Card>
        <View style={s.cardSection}>
          <SectionLabel>Day schedule</SectionLabel>
          {(isLoadingActivities || isLoadingEvents) ? (
            <ActivityIndicator color={colors.amber600} />
          ) : (
            <DaySchedule
              activityBlocks={todayCalendarItems.activityBlocks}
              eventMarkers={todayCalendarItems.eventMarkers}
              currentTime={currentTime}
              showCurrentTimeIndicator
              autoScrollToCurrentTimeOnMount
              maxVisibleHeight={isCompactWidth ? 320 : 360}
              onPressActivityBlock={handleScheduleActivityBlockPress}
              onPressEventMarker={handleScheduleEventMarkerPress}
            />
          )}
        </View>
      </Card>

      {/* Timeline */}
      <Card>
        <View style={s.cardSection}>
          <View style={s.timelineHeader}>
            <SectionLabel>Today timeline</SectionLabel>
            <Text style={s.timelineEditHint}>Tap an entry to edit.</Text>
          </View>
          {(isLoadingActivities || isLoadingEvents) ? (
            <ActivityIndicator color={colors.amber600} />
          ) : todayTimeline.length === 0 ? (
            <Text style={s.emptyText}>No entries yet. Start an activity or log a check-in above.</Text>
          ) : (
            todayTimeline.map((item) => {
              const entry = item.entry;
              const badgeColor = item.kind === "activity-start" ? colors.emerald600 : item.kind === "activity-end" ? colors.amber600 : colors.indigo600;
              const badgeLabel = item.kind === "activity-start" ? "Started" : item.kind === "activity-end" ? "Ended" : "Check-in";
              return (
                <View key={`${item.kind}-${entry.id}`} style={s.timelineRow}>
                  <Pressable
                    style={s.timelineRowPressable}
                    onPress={() => handlePressTimelineItem(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${badgeLabel.toLowerCase()} entry for ${entry.label}`}
                    accessibilityHint="Opens a lightweight editor for this timeline entry"
                  >
                    <View style={s.timelineLeft}>
                      <View style={[s.timelineBadge, { backgroundColor: badgeColor }]}> 
                        <Text style={s.timelineBadgeText}>{badgeLabel}</Text>
                      </View>
                      <Text style={s.timelineLabel}>{entry.label}</Text>
                    </View>
                    <Text style={s.timelineTime}>{formatClockTime(entry.timestamp.toDate())}</Text>
                  </Pressable>
                  <View style={s.timelineRight}>
                    <Pressable
                      style={s.deleteIconButton}
                      onPress={() => void handleDeleteTimelineItem(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${badgeLabel.toLowerCase()} entry for ${entry.label}`}
                      accessibilityHint="Removes this entry from your timeline"
                    >
                      <FontAwesome name="trash" size={12} color={colors.white} />
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </Card>

      <View style={{ height: spacing["4xl"] }} />

      <Modal
        visible={activityBlockEditChoice !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActivityBlockEditChoice(null)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Activity block details</Text>
            <Text style={s.modalSubtitle}>Choose the start or end entry to edit for {activityBlockEditChoice?.label}.</Text>

            {activityBlockEditChoice ? (
              <View style={s.modalList}>
                <Pressable
                  style={s.modalListItem}
                  onPress={() => {
                    openScheduleEntryEditor({ kind: "activity", entry: activityBlockEditChoice.startEntry });
                    setActivityBlockEditChoice(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit start entry for ${activityBlockEditChoice.label}`}
                  accessibilityHint="Opens the editor for the activity start entry"
                >
                  <View style={s.modalListTextWrap}>
                    <Text style={s.modalListLabel}>Start entry</Text>
                    <Text style={s.modalListTime}>{formatClockTime(activityBlockEditChoice.startEntry.timestamp.toDate())}</Text>
                  </View>
                  <Text style={s.modalListAction}>Edit</Text>
                </Pressable>

                <Pressable
                  style={s.modalListItem}
                  onPress={() => {
                    openScheduleEntryEditor({ kind: "activity", entry: activityBlockEditChoice.endEntry });
                    setActivityBlockEditChoice(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit end entry for ${activityBlockEditChoice.label}`}
                  accessibilityHint="Opens the editor for the activity end entry"
                >
                  <View style={s.modalListTextWrap}>
                    <Text style={s.modalListLabel}>End entry</Text>
                    <Text style={s.modalListTime}>{formatClockTime(activityBlockEditChoice.endEntry.timestamp.toDate())}</Text>
                  </View>
                  <Text style={s.modalListAction}>Edit</Text>
                </Pressable>
              </View>
            ) : null}

            <Pressable
              style={s.modalCancelButton}
              onPress={() => setActivityBlockEditChoice(null)}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              accessibilityHint="Close this picker"
            >
              <Text style={s.modalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={editableActivityPair !== null}
        transparent
        animationType="fade"
        onRequestClose={closeActivityPairEditor}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Edit activity times</Text>
            <Text style={s.modalSubtitle}>Adjust label, start, and end times. Overlaps are allowed.</Text>

            <View style={s.entryEditorGroup}>
              <Text style={s.entryEditorLabel}>Label</Text>
              <TextInput
                style={s.entryEditorInput}
                value={activityPairLabelInput}
                onChangeText={setActivityPairLabelInput}
                editable={!isSavingActivityPairEdit}
                placeholder="Activity label"
                placeholderTextColor={colors.stone400}
                accessibilityLabel="Activity label"
                accessibilityHint="Edit the label used for this activity pair"
              />
            </View>

            <View style={s.entryEditorGroup}>
              <Text style={s.entryEditorLabel}>Start time (HH:MM)</Text>
              <TextInput
                style={s.entryEditorInput}
                value={activityPairStartTimeInput}
                onChangeText={setActivityPairStartTimeInput}
                editable={!isSavingActivityPairEdit}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="09:00"
                placeholderTextColor={colors.stone400}
                accessibilityLabel="Activity start time"
                accessibilityHint="Enter the activity start time as hours and minutes"
              />
            </View>

            <View style={s.entryEditorGroup}>
              <Text style={s.entryEditorLabel}>End time (HH:MM)</Text>
              <TextInput
                style={s.entryEditorInput}
                value={activityPairEndTimeInput}
                onChangeText={setActivityPairEndTimeInput}
                editable={!isSavingActivityPairEdit}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="10:30"
                placeholderTextColor={colors.stone400}
                accessibilityLabel="Activity end time"
                accessibilityHint="Enter the activity end time as hours and minutes"
              />
            </View>

            <Text style={s.entryEditorNote}>End time must be later than start time.</Text>

            <View style={s.entryEditorActions}>
              <Pressable
                style={[s.entryEditorButton, s.entryEditorDeleteButton, isSavingActivityPairEdit && s.disabled]}
                onPress={() => void handleDeleteSelectedActivityPairEntry()}
                disabled={isSavingActivityPairEdit}
                accessibilityRole="button"
                accessibilityLabel="Delete entry"
                accessibilityHint="Deletes the selected timeline entry"
              >
                <Text style={s.entryEditorDeleteText}>Delete</Text>
              </Pressable>
              <Pressable
                style={[s.entryEditorButton, s.entryEditorSaveButton, isSavingActivityPairEdit && s.disabled]}
                onPress={() => void handleSaveEditedActivityPair()}
                disabled={isSavingActivityPairEdit}
                accessibilityRole="button"
                accessibilityLabel="Save activity changes"
                accessibilityHint="Saves the updated activity label and times"
              >
                <Text style={s.entryEditorSaveText}>{isSavingActivityPairEdit ? "Saving..." : "Save"}</Text>
              </Pressable>
            </View>

            <Pressable
              style={s.modalCancelButton}
              onPress={closeActivityPairEditor}
              disabled={isSavingActivityPairEdit}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              accessibilityHint="Close this editor without saving"
            >
              <Text style={s.modalCancelText}>Cancel</Text>
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
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{editableScheduleEntry?.kind === "activity" ? "Edit activity entry" : "Edit check-in entry"}</Text>
            <Text style={s.modalSubtitle}>Adjust the label or timestamp. Changes apply immediately.</Text>

            <View style={s.entryEditorGroup}>
              <Text style={s.entryEditorLabel}>Label</Text>
              <TextInput
                style={s.entryEditorInput}
                value={entryLabelInput}
                onChangeText={setEntryLabelInput}
                editable={!isSavingEntryEdit}
                placeholder={editableScheduleEntry?.kind === "activity" ? "Activity label" : "Check-in label"}
                placeholderTextColor={colors.stone400}
                accessibilityLabel={editableScheduleEntry?.kind === "activity" ? "Activity entry label" : "Check-in entry label"}
                accessibilityHint="Edit the label for this entry"
              />
            </View>

            <View style={s.entryEditorGroup}>
              <Text style={s.entryEditorLabel}>Time (HH:MM)</Text>
              <TextInput
                style={s.entryEditorInput}
                value={entryTimeInput}
                onChangeText={setEntryTimeInput}
                editable={!isSavingEntryEdit}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="09:30"
                placeholderTextColor={colors.stone400}
                accessibilityLabel="Entry time"
                accessibilityHint="Enter the entry time as hours and minutes"
              />
            </View>

            <View style={s.entryEditorActions}>
              <Pressable
                style={[s.entryEditorButton, s.entryEditorDeleteButton, isSavingEntryEdit && s.disabled]}
                onPress={() => void handleDeleteEditedScheduleEntry()}
                disabled={isSavingEntryEdit}
                accessibilityRole="button"
                accessibilityLabel="Delete entry"
                accessibilityHint="Deletes this entry from your timeline"
              >
                <Text style={s.entryEditorDeleteText}>Delete</Text>
              </Pressable>
              <Pressable
                style={[s.entryEditorButton, s.entryEditorSaveButton, isSavingEntryEdit && s.disabled]}
                onPress={() => void handleSaveEditedScheduleEntry()}
                disabled={isSavingEntryEdit}
                accessibilityRole="button"
                accessibilityLabel="Save entry changes"
                accessibilityHint="Saves your edits to this entry"
              >
                <Text style={s.entryEditorSaveText}>{isSavingEntryEdit ? "Saving..." : "Save"}</Text>
              </Pressable>
            </View>

            <Pressable
              style={s.modalCancelButton}
              onPress={closeScheduleEntryEditor}
              disabled={isSavingEntryEdit}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              accessibilityHint="Close this editor without saving"
            >
              <Text style={s.modalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showEndActivityPicker} transparent animationType="fade" onRequestClose={() => setShowEndActivityPicker(false)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>End an open activity</Text>
            <Text style={s.modalSubtitle}>Choose which activity to end now.</Text>

            <View style={s.modalList}>
              {openActivitiesToday.length === 0 ? (
                <Text style={s.emptyText}>No open activities found.</Text>
              ) : (
                openActivitiesToday.map((entry) => (
                  <Pressable
                    key={`end-picker-${entry.id}`}
                    style={[s.modalListItem, isEndingActivity && s.disabled]}
                    onPress={() => void handleEndActivity(entry)}
                    disabled={isEndingActivity}
                    accessibilityRole="button"
                    accessibilityLabel={`End ${entry.label}`}
                    accessibilityHint="Ends this open activity"
                  >
                    <View style={s.modalListTextWrap}>
                      <Text style={s.modalListLabel}>{entry.label}</Text>
                      <Text style={s.modalListTime}>Started {formatClockTime(entry.timestamp.toDate())}</Text>
                    </View>
                    <Text style={s.modalListAction}>{isEndingActivity ? "Ending..." : "End"}</Text>
                  </Pressable>
                ))
              )}
            </View>

            <Pressable
              style={s.modalCancelButton}
              onPress={() => setShowEndActivityPicker(false)}
              disabled={isEndingActivity}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              accessibilityHint="Close this picker without ending an activity"
            >
              <Text style={s.modalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: {
    width: "100%",
    maxWidth: layout.contentMaxWidth,
    alignSelf: "center",
    paddingBottom: spacing["4xl"],
    gap: spacing["2xl"],
  },
  successBox: { backgroundColor: colors.emerald50, borderWidth: 1, borderColor: colors.emerald600, borderRadius: radius.md, padding: spacing.md },
  successText: { fontSize: fontSize.sm, color: colors.emerald600, fontWeight: "500" },
  errorBox: { backgroundColor: colors.rose50, borderWidth: 1, borderColor: colors.rose200, borderRadius: radius.md, padding: spacing.md },
  errorText: { fontSize: fontSize.sm, color: colors.rose700 },
  quickStage: {
    backgroundColor: colors.backgroundMuted,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderAmber,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  quickLanes: {
    gap: spacing.lg,
  },
  quickLanesWide: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  quickStageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  quickStageHint: {
    fontSize: fontSize.xs,
    color: colors.stone500,
    fontWeight: "500",
  },
  quickLaneCard: {
    backgroundColor: colors.backgroundCard,
    gap: spacing.md,
  },
  quickLaneCardWide: {
    flex: 1,
  },
  secondaryStack: {
    gap: spacing.xl,
  },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: { backgroundColor: colors.backgroundMuted, borderRadius: radius.full, paddingHorizontal: spacing.sm + 2, paddingVertical: 2, borderWidth: 1, borderColor: colors.borderAmber },
  badgeText: { fontSize: fontSize.caption, fontWeight: "600", color: colors.stone600 },
  input: {
    borderWidth: 1,
    borderColor: colors.borderAmber,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: controlSize.lg,
    fontSize: fontSize.base,
    color: colors.stone900,
    backgroundColor: colors.backgroundLight,
  },
  buttonRow: { flexDirection: "row", gap: spacing.sm },
  buttonColumn: { flexDirection: "column" },
  startButton: { flex: 1, backgroundColor: colors.emerald600, borderRadius: radius.md, height: controlSize.lg, alignItems: "center", justifyContent: "center" },
  endButton: { flex: 1, backgroundColor: colors.orange700, borderRadius: radius.md, height: controlSize.lg, alignItems: "center", justifyContent: "center" },
  primaryButton: { backgroundColor: colors.amber900, borderRadius: radius.md, height: controlSize.lg, alignItems: "center", justifyContent: "center" },
  buttonTextWhite: { color: colors.white, fontWeight: "600", fontSize: fontSize.base },
  disabled: { opacity: 0.45 },
  helperText: { fontSize: fontSize.xs, color: colors.stone500 },
  chipLabel: { fontSize: fontSize.xs, fontWeight: "600", color: colors.stone500, marginBottom: spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { backgroundColor: colors.backgroundSoft, borderWidth: 1, borderColor: colors.amber300, borderRadius: radius.full, minHeight: controlSize.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, justifyContent: "center" },
  chipText: { fontSize: fontSize.sm, color: colors.stone700, fontWeight: "600" },
  countText: { fontSize: fontSize.xs, fontWeight: "500", color: colors.stone600 },
  emptyText: { fontSize: fontSize.sm, color: colors.stone500, fontStyle: "italic" },
  openActivityRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.backgroundSoft, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.borderLight },
  openActivityInfo: { flex: 1, gap: 2 },
  openActivityLabel: { fontSize: fontSize.sm, fontWeight: "600", color: colors.stone900 },
  openActivityTime: { fontSize: fontSize.xs, color: colors.stone500 },
  endSmallButton: { backgroundColor: colors.orange700, borderRadius: radius.sm, minHeight: controlSize.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, justifyContent: "center" },
  endSmallButtonText: { color: colors.white, fontSize: fontSize.xs, fontWeight: "600" },
  summaryGroup: { gap: spacing.lg },
  summarySection: { gap: spacing.sm },
  summaryDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.divider },
  cardSection: { gap: spacing.sm },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.xs },
  totalLabel: { fontSize: fontSize.sm, color: colors.stone700 },
  totalValue: { fontSize: fontSize.sm, fontWeight: "600", color: colors.amber800 },
  timelineHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  timelineEditHint: {
    fontSize: fontSize.xs,
    color: colors.stone500,
    fontWeight: "500",
  },
  timelineRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider, gap: spacing.md },
  timelineRowPressable: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  timelineLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1, minWidth: 0 },
  timelineRight: { flexDirection: "row", alignItems: "center" },
  timelineBadge: { borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  timelineBadgeText: { color: colors.white, fontSize: fontSize.caption, fontWeight: "600" },
  timelineLabel: { fontSize: fontSize.sm, color: colors.stone800, flex: 1 },
  timelineTime: { fontSize: fontSize.xs, color: colors.stone500 },
  deleteIconButton: {
    width: controlSize.md,
    height: controlSize.md,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.rose700,
  },
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
  entryEditorNote: {
    fontSize: fontSize.xs,
    color: colors.stone500,
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
});
