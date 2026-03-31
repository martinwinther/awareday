import type { ReactNode } from "react";
import type { TodayTimelineItem } from "@/lib/firestore/derive-today-timeline";

type TimelineRowProps = {
  item: TodayTimelineItem;
  formatTime: (date: Date) => string;
  editor?: ReactNode;
  actions?: ReactNode;
};

function getBadgeStyles(kind: TodayTimelineItem["kind"]): string {
  if (kind === "activity-start") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (kind === "activity-end") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-sky-100 text-sky-700";
}

function getBadgeLabel(kind: TodayTimelineItem["kind"]): string {
  if (kind === "activity-start") {
    return "Activity start";
  }

  if (kind === "activity-end") {
    return "Activity end";
  }

  return "Event";
}

export function TimelineRow({ item, formatTime, editor, actions }: TimelineRowProps) {
  if (editor) {
    return (
      <li key={`${item.kind}-${item.entry.id}`} className="space-y-2 rounded-xl bg-slate-50 px-3 py-2">
        {editor}
      </li>
    );
  }

  return (
    <li key={`${item.kind}-${item.entry.id}`} className="space-y-2 rounded-xl bg-slate-50 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium text-slate-800">{item.entry.label}</span>
        <span className="text-slate-500">{formatTime(item.entry.timestamp.toDate())}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${getBadgeStyles(item.kind)}`}>
          {getBadgeLabel(item.kind)}
        </span>
        {actions}
      </div>
    </li>
  );
}

