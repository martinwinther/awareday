"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { FirebaseError } from "firebase/app";
import type { ActivityLabel, EventLabel } from "@/lib/firestore/models";
import { normalizeLabelName } from "@/lib/firestore/normalize-label";
import {
  createActivityLabelIfMissing,
  createEventLabelIfMissing,
  deleteActivityLabel,
  deleteEventLabel,
  listActivityLabels,
  listEventLabels,
  updateActivityLabel,
  updateEventLabel,
} from "@/lib/firestore/repositories";
import { StateNotice } from "../_components/state-notice";
import { useAuthUser } from "@/lib/firebase/auth";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof FirebaseError) {
    return error.message;
  }

  return fallback;
}

export default function SettingsPage() {
  const { user } = useAuthUser();
  const [activityLabels, setActivityLabels] = useState<ActivityLabel[]>([]);
  const [eventLabels, setEventLabels] = useState<EventLabel[]>([]);
  const [isLoadingActivityLabels, setIsLoadingActivityLabels] = useState(true);
  const [isLoadingEventLabels, setIsLoadingEventLabels] = useState(true);
  const [activeMutationKey, setActiveMutationKey] = useState<string | null>(null);
  const [activityLabelInput, setActivityLabelInput] = useState("");
  const [eventLabelInput, setEventLabelInput] = useState("");
  const [editingActivityLabelId, setEditingActivityLabelId] = useState<string | null>(null);
  const [editingEventLabelId, setEditingEventLabelId] = useState<string | null>(null);
  const [editingActivityLabelInput, setEditingActivityLabelInput] = useState("");
  const [editingEventLabelInput, setEditingEventLabelInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadActivityLabels = useCallback(async (userId: string) => {
    setIsLoadingActivityLabels(true);

    try {
      const labels = await listActivityLabels(userId);
      setActivityLabels(labels);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not load activity labels. Please try again."));
      setActivityLabels([]);
    } finally {
      setIsLoadingActivityLabels(false);
    }
  }, []);

  const loadEventLabels = useCallback(async (userId: string) => {
    setIsLoadingEventLabels(true);

    try {
      const labels = await listEventLabels(userId);
      setEventLabels(labels);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not load event labels. Please try again."));
      setEventLabels([]);
    } finally {
      setIsLoadingEventLabels(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setActivityLabels([]);
      setEventLabels([]);
      setIsLoadingActivityLabels(false);
      setIsLoadingEventLabels(false);
      setActivityLabelInput("");
      setEventLabelInput("");
      setEditingActivityLabelId(null);
      setEditingEventLabelId(null);
      setEditingActivityLabelInput("");
      setEditingEventLabelInput("");
      setActiveMutationKey(null);
      setErrorMessage(null);
      return;
    }

    setErrorMessage(null);
    void loadActivityLabels(user.uid);
    void loadEventLabels(user.uid);
  }, [loadActivityLabels, loadEventLabels, user]);

  const isMutating = activeMutationKey !== null;

  const startEditingActivityLabel = (label: ActivityLabel) => {
    setEditingActivityLabelId(label.id);
    setEditingActivityLabelInput(label.name);
  };

  const stopEditingActivityLabel = () => {
    setEditingActivityLabelId(null);
    setEditingActivityLabelInput("");
  };

  const startEditingEventLabel = (label: EventLabel) => {
    setEditingEventLabelId(label.id);
    setEditingEventLabelInput(label.name);
  };

  const stopEditingEventLabel = () => {
    setEditingEventLabelId(null);
    setEditingEventLabelInput("");
  };

  const handleAddActivityLabel = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      return;
    }

    const cleaned = activityLabelInput.trim();

    if (cleaned.length === 0) {
      setErrorMessage("Enter an activity label first.");
      return;
    }

    setActiveMutationKey("activity:add");
    setErrorMessage(null);

    try {
      await createActivityLabelIfMissing({
        userId: user.uid,
        name: cleaned,
      });

      setActivityLabelInput("");
      await loadActivityLabels(user.uid);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not save the activity label. Please try again."));
    } finally {
      setActiveMutationKey(null);
    }
  };

  const handleSaveActivityLabel = async (labelId: string) => {
    if (!user) {
      return;
    }

    const cleaned = editingActivityLabelInput.trim();

    if (cleaned.length === 0) {
      setErrorMessage("Activity labels cannot be empty.");
      return;
    }

    const normalizedName = normalizeLabelName(cleaned);
    const isDuplicate = activityLabels.some(
      (label) => label.id !== labelId && label.normalizedName === normalizedName,
    );

    if (isDuplicate) {
      setErrorMessage("That activity label already exists.");
      return;
    }

    setActiveMutationKey(`activity:save:${labelId}`);
    setErrorMessage(null);

    try {
      await updateActivityLabel({
        userId: user.uid,
        id: labelId,
        name: cleaned,
      });

      stopEditingActivityLabel();
      await loadActivityLabels(user.uid);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not update the activity label. Please try again."));
    } finally {
      setActiveMutationKey(null);
    }
  };

  const handleDeleteActivityLabel = async (label: ActivityLabel) => {
    if (!user) {
      return;
    }

    const confirmed = window.confirm(`Delete activity label \"${label.name}\"?`);

    if (!confirmed) {
      return;
    }

    setActiveMutationKey(`activity:delete:${label.id}`);
    setErrorMessage(null);

    try {
      await deleteActivityLabel({
        userId: user.uid,
        id: label.id,
      });

      if (editingActivityLabelId === label.id) {
        stopEditingActivityLabel();
      }

      await loadActivityLabels(user.uid);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not delete the activity label. Please try again."));
    } finally {
      setActiveMutationKey(null);
    }
  };

  const handleAddEventLabel = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      return;
    }

    const cleaned = eventLabelInput.trim();

    if (cleaned.length === 0) {
      setErrorMessage("Enter an event label first.");
      return;
    }

    setActiveMutationKey("event:add");
    setErrorMessage(null);

    try {
      await createEventLabelIfMissing({
        userId: user.uid,
        name: cleaned,
      });

      setEventLabelInput("");
      await loadEventLabels(user.uid);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not save the event label. Please try again."));
    } finally {
      setActiveMutationKey(null);
    }
  };

  const handleSaveEventLabel = async (labelId: string) => {
    if (!user) {
      return;
    }

    const cleaned = editingEventLabelInput.trim();

    if (cleaned.length === 0) {
      setErrorMessage("Event labels cannot be empty.");
      return;
    }

    const normalizedName = normalizeLabelName(cleaned);
    const isDuplicate = eventLabels.some((label) => label.id !== labelId && label.normalizedName === normalizedName);

    if (isDuplicate) {
      setErrorMessage("That event label already exists.");
      return;
    }

    setActiveMutationKey(`event:save:${labelId}`);
    setErrorMessage(null);

    try {
      await updateEventLabel({
        userId: user.uid,
        id: labelId,
        name: cleaned,
      });

      stopEditingEventLabel();
      await loadEventLabels(user.uid);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not update the event label. Please try again."));
    } finally {
      setActiveMutationKey(null);
    }
  };

  const handleDeleteEventLabel = async (label: EventLabel) => {
    if (!user) {
      return;
    }

    const confirmed = window.confirm(`Delete event label \"${label.name}\"?`);

    if (!confirmed) {
      return;
    }

    setActiveMutationKey(`event:delete:${label.id}`);
    setErrorMessage(null);

    try {
      await deleteEventLabel({
        userId: user.uid,
        id: label.id,
      });

      if (editingEventLabelId === label.id) {
        stopEditingEventLabel();
      }

      await loadEventLabels(user.uid);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not delete the event label. Please try again."));
    } finally {
      setActiveMutationKey(null);
    }
  };

  return (
    <div className="space-y-4">
      <section className="ui-card ui-section">
        <p className="ui-section-title">Settings</p>
        <h2 className="text-base font-semibold text-slate-900">Saved labels</h2>
        <p className="text-sm text-slate-600">Manage quick labels used on Today for activities and events.</p>
      </section>

      <section className="ui-card ui-section">
        <p className="ui-section-title">Activity labels</p>
        <form className="flex gap-2" onSubmit={(event) => void handleAddActivityLabel(event)}>
          <input
            className="ui-input"
            value={activityLabelInput}
            onChange={(event) => setActivityLabelInput(event.target.value)}
            placeholder="Add activity label"
            disabled={isMutating}
          />
          <button type="submit" className="ui-button ui-button-primary h-11 px-4" disabled={isMutating}>
            {activeMutationKey === "activity:add" ? "Adding..." : "Add"}
          </button>
        </form>

        {isLoadingActivityLabels ? (
          <StateNotice variant="loading" title="Loading activity labels..." />
        ) : activityLabels.length === 0 ? (
          <StateNotice
            variant="empty"
            title="No saved activity labels yet."
            description="Add your frequent activities to speed up logging on Today."
          />
        ) : (
          <ul className="space-y-2">
            {activityLabels.map((label) => {
              const isEditing = editingActivityLabelId === label.id;
              const isDeleting = activeMutationKey === `activity:delete:${label.id}`;
              const isSaving = activeMutationKey === `activity:save:${label.id}`;

              return (
                <li key={label.id} className="rounded-xl bg-slate-50 px-3 py-2">
                  {isEditing ? (
                    <form
                      className="space-y-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void handleSaveActivityLabel(label.id);
                      }}
                    >
                      <input
                        className="ui-input"
                        value={editingActivityLabelInput}
                        onChange={(event) => setEditingActivityLabelInput(event.target.value)}
                        disabled={isMutating}
                      />
                      <div className="flex gap-2">
                        <button type="submit" className="ui-button ui-button-primary h-9 flex-1 text-xs" disabled={isMutating}>
                          {isSaving ? "Saving..." : "Save"}
                        </button>
                        <button
                          type="button"
                          className="ui-button ui-button-ghost h-9 px-3 text-xs"
                          onClick={stopEditingActivityLabel}
                          disabled={isMutating}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-slate-800">{label.name}</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="ui-button ui-button-ghost h-8 px-3 text-xs"
                          onClick={() => startEditingActivityLabel(label)}
                          disabled={isMutating}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          className="ui-button ui-button-warning h-8 px-3 text-xs"
                          onClick={() => void handleDeleteActivityLabel(label)}
                          disabled={isMutating}
                        >
                          {isDeleting ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="ui-card ui-section">
        <p className="ui-section-title">Event labels</p>
        <form className="flex gap-2" onSubmit={(event) => void handleAddEventLabel(event)}>
          <input
            className="ui-input"
            value={eventLabelInput}
            onChange={(event) => setEventLabelInput(event.target.value)}
            placeholder="Add event label"
            disabled={isMutating}
          />
          <button type="submit" className="ui-button ui-button-primary h-11 px-4" disabled={isMutating}>
            {activeMutationKey === "event:add" ? "Adding..." : "Add"}
          </button>
        </form>

        {isLoadingEventLabels ? (
          <StateNotice variant="loading" title="Loading event labels..." />
        ) : eventLabels.length === 0 ? (
          <StateNotice
            variant="empty"
            title="No saved event labels yet."
            description="Add common events to create quick one-tap chips on Today."
          />
        ) : (
          <ul className="space-y-2">
            {eventLabels.map((label) => {
              const isEditing = editingEventLabelId === label.id;
              const isDeleting = activeMutationKey === `event:delete:${label.id}`;
              const isSaving = activeMutationKey === `event:save:${label.id}`;

              return (
                <li key={label.id} className="rounded-xl bg-slate-50 px-3 py-2">
                  {isEditing ? (
                    <form
                      className="space-y-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void handleSaveEventLabel(label.id);
                      }}
                    >
                      <input
                        className="ui-input"
                        value={editingEventLabelInput}
                        onChange={(event) => setEditingEventLabelInput(event.target.value)}
                        disabled={isMutating}
                      />
                      <div className="flex gap-2">
                        <button type="submit" className="ui-button ui-button-primary h-9 flex-1 text-xs" disabled={isMutating}>
                          {isSaving ? "Saving..." : "Save"}
                        </button>
                        <button
                          type="button"
                          className="ui-button ui-button-ghost h-9 px-3 text-xs"
                          onClick={stopEditingEventLabel}
                          disabled={isMutating}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-slate-800">{label.name}</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="ui-button ui-button-ghost h-8 px-3 text-xs"
                          onClick={() => startEditingEventLabel(label)}
                          disabled={isMutating}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          className="ui-button ui-button-warning h-8 px-3 text-xs"
                          onClick={() => void handleDeleteEventLabel(label)}
                          disabled={isMutating}
                        >
                          {isDeleting ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {errorMessage ? <StateNotice variant="error" title="Could not update labels." description={errorMessage} /> : null}
    </div>
  );
}

