import {
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import type { EventLabel, EventLabelDocument } from "@/src/lib/domain/models";
import { cleanLabelName, normalizeLabelName } from "@/src/lib/domain/normalize-label";
import { eventLabelsCollectionRef } from "@/src/lib/firestore/paths";

type CreateEventLabelInput = {
  userId: string;
  name: string;
};

type UpdateEventLabelInput = {
  userId: string;
  id: string;
  name: string;
};

type DeleteEventLabelInput = {
  userId: string;
  id: string;
};

type SetEventLabelPinnedInput = {
  userId: string;
  id: string;
  pinned: boolean;
};

export async function createEventLabel(input: CreateEventLabelInput): Promise<EventLabel> {
  const now = Timestamp.now();
  const name = cleanLabelName(input.name);

  const created: EventLabelDocument = {
    userId: input.userId,
    name,
    normalizedName: normalizeLabelName(name),
    pinned: false,
    createdAt: now,
    updatedAt: now,
  };

  const collectionRef = eventLabelsCollectionRef(input.userId);
  const documentRef = await addDoc(collectionRef, created);

  return {
    id: documentRef.id,
    ...created,
  };
}

export async function createEventLabelIfMissing(input: CreateEventLabelInput): Promise<EventLabel> {
  const name = cleanLabelName(input.name);
  const normalizedName = normalizeLabelName(name);
  const collectionRef = eventLabelsCollectionRef(input.userId);
  const existingQuery = query(collectionRef, where("normalizedName", "==", normalizedName), limit(1));
  const existingSnapshot = await getDocs(existingQuery);

  if (!existingSnapshot.empty) {
    const existing = existingSnapshot.docs[0];

    return {
      id: existing.id,
      ...existing.data(),
    };
  }

  return createEventLabel({
    userId: input.userId,
    name,
  });
}

export async function listEventLabels(userId: string): Promise<EventLabel[]> {
  const collectionRef = eventLabelsCollectionRef(userId);
  const labelsQuery = query(collectionRef, orderBy("name"));
  const snapshot = await getDocs(labelsQuery);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

export async function updateEventLabel(input: UpdateEventLabelInput): Promise<void> {
  const documentRef = doc(eventLabelsCollectionRef(input.userId), input.id);
  const name = cleanLabelName(input.name);

  await updateDoc(documentRef, {
    name,
    normalizedName: normalizeLabelName(name),
    updatedAt: Timestamp.now(),
  });
}

export async function deleteEventLabel(input: DeleteEventLabelInput): Promise<void> {
  const documentRef = doc(eventLabelsCollectionRef(input.userId), input.id);
  await deleteDoc(documentRef);
}

export async function setEventLabelPinned(input: SetEventLabelPinnedInput): Promise<void> {
  const documentRef = doc(eventLabelsCollectionRef(input.userId), input.id);

  await updateDoc(documentRef, {
    pinned: input.pinned,
    updatedAt: Timestamp.now(),
  });
}
