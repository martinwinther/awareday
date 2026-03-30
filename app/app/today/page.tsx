"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { FirebaseError } from "firebase/app";
import { Timestamp } from "firebase/firestore";
import { ActivityTotalsList } from "../_components/activity-totals-list";
import { EventCountsList } from "../_components/event-counts-list";
import { formatClockTime } from "../_components/summary-helpers";
import { SummarySection } from "../_components/summary-section";
import { TimelineSection } from "../_components/timeline-section";
import { deriveDailyActivityTotals } from "@/lib/firestore/derive-activity-totals";
import { deriveDailyEventCounts } from "@/lib/firestore/derive-daily-event-counts";
import { deriveOpenActivities } from "@/lib/firestore/derive-open-activities";
import { deriveTodayTimeline, type TodayTimelineItem } from "@/lib/firestore/derive-today-timeline";
import type { ActivityAction, ActivityEntry, EventEntry } from "@/lib/firestore/models";
import { normalizeLabelName } from "@/lib/firestore/normalize-label";
import {
  createActivityLabelIfMissing,
  createActivityEntry,
  createEventLabelIfMissing,
  createEventEntry,
  deleteActivityEntry,
  deleteEventEntry,
  listActivityEntries,
  listActivityLabels,
  listEventLabels,
  listTodayEventEntries,
  updateActivityEntry,
  updateEventEntry,
} from "@/lib/firestore/repositories";
import { useAuthUser } from "@/lib/firebase/auth";

const fallbackQuickActivityLabels = ["Work", "Walk dog", "Cooking"] as const;
const fallbackQuickEventLabels = ["Coffee", "Water", "Energy drink"] as const;

function formatActivityStartTime(entry: ActivityEntry): string {
  return formatClockTime(entry.timestamp.toDate());
}

