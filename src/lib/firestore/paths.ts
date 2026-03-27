import { CollectionReference, Firestore, collection, doc } from "firebase/firestore";
import type {
  ActivityEntryDocument,
  ActivityLabelDocument,
  EventEntryDocument,
  EventLabelDocument,
} from "./models";
import { getFirestoreDb } from "@/lib/firebase/firestore";

export type UserScopedCollectionName =
  | "activityLabels"
  | "eventLabels"
  | "activityEntries"
  | "eventEntries";

export function userDocumentPath(userId: string): string {
  return `users/${assertUserId(userId)}`;
}

export function userScopedCollectionPath(
  userId: string,
  collectionName: UserScopedCollectionName
): string {
  return `${userDocumentPath(userId)}/${collectionName}`;
}

export function userDocumentRef(userId: string, db: Firestore = getFirestoreDb()) {
  return doc(db, userDocumentPath(userId));
}

export function activityLabelsCollectionRef(
  userId: string,
  db: Firestore = getFirestoreDb()
): CollectionReference<ActivityLabelDocument> {
  return collection(
    db,
    userScopedCollectionPath(userId, "activityLabels")
  ) as CollectionReference<ActivityLabelDocument>;
}

export function eventLabelsCollectionRef(
  userId: string,
  db: Firestore = getFirestoreDb()
): CollectionReference<EventLabelDocument> {
  return collection(db, userScopedCollectionPath(userId, "eventLabels")) as CollectionReference<EventLabelDocument>;
}

export function activityEntriesCollectionRef(
  userId: string,
  db: Firestore = getFirestoreDb()
): CollectionReference<ActivityEntryDocument> {
  return collection(
    db,
    userScopedCollectionPath(userId, "activityEntries")
  ) as CollectionReference<ActivityEntryDocument>;
}

export function eventEntriesCollectionRef(
  userId: string,
  db: Firestore = getFirestoreDb()
): CollectionReference<EventEntryDocument> {
  return collection(db, userScopedCollectionPath(userId, "eventEntries")) as CollectionReference<EventEntryDocument>;
}

function assertUserId(userId: string): string {
  const trimmed = userId.trim();

  if (trimmed.length === 0) {
    throw new Error("A valid user ID is required.");
  }

  return trimmed;
}



