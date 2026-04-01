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
        <li
          key={item.normalizedLabel}
          className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#faf5f0] to-[#f5f1e8] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_2px_6px_-3px_rgba(98,75,55,0.1)]"
        >
          <span className="font-medium text-stone-900">{item.label}</span>
          <span className="font-semibold text-amber-800">{item.count}</span>
        </li>
      ))}
    </ul>
  );
}
