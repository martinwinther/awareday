"use client";

import { useEffect, useMemo, useState } from "react";
import { FirebaseError } from "firebase/app";
import { ActivityTotalsList } from "../_components/activity-totals-list";
import { EventCountsList } from "../_components/event-counts-list";
import { StateNotice } from "../_components/state-notice";
import { SummarySection } from "../_components/summary-section";
import { TimelineSection } from "../_components/timeline-section";
import { deriveDailyActivityTotals } from "@/lib/firestore/derive-activity-totals";
import { deriveDailyEventCounts } from "@/lib/firestore/derive-daily-event-counts";
import { deriveTodayTimeline } from "@/lib/firestore/derive-today-timeline";
import type { ActivityEntry, EventEntry } from "@/lib/firestore/models";
import { listActivityEntriesForDay, listEventEntriesForDay } from "@/lib/firestore/repositories";
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

export default function HistoryPage() {
  const { user } = useAuthUser();
  const [selectedDay, setSelectedDay] = useState(() => getStartOfDay(new Date()));
  const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>([]);
  const [eventEntries, setEventEntries] = useState<EventEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      <SummarySection title="History">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className="ui-button ui-button-ghost h-10 px-3"
            onClick={() => setSelectedDay((previousDay) => shiftLocalDay(previousDay, -1))}
          >
            Previous
          </button>
          <p className="text-sm font-medium text-slate-800">{formattedSelectedDay}</p>
          <button
            type="button"
            className="ui-button ui-button-ghost h-10 px-3"
            onClick={() => setSelectedDay((previousDay) => shiftLocalDay(previousDay, 1))}
            disabled={isSelectedDayToday}
          >
            Next
          </button>
        </div>
      </SummarySection>

      {errorMessage ? <StateNotice variant="error" title="Could not load this day." description={errorMessage} /> : null}

      <SummarySection title="Activity totals">
        <ActivityTotalsList
          totals={activityTotals}
          isLoading={isLoading}
          loadingText={`Loading activity totals for ${formattedSelectedDay}...`}
          emptyText={`No completed activities logged on ${formattedSelectedDay}.`}
        />
      </SummarySection>

      <SummarySection title="Event counts">
        <EventCountsList
          counts={eventCounts}
          isLoading={isLoading}
          loadingText={`Loading event counts for ${formattedSelectedDay}...`}
          emptyText={`No events logged on ${formattedSelectedDay}.`}
        />
      </SummarySection>

      <TimelineSection
        title="Daily timeline"
        items={timelineItems}
        isLoading={isLoading}
        loadingText={`Loading timeline for ${formattedSelectedDay}...`}
        emptyText={`No history entries found for ${formattedSelectedDay}.`}
      />
    </div>
  );
}
