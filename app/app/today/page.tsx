"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { FirebaseError } from "firebase/app";
import { Timestamp } from "firebase/firestore";
import { deriveOpenActivities } from "@/lib/firestore/derive-open-activities";
import type { ActivityEntry, EventEntry } from "@/lib/firestore/models";
import { normalizeLabelName } from "@/lib/firestore/normalize-label";
import {
  createActivityEntry,
  createEventEntry,
  deleteEventEntry,
  listActivityEntries,
  listTodayEventEntries,
  updateEventEntry,
} from "@/lib/firestore/repositories";
import { useAuthUser } from "@/lib/firebase/auth";

const quickActivityLabels = ["Work", "Walk dog", "Cooking"] as const;
const quickEventLabels = ["Coffee", "Water", "Energy drink"] as const;

function formatEventTime(entry: EventEntry): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(entry.timestamp.toDate());
}

function formatActivityStartTime(entry: ActivityEntry): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(entry.timestamp.toDate());
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

  useEffect(() => {
    if (!user) {
      setActivityEntries([]);
      setEntries([]);
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
      return;
    }

    void loadActivities(user.uid);
    void loadEvents(user.uid);
  }, [loadActivities, loadEvents, user]);

  const openActivitiesToday = useMemo(() => {
    const today = new Date();

    return deriveOpenActivities(activityEntries).filter((entry) => isOnLocalDay(entry.timestamp.toDate(), today));
  }, [activityEntries]);

  const isMutatingActivity = isStartingActivity || isEndingActivity;

  const groupedCounts = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();

    for (const entry of entries) {
      const existing = counts.get(entry.normalizedLabel);

      if (existing) {
        existing.count += 1;
        continue;
      }

      counts.set(entry.normalizedLabel, {
        label: entry.label,
        count: 1,
      });
    }

    return Array.from(counts.values()).sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }

      return a.label.localeCompare(b.label);
    });
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
    [loadEvents, user]
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
    [loadActivities, user]
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

  return (
    <div className="space-y-4">
      <section className="ui-card ui-section">
        <p className="ui-section-title">Log activity</p>
        <form className="space-y-2" onSubmit={(event) => void handleActivitySubmit(event)}>
          <input
            className="ui-input"
            placeholder="Type an activity label"
            value={activityLabelInput}
            onChange={(event) => {
              setActivityLabelInput(event.target.value);

              if (event.target.value.trim().length > 0) {
                setIsSelectingOpenActivityToEnd(false);
              }
            }}
            disabled={isMutatingActivity}
          />
          <div className="grid grid-cols-2 gap-2">
            <button type="submit" className="ui-button ui-button-success w-full" disabled={isMutatingActivity}>
              {isStartingActivity ? "Starting..." : "Start activity"}
            </button>
            <button
              type="button"
              className="ui-button ui-button-warning w-full"
              onClick={() => void handleEndActivity(activityLabelInput)}
              disabled={isMutatingActivity}
            >
              {isEndingActivity ? "Ending..." : "End activity"}
            </button>
          </div>
        </form>
        {isSelectingOpenActivityToEnd ? (
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Choose an open activity to end</p>
            <div className="space-y-2">
              {openActivitiesToday.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className="ui-button ui-button-ghost h-10 w-full justify-between px-3 text-left"
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
      </section>

      <section className="ui-card ui-section">
        <p className="ui-section-title">Quick activities</p>
        <div className="flex flex-wrap gap-2">
          {quickActivityLabels.map((label) => (
            <button
              key={label}
              type="button"
              className="ui-chip"
              onClick={() => void handleStartActivity(label)}
              disabled={isMutatingActivity}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

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
                <span className="text-slate-500">
                  Started {formatActivityStartTime(entry)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ui-card ui-section">
        <p className="ui-section-title">Log event</p>
        <form className="space-y-2" onSubmit={(event) => void handleSubmit(event)}>
          <input
            className="ui-input"
            placeholder="Type an event label"
            value={eventLabelInput}
            onChange={(event) => setEventLabelInput(event.target.value)}
            disabled={isSubmitting}
          />
          <button type="submit" className="ui-button ui-button-primary w-full" disabled={isSubmitting}>
            {isSubmitting ? "Logging event..." : "Log event"}
          </button>
        </form>
      </section>

      <section className="ui-card ui-section">
        <p className="ui-section-title">Quick events</p>
        <div className="flex flex-wrap gap-2">
          {quickEventLabels.map((label) => (
            <button
              key={label}
              type="button"
              className="ui-chip"
              onClick={() => void handleLogEvent(label)}
              disabled={isSubmitting}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {errorMessage ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>
      ) : null}

      <section className="ui-card ui-section">
        <p className="ui-section-title">Today event counts</p>
        {isLoadingEvents ? (
          <p className="text-sm text-slate-600">Loading today events...</p>
        ) : groupedCounts.length === 0 ? (
          <p className="text-sm text-slate-600">No events logged yet today.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {groupedCounts.map((item) => (
              <li key={item.label} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="font-medium text-slate-800">{item.label}</span>
                <span className="text-slate-600">{item.count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ui-card ui-section">
        <p className="ui-section-title">Today event timeline</p>
        {isLoadingEvents ? (
          <p className="text-sm text-slate-600">Loading today events...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-slate-600">No events in today timeline yet.</p>
        ) : (
          <ol className="space-y-2 text-sm text-slate-700">
            {entries.map((entry) => {
              const isEditing = editingEntryId === entry.id;
              const isMutating = activeMutationEntryId === entry.id;

              return (
                <li key={entry.id} className="space-y-2 rounded-xl bg-slate-50 px-3 py-2">
                  {isEditing ? (
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
                        <button
                          type="submit"
                          className="ui-button ui-button-primary h-9 flex-1 text-xs"
                          disabled={isMutating}
                        >
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
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-slate-800">{entry.label}</span>
                        <span className="text-slate-500">{formatEventTime(entry)}</span>
                      </div>
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
                    </>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}

