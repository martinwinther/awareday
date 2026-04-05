import {
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import type {
  ActivityAction,
  ActivityEntry,
  ActivityEntryDocument,
} from "@/src/lib/domain/models";
import { getLocalDayBounds } from "@/src/lib/domain/local-day";
import { cleanLabelName, normalizeLabelName } from "@/src/lib/domain/normalize-label";
import { activityEntriesCollectionRef } from "@/src/lib/firestore/paths";

type CreateActivityEntryInput = {
  userId: string;
  label: string;
  action: ActivityAction;
  timestamp?: Timestamp;
};

type UpdateActivityEntryInput = {
  userId: string;
  id: string;
  label?: string;
  action?: ActivityAction;
  timestamp?: Timestamp;
};

type DeleteActivityEntryInput = {
  userId: string;
  id: string;
};

export async function createActivityEntry(input: CreateActivityEntryInput): Promise<ActivityEntry> {
  const now = Timestamp.now();
  const label = cleanLabelName(input.label);

  const created: ActivityEntryDocument = {
    userId: input.userId,
    label,
    normalizedLabel: normalizeLabelName(label),
    action: input.action,
    timestamp: input.timestamp ?? now,
    createdAt: now,
    updatedAt: now,
  };

  const collectionRef = activityEntriesCollectionRef(input.userId);
  const documentRef = await addDoc(collectionRef, created);

  return {
    id: documentRef.id,
    ...created,
  };
}

export async function listActivityEntries(userId: string): Promise<ActivityEntry[]> {
  const collectionRef = activityEntriesCollectionRef(userId);
  const entriesQuery = query(collectionRef, orderBy("timestamp", "desc"));
  const snapshot = await getDocs(entriesQuery);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

export async function listActivityEntriesForRecentDays(
  userId: string,
  daysBack: number = 14,
  now: Date = new Date()
): Promise<ActivityEntry[]> {
  const startDay = new Date(now);
  startDay.setDate(startDay.getDate() - Math.max(daysBack, 0));
  const { startOfDay } = getLocalDayBounds(startDay);

  const collectionRef = activityEntriesCollectionRef(userId);
  const entriesQuery = query(
    collectionRef,
    where("timestamp", ">=", Timestamp.fromDate(startOfDay)),
    orderBy("timestamp", "desc")
  );
  const snapshot = await getDocs(entriesQuery);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

export async function listActivityEntriesForDay(userId: string, day: Date): Promise<ActivityEntry[]> {
  const { startOfDay, startOfNextDay } = getLocalDayBounds(day);

  const collectionRef = activityEntriesCollectionRef(userId);
  const entriesQuery = query(
    collectionRef,
    where("timestamp", ">=", Timestamp.fromDate(startOfDay)),
    where("timestamp", "<", Timestamp.fromDate(startOfNextDay)),
    orderBy("timestamp", "desc")
  );
  const snapshot = await getDocs(entriesQuery);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

export async function updateActivityEntry(input: UpdateActivityEntryInput): Promise<void> {
  const documentRef = doc(activityEntriesCollectionRef(input.userId), input.id);
  const updates: Partial<Omit<ActivityEntryDocument, "userId" | "createdAt">> = {
    updatedAt: Timestamp.now(),
  };

  if (input.label !== undefined) {
    const label = cleanLabelName(input.label);
    updates.label = label;
    updates.normalizedLabel = normalizeLabelName(label);
  }

  if (input.action !== undefined) {
    updates.action = input.action;
  }

  if (input.timestamp !== undefined) {
    updates.timestamp = input.timestamp;
  }

  await updateDoc(documentRef, updates);
}

export async function deleteActivityEntry(input: DeleteActivityEntryInput): Promise<void> {
  const documentRef = doc(activityEntriesCollectionRef(input.userId), input.id);
  await deleteDoc(documentRef);
}
