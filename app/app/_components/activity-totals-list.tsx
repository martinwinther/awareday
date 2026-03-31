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
        <li key={item.normalizedLabel} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
          <span className="font-medium text-slate-800">{item.label}</span>
          <span className="text-slate-600">{formatDuration(item.totalDurationMs)}</span>
        </li>
      ))}
    </ul>
  );
}

