import { Firestore, getFirestore } from "firebase/firestore";
import { getFirebaseApp } from "./client";

let cachedFirestoreDb: Firestore | null = null;

export function getFirestoreDb(): Firestore {
  if (cachedFirestoreDb) {
    return cachedFirestoreDb;
  }

  cachedFirestoreDb = getFirestore(getFirebaseApp());
  return cachedFirestoreDb;
}

