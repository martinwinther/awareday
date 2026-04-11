// Models
export type {
  ActivityAction,
  ActivityLabelDocument,
  ActivityLabel,
  EventLabelDocument,
  EventLabel,
  ActivityEntryDocument,
  ActivityEntry,
  EventEntryDocument,
  EventEntry,
} from "./models";

// Label normalization
export { cleanLabelName, normalizeLabelName } from "./normalize-label";

// Date boundaries
export type { LocalDayBounds } from "./local-day";
export { getLocalDayBounds, isOnLocalDay } from "./local-day";

// Activity session pairing and totals
export type { CompletedActivitySession, DailyActivityTotal } from "./derive-activity-totals";
export { deriveCompletedActivitySessions, deriveDailyActivityTotals } from "./derive-activity-totals";

// Event counts
export type { DailyEventCount } from "./derive-daily-event-counts";
export { deriveDailyEventCounts } from "./derive-daily-event-counts";

// Open activity detection
export { deriveOpenActivities } from "./derive-open-activities";

// Calendar day-view layout
export type {
  DayViewActivityBlock,
  DayViewEventMarker,
  SingleDayCalendarItems,
} from "./derive-single-day-calendar-items";
export { deriveSingleDayCalendarItems } from "./derive-single-day-calendar-items";

// Timeline
export type { TodayTimelineItem } from "./derive-today-timeline";
export { deriveTodayTimeline } from "./derive-today-timeline";

// Weekly review summary
export type {
  WeeklyDaySummary,
  WeeklyReviewSummary,
  WeeklyInsightsSummary,
  WeeklyInsightRow,
  WeeklyCheckInConsistencyRow,
  WeeklyComparisonDirection,
  WeeklyTotalComparisonRow,
  WeeklyTopComparisonRow,
  WeeklyComparisonSummary,
} from "./derive-weekly-review";
export {
  resolveFirstDayOfWeek,
  getStartOfLocalWeek,
  getLocalWeekDays,
  deriveWeeklyReviewSummary,
  deriveWeeklyInsightsSummary,
  deriveWeeklyInsightRows,
  deriveWeeklyCheckInConsistencyRows,
  deriveWeeklyComparisonSummary,
} from "./derive-weekly-review";

// Display helpers
export { formatClockTime, formatDuration } from "./summary-helpers";
