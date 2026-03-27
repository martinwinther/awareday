import {
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import type { EventLabel, EventLabelDocument } from "@/lib/firestore/models";
import { cleanLabelName, normalizeLabelName } from "@/lib/firestore/normalize-label";
import { eventLabelsCollectionRef } from "@/lib/firestore/paths";

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

export async function createEventLabel(input: CreateEventLabelInput): Promise<EventLabel> {
  const now = Timestamp.now();
  const name = cleanLabelName(input.name);

  const created: EventLabelDocument = {
    userId: input.userId,
    name,
    normalizedName: normalizeLabelName(name),
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


