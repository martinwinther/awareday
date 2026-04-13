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
import type { ActivityLabel, ActivityLabelDocument } from "@/src/lib/domain/models";
import { cleanLabelName, normalizeLabelName } from "@/src/lib/domain/normalize-label";
import { activityLabelsCollectionRef } from "@/src/lib/firestore/paths";

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

type SetActivityLabelPinnedInput = {
  userId: string;
  id: string;
  pinned: boolean;
};

export async function createActivityLabel(input: CreateActivityLabelInput): Promise<ActivityLabel> {
  const now = Timestamp.now();
  const name = cleanLabelName(input.name);

  const created: ActivityLabelDocument = {
    userId: input.userId,
    name,
    normalizedName: normalizeLabelName(name),
    pinned: false,
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

export async function createActivityLabelIfMissing(
  input: CreateActivityLabelInput
): Promise<ActivityLabel> {
  const name = cleanLabelName(input.name);
  const normalizedName = normalizeLabelName(name);
  const collectionRef = activityLabelsCollectionRef(input.userId);
  const existingQuery = query(collectionRef, where("normalizedName", "==", normalizedName), limit(1));
  const existingSnapshot = await getDocs(existingQuery);

  if (!existingSnapshot.empty) {
    const existing = existingSnapshot.docs[0];

    return {
      id: existing.id,
      ...existing.data(),
    };
  }

  return createActivityLabel({
    userId: input.userId,
    name,
  });
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

export async function setActivityLabelPinned(input: SetActivityLabelPinnedInput): Promise<void> {
  const documentRef = doc(activityLabelsCollectionRef(input.userId), input.id);

  await updateDoc(documentRef, {
    pinned: input.pinned,
    updatedAt: Timestamp.now(),
  });
}
