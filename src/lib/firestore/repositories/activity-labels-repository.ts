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
import type { ActivityLabel, ActivityLabelDocument } from "@/lib/firestore/models";
import { cleanLabelName, normalizeLabelName } from "@/lib/firestore/normalize-label";
import { activityLabelsCollectionRef } from "@/lib/firestore/paths";

type CreateActivityLabelInput = {
  userId: string;
  name: string;
};

type UpdateActivityLabelInput = {
  userId: string;
  id: string;
  name: string;
};

type DeleteActivityLabelInput = {
  userId: string;
  id: string;
};

export async function createActivityLabel(input: CreateActivityLabelInput): Promise<ActivityLabel> {
  const now = Timestamp.now();
  const name = cleanLabelName(input.name);

  const created: ActivityLabelDocument = {
    userId: input.userId,
    name,
    normalizedName: normalizeLabelName(name),
    createdAt: now,
    updatedAt: now,
  };

  const collectionRef = activityLabelsCollectionRef(input.userId);
  const documentRef = await addDoc(collectionRef, created);

  return {
    id: documentRef.id,
    ...created,
  };
}

export async function listActivityLabels(userId: string): Promise<ActivityLabel[]> {
  const collectionRef = activityLabelsCollectionRef(userId);
  const labelsQuery = query(collectionRef, orderBy("name"));
  const snapshot = await getDocs(labelsQuery);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

export async function updateActivityLabel(input: UpdateActivityLabelInput): Promise<void> {
  const documentRef = doc(activityLabelsCollectionRef(input.userId), input.id);
  const name = cleanLabelName(input.name);

  await updateDoc(documentRef, {
    name,
    normalizedName: normalizeLabelName(name),
    updatedAt: Timestamp.now(),
  });
}

export async function deleteActivityLabel(input: DeleteActivityLabelInput): Promise<void> {
  const documentRef = doc(activityLabelsCollectionRef(input.userId), input.id);
  await deleteDoc(documentRef);
}


