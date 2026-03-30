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
import type { EventEntry, EventEntryDocument } from "@/lib/firestore/models";
import { cleanLabelName, normalizeLabelName } from "@/lib/firestore/normalize-label";
import { eventEntriesCollectionRef } from "@/lib/firestore/paths";

type CreateEventEntryInput = {
  userId: string;
  label: string;
  timestamp?: Timestamp;
};

type UpdateEventEntryInput = {
  userId: string;
  id: string;
  label?: string;
  timestamp?: Timestamp;
};

type DeleteEventEntryInput = {
  userId: string;
  id: string;
};

export async function createEventEntry(input: CreateEventEntryInput): Promise<EventEntry> {
  const now = Timestamp.now();
  const label = cleanLabelName(input.label);

  const created: EventEntryDocument = {
    userId: input.userId,
    label,
    normalizedLabel: normalizeLabelName(label),
    timestamp: input.timestamp ?? now,
    createdAt: now,
    updatedAt: now,
  };

  const collectionRef = eventEntriesCollectionRef(input.userId);
  const documentRef = await addDoc(collectionRef, created);

  return {
    id: documentRef.id,
    ...created,
  };
}

export async function listEventEntries(userId: string): Promise<EventEntry[]> {
  const collectionRef = eventEntriesCollectionRef(userId);
  const entriesQuery = query(collectionRef, orderBy("timestamp", "desc"));
  const snapshot = await getDocs(entriesQuery);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

export async function listEventEntriesForDay(userId: string, day: Date): Promise<EventEntry[]> {
  const startOfDay = new Date(day);
  startOfDay.setHours(0, 0, 0, 0);

  const startOfNextDay = new Date(startOfDay);
  startOfNextDay.setDate(startOfNextDay.getDate() + 1);

  const collectionRef = eventEntriesCollectionRef(userId);
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

export async function listTodayEventEntries(userId: string, now: Date = new Date()): Promise<EventEntry[]> {
  return listEventEntriesForDay(userId, now);
}

export async function updateEventEntry(input: UpdateEventEntryInput): Promise<void> {

  const documentRef = doc(eventEntriesCollectionRef(input.userId), input.id);
  const updates: Partial<Omit<EventEntryDocument, "userId" | "createdAt">> = {
    updatedAt: Timestamp.now(),
  };

  if (input.label !== undefined) {
    const label = cleanLabelName(input.label);
    updates.label = label;
    updates.normalizedLabel = normalizeLabelName(label);
  }

  if (input.timestamp !== undefined) {
    updates.timestamp = input.timestamp;
  }

  await updateDoc(documentRef, updates);
}

export async function deleteEventEntry(input: DeleteEventEntryInput): Promise<void> {
  const documentRef = doc(eventEntriesCollectionRef(input.userId), input.id);
  await deleteDoc(documentRef);
}


