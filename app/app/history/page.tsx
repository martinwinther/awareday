"use client";

import { useEffect, useMemo, useState } from "react";
import { FirebaseError } from "firebase/app";
import { deriveDailyActivityTotals } from "@/lib/firestore/derive-activity-totals";
import { deriveDailyEventCounts } from "@/lib/firestore/derive-daily-event-counts";
import type { ActivityEntry, EventEntry } from "@/lib/firestore/models";
import { deriveTodayTimeline } from "@/lib/firestore/derive-today-timeline";
import {
  listActivityEntriesForDay,
  listEventEntriesForDay,
} from "@/lib/firestore/repositories";
import { useAuthUser } from "@/lib/firebase/auth";

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

function formatTimelineTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDuration(totalDurationMs: number): string {
  const totalMinutes = Math.floor(totalDurationMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

export default function HistoryPage() {
  const { user } = useAuthUser();
  const [selectedDay, setSelectedDay] = useState(() => getStartOfDay(new Date()));
  const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>([]);
  const [eventEntries, setEventEntries] = useState<EventEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSelectedDayToday = useMemo(() => isSameLocalDay(selectedDay, new Date()), [selectedDay]);

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
        const [loadedActivityEntries, loadedEventEntries] = await Promise.all([
          listActivityEntriesForDay(user.uid, selectedDay),
          listEventEntriesForDay(user.uid, selectedDay),
        ]);

        if (!isActive) {
          return;
        }

        setActivityEntries(loadedActivityEntries);
        setEventEntries(loadedEventEntries);
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (error instanceof FirebaseError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("Could not load history for this day. Please try again.");
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
    [activityEntries, selectedDay]
  );

  const eventCounts = useMemo(
    () => deriveDailyEventCounts(eventEntries, selectedDay),
    [eventEntries, selectedDay]
  );

  const timelineItems = useMemo(
    () => deriveTodayTimeline(activityEntries, eventEntries, selectedDay),
    [activityEntries, eventEntries, selectedDay]
  );

  return (
    <div className="space-y-4">
      <section className="ui-card ui-section">
        <p className="ui-section-title">History</p>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className="ui-button ui-button-ghost h-10 px-3"
            onClick={() => setSelectedDay((previousDay) => shiftLocalDay(previousDay, -1))}
          >
            Previous
          </button>
          <p className="text-sm font-medium text-slate-800">{formatSelectedDay(selectedDay)}</p>
          <button
            type="button"
            className="ui-button ui-button-ghost h-10 px-3"
            onClick={() => setSelectedDay((previousDay) => shiftLocalDay(previousDay, 1))}
            disabled={isSelectedDayToday}
          >
            Next
          </button>
        </div>
      </section>

      {errorMessage ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>
      ) : null}

      <section className="ui-card ui-section">
        <p className="ui-section-title">Activity totals</p>
        {isLoading ? (
          <p className="text-sm text-slate-600">Loading activity totals...</p>
        ) : activityTotals.length === 0 ? (
          <p className="text-sm text-slate-600">No completed activities for this day.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {activityTotals.map((item) => (
              <li key={item.normalizedLabel} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="font-medium text-slate-800">{item.label}</span>
                <span className="text-slate-600">{formatDuration(item.totalDurationMs)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ui-card ui-section">
        <p className="ui-section-title">Event counts</p>
        {isLoading ? (
          <p className="text-sm text-slate-600">Loading event counts...</p>
        ) : eventCounts.length === 0 ? (
          <p className="text-sm text-slate-600">No events logged for this day.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {eventCounts.map((item) => (
              <li key={item.normalizedLabel} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="font-medium text-slate-800">{item.label}</span>
                <span className="text-slate-600">{item.count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ui-card ui-section">
        <p className="ui-section-title">Daily timeline</p>
        {isLoading ? (
          <p className="text-sm text-slate-600">Loading timeline...</p>
        ) : timelineItems.length === 0 ? (
          <p className="text-sm text-slate-600">No entries in this day timeline.</p>
        ) : (
          <ol className="space-y-2 text-sm text-slate-700">
            {timelineItems.map((item) => {
              const isActivityStart = item.kind === "activity-start";
              const isActivityEnd = item.kind === "activity-end";

              return (
                <li key={`${item.kind}-${item.entry.id}`} className="space-y-2 rounded-xl bg-slate-50 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-slate-800">{item.entry.label}</span>
                    <span className="text-slate-500">{formatTimelineTime(item.entry.timestamp.toDate())}</span>
                  </div>
                  <div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        isActivityStart
                          ? "bg-emerald-100 text-emerald-700"
                          : isActivityEnd
                            ? "bg-amber-100 text-amber-700"
                            : "bg-sky-100 text-sky-700"
                      }`}
                    >
                      {isActivityStart ? "Activity start" : isActivityEnd ? "Activity end" : "Event"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}

