import type { ReactNode } from "react";
import type { TodayTimelineItem } from "@/lib/firestore/derive-today-timeline";
import { formatClockTime } from "./summary-helpers";
import { SummarySection } from "./summary-section";
import { StateNotice } from "./state-notice";
import { TimelineRow } from "./timeline-row";

type TimelineSectionProps = {
  title: string;
  items: TodayTimelineItem[];
  isLoading: boolean;
  loadingText: string;
  loadingDescription?: string;
  emptyText: string;
  emptyDescription?: string;
  formatTime?: (date: Date) => string;
  renderItemEditor?: (item: TodayTimelineItem) => ReactNode;
  renderItemActions?: (item: TodayTimelineItem) => ReactNode;
};

export function TimelineSection({
  title,
  items,
  isLoading,
  loadingText,
  loadingDescription,
  emptyText,
  emptyDescription,
  formatTime = formatClockTime,
  renderItemEditor,
  renderItemActions,
}: TimelineSectionProps) {
  return (
    <SummarySection title={title}>
      {isLoading ? (
        <StateNotice variant="loading" title={loadingText} description={loadingDescription} />
      ) : items.length === 0 ? (
        <StateNotice variant="empty" title={emptyText} description={emptyDescription} />
      ) : (
        <ol className="space-y-2 text-sm text-slate-700">
          {items.map((item) => {
            const editor = renderItemEditor?.(item);
            return (
              <TimelineRow
                key={`${item.kind}-${item.entry.id}`}
                item={item}
                formatTime={formatTime}
                editor={editor}
                actions={renderItemActions?.(item)}
              />
            );
          })}
        </ol>
      )}
    </SummarySection>
  );
}


