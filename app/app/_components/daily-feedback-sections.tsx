        renderItemActions={renderTimelineActions}
}: DailyFeedbackSectionsProps) {
import type { ReactNode } from "react";
import type { DailyActivityTotal } from "@/lib/firestore/derive-activity-totals";
import type { DailyEventCount } from "@/lib/firestore/derive-daily-event-counts";
import type { TodayTimelineItem } from "@/lib/firestore/derive-today-timeline";
import { ActivityTotalsList } from "./activity-totals-list";
import { EventCountsList } from "./event-counts-list";
import { SummarySection } from "./summary-section";
import { TimelineSection } from "./timeline-section";

type SectionCopy = {
  title: string;
  loadingText: string;
  loadingDescription?: string;
  emptyText: string;
  emptyDescription?: string;
};

type DailyFeedbackSectionsProps = {
  activityTotals: DailyActivityTotal[];
  eventCounts: DailyEventCount[];
  timelineItems: TodayTimelineItem[];
  isLoadingActivityTotals: boolean;
  isLoadingEventCounts: boolean;
  isLoadingTimeline: boolean;
  activitySection: SectionCopy;
  eventSection: SectionCopy;
  timelineSection: SectionCopy;
  activitySectionTone?: "default" | "soft";
  eventSectionTone?: "default" | "soft";
  timelineSectionTone?: "default" | "soft";
  renderTimelineEditor?: (item: TodayTimelineItem) => ReactNode;
  renderTimelineActions?: (item: TodayTimelineItem) => ReactNode;
};

export function DailyFeedbackSections({
  activityTotals,
  eventCounts,
  timelineItems,
  isLoadingActivityTotals,
  isLoadingEventCounts,
  isLoadingTimeline,
  activitySection,
  eventSection,
  timelineSection,
  activitySectionTone = "default",
  eventSectionTone = "default",
  timelineSectionTone = "default",
  renderTimelineEditor,
  renderTimelineActions,
    <div className="space-y-4">
  return (
    <>
      <SummarySection title={activitySection.title} tone={activitySectionTone}>
        <ActivityTotalsList
          totals={activityTotals}
          isLoading={isLoadingActivityTotals}
          loadingText={activitySection.loadingText}
          loadingDescription={activitySection.loadingDescription}
          emptyText={activitySection.emptyText}
          emptyDescription={activitySection.emptyDescription}
        />
      </SummarySection>

      <SummarySection title={eventSection.title} tone={eventSectionTone}>
        <EventCountsList
          counts={eventCounts}
          isLoading={isLoadingEventCounts}
          loadingText={eventSection.loadingText}
          loadingDescription={eventSection.loadingDescription}
          emptyText={eventSection.emptyText}
          emptyDescription={eventSection.emptyDescription}
        />
      </SummarySection>

      <TimelineSection
        title={timelineSection.title}
        tone={timelineSectionTone}
        items={timelineItems}
        isLoading={isLoadingTimeline}
        loadingText={timelineSection.loadingText}
        loadingDescription={timelineSection.loadingDescription}
        emptyText={timelineSection.emptyText}
        emptyDescription={timelineSection.emptyDescription}
        renderItemEditor={renderTimelineEditor}
    </div>
      />
    </>
  );
}

