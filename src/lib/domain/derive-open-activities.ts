import type { ActivityEntry } from "./models";

export function deriveOpenActivities(entries: ActivityEntry[]): ActivityEntry[] {
  const chronologicalEntries = [...entries].sort(
    (left, right) => left.timestamp.toMillis() - right.timestamp.toMillis()
  );
  const openStacksByLabel = new Map<string, ActivityEntry[]>();

  for (const entry of chronologicalEntries) {
    const openStarts = openStacksByLabel.get(entry.normalizedLabel) ?? [];

    if (entry.action === "start") {
      openStarts.push(entry);
      openStacksByLabel.set(entry.normalizedLabel, openStarts);
      continue;
    }

    if (openStarts.length > 0) {
      openStarts.pop();
    }

    if (openStarts.length === 0) {
      openStacksByLabel.delete(entry.normalizedLabel);
    } else {
      openStacksByLabel.set(entry.normalizedLabel, openStarts);
    }
  }

  return Array.from(openStacksByLabel.values())
    .flat()
    .sort((left, right) => right.timestamp.toMillis() - left.timestamp.toMillis());
}
