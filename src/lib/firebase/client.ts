import { FirebaseApp, FirebaseOptions, getApp, getApps, initializeApp } from "firebase/app";

// Expo only inlines EXPO_PUBLIC_* env vars at build time.
// These are set in .env locally or in Netlify dashboard.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "",
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
