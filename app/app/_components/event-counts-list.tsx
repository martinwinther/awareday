import type { DailyEventCount } from "@/lib/firestore/derive-daily-event-counts";

type EventCountsListProps = {
  counts: DailyEventCount[];
  isLoading: boolean;
  loadingText: string;
  emptyText: string;
};

export function EventCountsList({ counts, isLoading, loadingText, emptyText }: EventCountsListProps) {
  if (isLoading) {
    return <p className="text-sm text-slate-600">{loadingText}</p>;
  }

  if (counts.length === 0) {
    return <p className="text-sm text-slate-600">{emptyText}</p>;
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


