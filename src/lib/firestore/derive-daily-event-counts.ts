import type { EventEntry } from "@/lib/firestore/models";

export type DailyEventCount = {
  normalizedLabel: string;
  label: string;
  count: number;
};

function isOnLocalDay(date: Date, day: Date): boolean {
  return (
    date.getFullYear() === day.getFullYear() &&
    date.getMonth() === day.getMonth() &&
    date.getDate() === day.getDate()
  );
}

export function deriveDailyEventCounts(entries: EventEntry[], day: Date): DailyEventCount[] {
  const countsByLabel = new Map<string, DailyEventCount>();

  for (const entry of entries) {
    if (!isOnLocalDay(entry.timestamp.toDate(), day)) {
      continue;
    }

    const existing = countsByLabel.get(entry.normalizedLabel);

    if (existing) {
      existing.count += 1;
      continue;
    }

    countsByLabel.set(entry.normalizedLabel, {
      normalizedLabel: entry.normalizedLabel,
      label: entry.label,
      count: 1,
    });
  }

  return Array.from(countsByLabel.values()).sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    return left.label.localeCompare(right.label);
  });
}

