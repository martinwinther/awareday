import { FirebaseApp, FirebaseOptions, getApp, getApps, initializeApp } from "firebase/app";

// Read Firebase config directly from process.env.
// Metro inlines these at build time on web (like Next.js did).
// Supports both NEXT_PUBLIC_FIREBASE_* (existing Netlify env vars)
// and FIREBASE_* (cleaner naming for future use).
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? process.env.FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? process.env.FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? process.env.FIREBASE_PROJECT_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? process.env.FIREBASE_APP_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? process.env.FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? process.env.FIREBASE_MESSAGING_SENDER_ID ?? "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? process.env.FIREBASE_MEASUREMENT_ID ?? "",
};

const requiredKeys = ["apiKey", "authDomain", "projectId", "appId"] as const;

let cachedApp: FirebaseApp | null = null;

function getConfig(): FirebaseOptions {
  const missing = requiredKeys.filter((k) => !firebaseConfig[k]);
  if (missing.length > 0) {
    throw new Error(`Firebase not configured. Missing: ${missing.join(", ")}`);
  }
  return firebaseConfig;
}

export function getFirebaseApp(): FirebaseApp {
  if (cachedApp) return cachedApp;
  cachedApp = getApps().length > 0 ? getApp() : initializeApp(getConfig());
  return cachedApp;
}

export function isFirebaseConfigured(): boolean {
  return requiredKeys.every((k) => !!firebaseConfig[k]);
}
