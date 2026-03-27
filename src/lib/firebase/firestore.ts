import { getFirestore } from "firebase/firestore";
import { firebaseApp } from "./client";

export const firestoreDb = getFirestore(firebaseApp);

