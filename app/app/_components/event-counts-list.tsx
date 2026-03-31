import type { DailyEventCount } from "@/lib/firestore/derive-daily-event-counts";
import { StateNotice } from "./state-notice";

type EventCountsListProps = {
  counts: DailyEventCount[];
  isLoading: boolean;
  loadingText: string;
  loadingDescription?: string;
  emptyText: string;
  emptyDescription?: string;
};

export function EventCountsList({
  counts,
  isLoading,
  loadingText,
  loadingDescription,
  emptyText,
  emptyDescription,
}: EventCountsListProps) {
  if (isLoading) {
    return <StateNotice variant="loading" title={loadingText} description={loadingDescription} />;
  }

  if (counts.length === 0) {
    return <StateNotice variant="empty" title={emptyText} description={emptyDescription} />;
  }

  return (
    <ul className="space-y-2 text-sm">
      {counts.map((item) => (
        <li key={item.normalizedLabel} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
          <span className="font-medium text-slate-800">{item.label}</span>
          <span className="text-slate-600">{item.count}</span>
        </li>
      ))}
    </ul>
  );
}


