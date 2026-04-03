import { Firestore, getFirestore } from "firebase/firestore";
import { getFirebaseApp } from "./client";

let cachedDb: Firestore | null = null;

export function getFirestoreDb(): Firestore {
  if (cachedDb) return cachedDb;
  cachedDb = getFirestore(getFirebaseApp());
  return cachedDb;
}