function toDateTimeLocalInputValue(timestamp: Timestamp): string {
  const date = timestamp.toDate();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseDateTimeLocalInputValue(value: string): Timestamp | null {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return Timestamp.fromDate(parsedDate);
}

function isOnLocalDay(date: Date, day: Date): boolean {
  return (
    date.getFullYear() === day.getFullYear() &&
    date.getMonth() === day.getMonth() &&
    date.getDate() === day.getDate()
  );
}

export default function TodayPage() {
  const { user } = useAuthUser();
  const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>([]);
  const [entries, setEntries] = useState<EventEntry[]>([]);
  const [activityQuickLabels, setActivityQuickLabels] = useState<string[] | null>(null);
  const [eventQuickLabels, setEventQuickLabels] = useState<string[] | null>(null);
  const [activityLabelInput, setActivityLabelInput] = useState("");
  const [eventLabelInput, setEventLabelInput] = useState("");
  const [isStartingActivity, setIsStartingActivity] = useState(false);
  const [isEndingActivity, setIsEndingActivity] = useState(false);
  const [isSelectingOpenActivityToEnd, setIsSelectingOpenActivityToEnd] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [activeMutationEntryId, setActiveMutationEntryId] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingLabelInput, setEditingLabelInput] = useState("");
  const [editingTimestampInput, setEditingTimestampInput] = useState("");
  const [editingActivityEntryId, setEditingActivityEntryId] = useState<string | null>(null);
  const [editingActivityLabelInput, setEditingActivityLabelInput] = useState("");
  const [editingActivityTimestampInput, setEditingActivityTimestampInput] = useState("");
  const [editingActivityActionInput, setEditingActivityActionInput] = useState<ActivityAction>("start");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadEvents = useCallback(async (userId: string) => {
    setIsLoadingEvents(true);

    try {
      const todayEntries = await listTodayEventEntries(userId);
      setEntries(todayEntries);
    } catch (error) {
      if (error instanceof FirebaseError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Could not load today events. Please try again.");
      }
    } finally {
      setIsLoadingEvents(false);
    }
  }, []);

  const loadActivities = useCallback(async (userId: string) => {
    setIsLoadingActivities(true);

    try {
      const loadedActivityEntries = await listActivityEntries(userId);
      setActivityEntries(loadedActivityEntries);
    } catch (error) {
      if (error instanceof FirebaseError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Could not load activities. Please try again.");
      }
    } finally {
      setIsLoadingActivities(false);
    }
  }, []);

  const loadActivityLabels = useCallback(async (userId: string) => {
    try {
      const labels = await listActivityLabels(userId);
      setActivityQuickLabels(labels.map((label) => label.name));
    } catch (error) {
      if (error instanceof FirebaseError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Could not load activity labels. Please try again.");
      }

      setActivityQuickLabels([]);
    }
  }, []);

  const loadEventLabels = useCallback(async (userId: string) => {
    try {
      const labels = await listEventLabels(userId);
      setEventQuickLabels(labels.map((label) => label.name));
    } catch (error) {
      if (error instanceof FirebaseError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Could not load event labels. Please try again.");
      }

      setEventQuickLabels([]);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setActivityEntries([]);
      setEntries([]);
      setActivityQuickLabels(null);
      setEventQuickLabels(null);
      setActivityLabelInput("");
      setIsStartingActivity(false);
      setIsEndingActivity(false);
      setIsSelectingOpenActivityToEnd(false);
      setIsLoadingActivities(false);
      setIsLoadingEvents(false);
      setActiveMutationEntryId(null);
      setEditingEntryId(null);
      setEditingLabelInput("");
      setEditingTimestampInput("");
      setEditingActivityEntryId(null);
      setEditingActivityLabelInput("");
      setEditingActivityTimestampInput("");
      setEditingActivityActionInput("start");
      return;
    }

    void loadActivities(user.uid);
    void loadEvents(user.uid);
    void loadActivityLabels(user.uid);
    void loadEventLabels(user.uid);
  }, [loadActivities, loadActivityLabels, loadEventLabels, loadEvents, user]);

  const displayedActivityQuickLabels = useMemo(() => {
    if (activityQuickLabels === null) {
      return [];
    }

    if (activityQuickLabels.length === 0) {
      return [...fallbackQuickActivityLabels];
    }

    return activityQuickLabels;
  }, [activityQuickLabels]);

  const displayedEventQuickLabels = useMemo(() => {
    if (eventQuickLabels === null) {
      return [];
    }

    if (eventQuickLabels.length === 0) {
      return [...fallbackQuickEventLabels];
    }

    return eventQuickLabels;
  }, [eventQuickLabels]);

  const saveActivityLabelIfMissing = useCallback(
    async (label: string) => {
      if (!user) {
        return;
      }

      const savedLabel = await createActivityLabelIfMissing({
        userId: user.uid,
        name: label,
      });
      const normalizedLabel = savedLabel.normalizedName;

      setActivityQuickLabels((previous) => {
        const existing = previous ?? [];

        if (existing.some((quickLabel) => normalizeLabelName(quickLabel) === normalizedLabel)) {
          return existing;
        }

        return [...existing, savedLabel.name].sort((left, right) => left.localeCompare(right));
      });
    },
    [user]
  );

  const saveEventLabelIfMissing = useCallback(
    async (label: string) => {
      if (!user) {
        return;
      }

      const savedLabel = await createEventLabelIfMissing({
        userId: user.uid,
        name: label,
      });
      const normalizedLabel = savedLabel.normalizedName;

      setEventQuickLabels((previous) => {
        const existing = previous ?? [];

        if (existing.some((quickLabel) => normalizeLabelName(quickLabel) === normalizedLabel)) {
          return existing;
        }

        return [...existing, savedLabel.name].sort((left, right) => left.localeCompare(right));
      });
    },
    [user]
  );

  const openActivitiesToday = useMemo(() => {
    const today = new Date();

    return deriveOpenActivities(activityEntries).filter((entry) => isOnLocalDay(entry.timestamp.toDate(), today));
  }, [activityEntries]);

  const isMutatingActivity = isStartingActivity || isEndingActivity;

  const todayTimeline = useMemo(() => {
    return deriveTodayTimeline(activityEntries, entries, new Date());
  }, [activityEntries, entries]);

  const todayActivityTotals = useMemo(() => {
    return deriveDailyActivityTotals(activityEntries, new Date());
  }, [activityEntries]);

  const groupedCounts = useMemo(() => {
    return deriveDailyEventCounts(entries, new Date());
  }, [entries]);

  const handleLogEvent = useCallback(
    async (label: string) => {
      const cleaned = label.trim();

      if (!user) {
        return;
      }

      if (cleaned.length === 0) {
        setErrorMessage("Enter an event label first.");
        return;
      }

      setIsSubmitting(true);
      setErrorMessage(null);

      try {
        await createEventEntry({
          userId: user.uid,
          label: cleaned,
        });

        try {
          await saveEventLabelIfMissing(cleaned);
        } catch {
          setErrorMessage("Event logged, but could not save the label as a quick chip.");
        }

        setEventLabelInput("");
        await loadEvents(user.uid);
      } catch (error) {
        if (error instanceof FirebaseError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("Could not save the event. Please try again.");
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [loadEvents, saveEventLabelIfMissing, user]
  );

  const handleStartActivity = useCallback(
    async (label: string) => {
      const cleaned = label.trim();

      if (!user) {
        return;
      }

      if (cleaned.length === 0) {
        setErrorMessage("Enter an activity label first.");
        return;
      }

      setIsStartingActivity(true);
      setIsSelectingOpenActivityToEnd(false);
      setErrorMessage(null);

      try {
        await createActivityEntry({
          userId: user.uid,
          label: cleaned,
          action: "start",
        });

        try {
          await saveActivityLabelIfMissing(cleaned);
        } catch {
          setErrorMessage("Activity started, but could not save the label as a quick chip.");
        }

        setActivityLabelInput("");
        await loadActivities(user.uid);
      } catch (error) {
        if (error instanceof FirebaseError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("Could not start the activity. Please try again.");
        }
      } finally {
        setIsStartingActivity(false);
      }
    },
    [loadActivities, saveActivityLabelIfMissing, user]
  );

  const endOpenActivity = useCallback(
    async (entry: ActivityEntry) => {
      if (!user) {
        return;
      }

      setIsEndingActivity(true);
      setErrorMessage(null);

      try {
        await createActivityEntry({
          userId: user.uid,
          label: entry.label,
          action: "end",
        });

        setActivityLabelInput("");
        setIsSelectingOpenActivityToEnd(false);
        await loadActivities(user.uid);
      } catch (error) {
        if (error instanceof FirebaseError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("Could not end the activity. Please try again.");
        }
      } finally {
        setIsEndingActivity(false);
      }
    },
    [loadActivities, user]
  );

  const handleEndActivity = useCallback(
    async (label: string) => {
      if (!user) {
        return;
      }

      const cleaned = label.trim();

      if (cleaned.length === 0) {
        if (openActivitiesToday.length === 0) {
          setErrorMessage("No open activities are available to end.");
          return;
        }

        setErrorMessage(null);
        setIsSelectingOpenActivityToEnd(true);
        return;
      }

      const normalizedLabel = normalizeLabelName(cleaned);
      const matchingOpenActivity = openActivitiesToday.find(
        (entry) => entry.normalizedLabel === normalizedLabel
      );

      if (!matchingOpenActivity) {
        setErrorMessage(`No open activity found for "${cleaned}".`);
        setIsSelectingOpenActivityToEnd(false);
        return;
      }

      await endOpenActivity(matchingOpenActivity);
    },
    [endOpenActivity, openActivitiesToday, user]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await handleLogEvent(eventLabelInput);
  };

  const handleActivitySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await handleStartActivity(activityLabelInput);
  };

  const startEditingActivityEntry = (entry: ActivityEntry) => {
    setErrorMessage(null);
    setEditingActivityEntryId(entry.id);
    setEditingActivityLabelInput(entry.label);
    setEditingActivityTimestampInput(toDateTimeLocalInputValue(entry.timestamp));
    setEditingActivityActionInput(entry.action);
  };

  const stopEditingActivityEntry = () => {
    setEditingActivityEntryId(null);
    setEditingActivityLabelInput("");
    setEditingActivityTimestampInput("");
    setEditingActivityActionInput("start");
  };

  const handleSaveActivityEntryChanges = async (entryId: string) => {
    if (!user) {
      return;
    }

    const cleanedLabel = editingActivityLabelInput.trim();

    if (cleanedLabel.length === 0) {
      setErrorMessage("Activity label cannot be empty.");
      return;
    }

    const timestamp = parseDateTimeLocalInputValue(editingActivityTimestampInput);

    if (!timestamp) {
      setErrorMessage("Enter a valid activity timestamp.");
      return;
    }

    setActiveMutationEntryId(entryId);
    setErrorMessage(null);

    try {
      await updateActivityEntry({
        userId: user.uid,
        id: entryId,
        label: cleanedLabel,
        action: editingActivityActionInput,
        timestamp,
      });

      stopEditingActivityEntry();
      await loadActivities(user.uid);
    } catch (error) {
      if (error instanceof FirebaseError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Could not update the activity entry. Please try again.");
      }
    } finally {
      setActiveMutationEntryId(null);
    }
  };

  const handleDeleteActivityEntry = async (entryId: string) => {
    if (!user) {
      return;
    }

    const confirmed = window.confirm("Delete this activity entry?");

    if (!confirmed) {
      return;
    }

    setActiveMutationEntryId(entryId);
    setErrorMessage(null);

    try {
      await deleteActivityEntry({
        userId: user.uid,
        id: entryId,
      });

      if (editingActivityEntryId === entryId) {
        stopEditingActivityEntry();
      }

      await loadActivities(user.uid);
    } catch (error) {
      if (error instanceof FirebaseError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Could not delete the activity entry. Please try again.");
      }
    } finally {
      setActiveMutationEntryId(null);
    }
  };

  const startEditingEntry = (entry: EventEntry) => {
    setErrorMessage(null);
    setEditingEntryId(entry.id);
    setEditingLabelInput(entry.label);
    setEditingTimestampInput(toDateTimeLocalInputValue(entry.timestamp));
  };

  const stopEditingEntry = () => {
    setEditingEntryId(null);
    setEditingLabelInput("");
    setEditingTimestampInput("");
  };

  const handleSaveEntryChanges = async (entryId: string) => {
    if (!user) {
      return;
    }

    const cleanedLabel = editingLabelInput.trim();

    if (cleanedLabel.length === 0) {
      setErrorMessage("Event label cannot be empty.");
      return;
    }

    const timestamp = parseDateTimeLocalInputValue(editingTimestampInput);

    if (!timestamp) {
      setErrorMessage("Enter a valid event timestamp.");
      return;
    }

    setActiveMutationEntryId(entryId);
    setErrorMessage(null);

    try {
      await updateEventEntry({
        userId: user.uid,
        id: entryId,
        label: cleanedLabel,
        timestamp,
      });

      stopEditingEntry();
      await loadEvents(user.uid);
    } catch (error) {
      if (error instanceof FirebaseError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Could not update the event. Please try again.");
      }
    } finally {
      setActiveMutationEntryId(null);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!user) {
      return;
    }

    const confirmed = window.confirm("Delete this event entry?");

    if (!confirmed) {
      return;
    }

    setActiveMutationEntryId(entryId);
    setErrorMessage(null);

    try {
      await deleteEventEntry({
        userId: user.uid,
        id: entryId,
      });

      if (editingEntryId === entryId) {
        stopEditingEntry();
      }

      await loadEvents(user.uid);
    } catch (error) {
      if (error instanceof FirebaseError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Could not delete the event. Please try again.");
      }
    } finally {
      setActiveMutationEntryId(null);
    }
  };

  function renderTimelineEditor(item: TodayTimelineItem) {
      if (item.kind === "event") {
        const entry = item.entry;
        const isEditing = editingEntryId === entry.id;
        const isMutating = activeMutationEntryId === entry.id;

        if (!isEditing) {
          return null;
        }

        return (
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSaveEntryChanges(entry.id);
            }}
          >
            <input
              className="ui-input"
              value={editingLabelInput}
              onChange={(event) => setEditingLabelInput(event.target.value)}
              placeholder="Event label"
              disabled={isMutating}
            />
            <input
              className="ui-input"
              type="datetime-local"
              value={editingTimestampInput}
              onChange={(event) => setEditingTimestampInput(event.target.value)}
              disabled={isMutating}
            />
            <div className="flex gap-2">
              <button type="submit" className="ui-button ui-button-primary h-9 flex-1 text-xs" disabled={isMutating}>
                {isMutating ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                className="ui-button ui-button-ghost h-9 px-3 text-xs"
                onClick={stopEditingEntry}
                disabled={isMutating}
              >
                Cancel
              </button>
            </div>
          </form>
        );
      }

      const entry = item.entry;
      const isEditing = editingActivityEntryId === entry.id;
      const isMutating = activeMutationEntryId === entry.id;

      if (!isEditing) {
        return null;
      }

    return (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSaveActivityEntryChanges(entry.id);
          }}
        >
          <input
            className="ui-input"
            value={editingActivityLabelInput}
            onChange={(event) => setEditingActivityLabelInput(event.target.value)}
            placeholder="Activity label"
            disabled={isMutating}
          />
          <input
            className="ui-input"
            type="datetime-local"
            value={editingActivityTimestampInput}
            onChange={(event) => setEditingActivityTimestampInput(event.target.value)}
            disabled={isMutating}
          />
          <select
            className="ui-input"
            value={editingActivityActionInput}
            onChange={(event) => setEditingActivityActionInput(event.target.value as ActivityAction)}
            disabled={isMutating}
          >
            <option value="start">Start</option>
            <option value="end">End</option>
          </select>
          <div className="flex gap-2">
            <button type="submit" className="ui-button ui-button-primary h-9 flex-1 text-xs" disabled={isMutating}>
              {isMutating ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              className="ui-button ui-button-ghost h-9 px-3 text-xs"
              onClick={stopEditingActivityEntry}
              disabled={isMutating}
            >
              Cancel
            </button>
          </div>
        </form>
    );
  }

  function renderTimelineActions(item: TodayTimelineItem) {
      if (item.kind === "event") {
        const entry = item.entry;
        const isMutating = activeMutationEntryId === entry.id;

        return (
          <div className="flex gap-2">
            <button
              type="button"
              className="ui-button ui-button-ghost h-8 px-3 text-xs"
              onClick={() => startEditingEntry(entry)}
              disabled={activeMutationEntryId !== null}
            >
              Edit
            </button>
            <button
              type="button"
              className="ui-button ui-button-warning h-8 px-3 text-xs"
              onClick={() => void handleDeleteEntry(entry.id)}
              disabled={activeMutationEntryId !== null}
            >
              {isMutating ? "Deleting..." : "Delete"}
            </button>
          </div>
        );
      }

      const entry = item.entry;
      const isMutating = activeMutationEntryId === entry.id;

    return (
        <div className="flex gap-2">
          <button
            type="button"
            className="ui-button ui-button-ghost h-8 px-3 text-xs"
            onClick={() => startEditingActivityEntry(entry)}
            disabled={activeMutationEntryId !== null}
          >
            Edit
          </button>
          <button
            type="button"
            className="ui-button ui-button-warning h-8 px-3 text-xs"
            onClick={() => void handleDeleteActivityEntry(entry.id)}
            disabled={activeMutationEntryId !== null}
          >
            {isMutating ? "Deleting..." : "Delete"}
          </button>
        </div>
      );
  }

  return (
    <div className="space-y-4">
      <SummarySection title="Quick log">
        <div className="space-y-4">
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Activity</p>
              <p className="text-xs text-slate-500">
                {openActivitiesToday.length} open {openActivitiesToday.length === 1 ? "activity" : "activities"}
              </p>
            </div>
            <form className="space-y-2" onSubmit={(event) => void handleActivitySubmit(event)}>
              <input
                className="ui-input h-12 rounded-2xl px-4 text-base"
                placeholder="Type an activity label"
                value={activityLabelInput}
                onChange={(event) => {
                  setActivityLabelInput(event.target.value);

                  if (event.target.value.trim().length > 0) {
                    setIsSelectingOpenActivityToEnd(false);
                  }
                }}
                disabled={isMutatingActivity}
                autoComplete="off"
                enterKeyHint="go"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="submit"
                  className="ui-button ui-button-success h-12 w-full touch-manipulation rounded-2xl text-[15px] active:scale-[0.99]"
                  disabled={isMutatingActivity}
                >
                  {isStartingActivity ? "Starting..." : "Start activity"}
                </button>
                <button
                  type="button"
                  className="ui-button ui-button-warning h-12 w-full touch-manipulation rounded-2xl text-[15px] active:scale-[0.99]"
                  onClick={() => void handleEndActivity(activityLabelInput)}
                  disabled={isMutatingActivity}
                >
                  {isEndingActivity ? "Ending..." : "End activity"}
                </button>
              </div>
            </form>

            {activityQuickLabels === null ? (
              <p className="text-sm text-slate-600">Loading quick activities...</p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Quick start</p>
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {displayedActivityQuickLabels.map((label) => (
                  <button
                    key={label}
                    type="button"
                    className="ui-chip h-11 shrink-0 px-4 touch-manipulation active:scale-[0.99]"
                    onClick={() => void handleStartActivity(label)}
                    disabled={isMutatingActivity}
                  >
                    {label}
                  </button>
                ))}
                </div>
              </div>
            )}

            {isSelectingOpenActivityToEnd ? (
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Choose an open activity to end</p>
                  <button
                    type="button"
                    className="ui-button ui-button-ghost h-8 px-3 text-xs"
                    onClick={() => setIsSelectingOpenActivityToEnd(false)}
                    disabled={isEndingActivity}
                  >
                    Cancel
                  </button>
                </div>
                <div className="space-y-2">
                  {openActivitiesToday.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      className="ui-button ui-button-ghost h-12 w-full justify-between rounded-2xl px-3 text-left touch-manipulation active:scale-[0.99]"
                      onClick={() => void endOpenActivity(entry)}
                      disabled={isEndingActivity}
                    >
                      <span className="truncate">{entry.label}</span>
                      <span className="text-xs text-slate-500">Started {formatActivityStartTime(entry)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Event</p>
            <form className="space-y-2" onSubmit={(event) => void handleSubmit(event)}>
              <input
                className="ui-input h-12 rounded-2xl px-4 text-base"
                placeholder="Type an event label"
                value={eventLabelInput}
                onChange={(event) => setEventLabelInput(event.target.value)}
                disabled={isSubmitting}
                autoComplete="off"
                enterKeyHint="go"
              />
              <button
                type="submit"
                className="ui-button ui-button-primary h-12 w-full touch-manipulation rounded-2xl text-[15px] active:scale-[0.99]"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Logging event..." : "Log event"}
              </button>
            </form>

            {eventQuickLabels === null ? (
              <p className="text-sm text-slate-600">Loading quick events...</p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Quick event</p>
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                  {displayedEventQuickLabels.map((label) => (
                    <button
                      key={label}
                      type="button"
                      className="ui-chip h-11 shrink-0 px-4 touch-manipulation active:scale-[0.99]"
                      onClick={() => void handleLogEvent(label)}
                      disabled={isSubmitting}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </SummarySection>

      {errorMessage ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>
      ) : null}

      <section className="ui-card ui-section">
        <p className="ui-section-title">Open activities</p>
        {isLoadingActivities ? (
          <p className="text-sm text-slate-600">Loading open activities...</p>
        ) : openActivitiesToday.length === 0 ? (
          <p className="text-sm text-slate-600">No open activities started today.</p>
        ) : (
          <ul className="space-y-2 text-sm text-slate-700">
            {openActivitiesToday.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="font-medium text-slate-800">{entry.label}</span>
                <span className="text-slate-500">Started {formatActivityStartTime(entry)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <SummarySection title="Today activity totals">
        <ActivityTotalsList
          totals={todayActivityTotals}
          isLoading={isLoadingActivities}
          loadingText="Loading today activity totals..."
          emptyText="No completed activities yet today."
        />
      </SummarySection>


      <SummarySection title="Today event counts">
        <EventCountsList
          counts={groupedCounts}
          isLoading={isLoadingEvents}
          loadingText="Loading today events..."
          emptyText="No events logged yet today."
        />
      </SummarySection>

      <TimelineSection
        title="Today timeline"
        items={todayTimeline}
        isLoading={isLoadingActivities || isLoadingEvents}
        loadingText="Loading today timeline..."
        emptyText="No entries in today timeline yet."
        renderItemEditor={renderTimelineEditor}
        renderItemActions={renderTimelineActions}
      />
    </div>
  );
}

