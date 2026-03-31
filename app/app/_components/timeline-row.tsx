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
    return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (kind === "activity-end") {
    return "border border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border border-indigo-200 bg-indigo-50 text-indigo-700";
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
      <li
        key={`${item.kind}-${item.entry.id}`}
        className="space-y-2 rounded-2xl bg-gradient-to-r from-[#faf5f0] to-[#f5f1e8] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_2px_6px_-3px_rgba(98,75,55,0.1)]"
      >
        {editor}
      </li>
    );
  }

  return (
    <li
      key={`${item.kind}-${item.entry.id}`}
      className="space-y-2 rounded-2xl bg-gradient-to-r from-[#faf5f0] to-[#f5f1e8] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_2px_6px_-3px_rgba(98,75,55,0.1)]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium text-stone-800">{item.entry.label}</span>
        <span className="text-stone-500">{formatTime(item.entry.timestamp.toDate())}</span>
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

