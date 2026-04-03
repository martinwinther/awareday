import { FirebaseApp, FirebaseOptions, getApp, getApps, initializeApp } from "firebase/app";
import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra ?? {};

const requiredKeys = ["firebaseApiKey", "firebaseAuthDomain", "firebaseProjectId", "firebaseAppId"] as const;

let cachedApp: FirebaseApp | null = null;

function getConfig(): FirebaseOptions {
  const missing = requiredKeys.filter((k) => !extra[k]);
  if (missing.length > 0) {
    throw new Error(`Firebase not configured. Missing in app.json extra: ${missing.join(", ")}`);
  }

  return {
    apiKey: extra.firebaseApiKey,
    authDomain: extra.firebaseAuthDomain,
    projectId: extra.firebaseProjectId,
    appId: extra.firebaseAppId,
    storageBucket: extra.firebaseStorageBucket,
    messagingSenderId: extra.firebaseMessagingSenderId,
    measurementId: extra.firebaseMeasurementId,
  };
}

export function getFirebaseApp(): FirebaseApp {
  if (cachedApp) return cachedApp;
  cachedApp = getApps().length > 0 ? getApp() : initializeApp(getConfig());
  return cachedApp;
}

export function isFirebaseConfigured(): boolean {
  return requiredKeys.every((k) => !!extra[k]);
}
