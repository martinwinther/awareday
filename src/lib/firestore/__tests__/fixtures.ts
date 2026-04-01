import { Timestamp } from "firebase/firestore";

import type { ActivityAction, ActivityEntry, EventEntry } from "@/lib/firestore/models";
import { normalizeLabelName } from "@/lib/firestore/normalize-label";

const defaultUserId = "user-1";

export function at(isoDateTime: string): Timestamp {
  return Timestamp.fromDate(new Date(isoDateTime));
}

type BuildActivityEntryInput = {
  id: string;
  label: string;
  action: ActivityAction;
  timestamp: Timestamp;
  normalizedLabel?: string;
};

export function buildActivityEntry(input: BuildActivityEntryInput): ActivityEntry {
  const normalizedLabel = input.normalizedLabel ?? normalizeLabelName(input.label);

  return {
    id: input.id,
    userId: defaultUserId,
    label: input.label,
    normalizedLabel,
    action: input.action,
    timestamp: input.timestamp,
    createdAt: input.timestamp,
    updatedAt: input.timestamp,
  };
}

type BuildEventEntryInput = {
  id: string;
  label: string;
  timestamp: Timestamp;
  normalizedLabel?: string;
};

export function buildEventEntry(input: BuildEventEntryInput): EventEntry {
  const normalizedLabel = input.normalizedLabel ?? normalizeLabelName(input.label);

  return {
    id: input.id,
    userId: defaultUserId,
    label: input.label,
    normalizedLabel,
    timestamp: input.timestamp,
    createdAt: input.timestamp,
    updatedAt: input.timestamp,
  };
}

