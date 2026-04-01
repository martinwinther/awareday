import type { ActivityEntry } from "@/lib/firestore/models";
import { isOnLocalDay } from "@/lib/firestore/local-day";

export type CompletedActivitySession = {
  normalizedLabel: string;
  label: string;
  startEntryId: string;
  endEntryId: string;
  startTimestamp: Date;
  endTimestamp: Date;
  durationMs: number;
};

export type DailyActivityTotal = {
  normalizedLabel: string;
  label: string;
  totalDurationMs: number;
};


export function deriveCompletedActivitySessions(entries: ActivityEntry[]): CompletedActivitySession[] {
  const chronologicalEntries = [...entries].sort(
    (left, right) => left.timestamp.toMillis() - right.timestamp.toMillis()
  );
  const openStacksByLabel = new Map<string, ActivityEntry[]>();
  const sessions: CompletedActivitySession[] = [];

  for (const entry of chronologicalEntries) {
    const openStarts = openStacksByLabel.get(entry.normalizedLabel) ?? [];

    if (entry.action === "start") {
      openStarts.push(entry);
      openStacksByLabel.set(entry.normalizedLabel, openStarts);
      continue;
    }

    if (openStarts.length === 0) {
      continue;
    }

    const startEntry = openStarts.pop();

    if (openStarts.length === 0) {
      openStacksByLabel.delete(entry.normalizedLabel);
    } else {
      openStacksByLabel.set(entry.normalizedLabel, openStarts);
    }

    if (!startEntry) {
      continue;
    }

    const startTimestamp = startEntry.timestamp.toDate();
    const endTimestamp = entry.timestamp.toDate();
    const durationMs = Math.max(0, endTimestamp.getTime() - startTimestamp.getTime());

    sessions.push({
      normalizedLabel: startEntry.normalizedLabel,
      label: startEntry.label,
      startEntryId: startEntry.id,
      endEntryId: entry.id,
      startTimestamp,
      endTimestamp,
      durationMs,
    });
  }

  return sessions;
}

export function deriveDailyActivityTotals(entries: ActivityEntry[], day: Date): DailyActivityTotal[] {
  const totalsByLabel = new Map<string, DailyActivityTotal>();
  const sessions = deriveCompletedActivitySessions(entries);

  for (const session of sessions) {
    if (!isOnLocalDay(session.startTimestamp, day) || !isOnLocalDay(session.endTimestamp, day)) {
      continue;
    }

    const existing = totalsByLabel.get(session.normalizedLabel);

    if (existing) {
      existing.totalDurationMs += session.durationMs;
      continue;
    }

    totalsByLabel.set(session.normalizedLabel, {
      normalizedLabel: session.normalizedLabel,
      label: session.label,
      totalDurationMs: session.durationMs,
    });
  }

  return Array.from(totalsByLabel.values()).sort((left, right) => {
    if (right.totalDurationMs !== left.totalDurationMs) {
      return right.totalDurationMs - left.totalDurationMs;
    }

    return left.label.localeCompare(right.label);
  });
}

