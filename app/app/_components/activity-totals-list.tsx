import type { DailyActivityTotal } from "@/lib/firestore/derive-activity-totals";
import { formatDuration } from "./summary-helpers";
import { StateNotice } from "./state-notice";

type ActivityTotalsListProps = {
  totals: DailyActivityTotal[];
  isLoading: boolean;
  loadingText: string;
  loadingDescription?: string;
  emptyText: string;
  emptyDescription?: string;
};

export function ActivityTotalsList({
  totals,
  isLoading,
  loadingText,
  loadingDescription,
  emptyText,
  emptyDescription,
}: ActivityTotalsListProps) {
  if (isLoading) {
    return <StateNotice variant="loading" title={loadingText} description={loadingDescription} />;
  }

  if (totals.length === 0) {
    return <StateNotice variant="empty" title={emptyText} description={emptyDescription} />;
  }

  return (
    <ul className="space-y-2 text-sm">
      {totals.map((item) => (
        <li
          key={item.normalizedLabel}
          className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#f9f3e9] to-[#f5ede3] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
        >
          <span className="font-medium text-stone-900">{item.label}</span>
          <span className="font-medium text-amber-900">{formatDuration(item.totalDurationMs)}</span>
        </li>
      ))}
    </ul>
  );
}

