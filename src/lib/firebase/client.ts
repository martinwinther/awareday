import { FirebaseApp, FirebaseOptions, getApp, getApps, initializeApp } from "firebase/app";

export const requiredFirebaseEnvKeys = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

type RequiredFirebaseEnvKey = (typeof requiredFirebaseEnvKeys)[number];

let cachedFirebaseApp: FirebaseApp | null = null;

const firebasePublicEnv: Record<RequiredFirebaseEnvKey, string> = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() ?? "",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() ?? "",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ?? "",
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim() ?? "",
};

function readRequiredFirebaseEnvValue(key: RequiredFirebaseEnvKey): string {
  return firebasePublicEnv[key];
}

export function getMissingFirebaseEnvKeys(): RequiredFirebaseEnvKey[] {
  return requiredFirebaseEnvKeys.filter((key) => readRequiredFirebaseEnvValue(key).length === 0);
}

export function isFirebaseClientConfigured(): boolean {
  return getMissingFirebaseEnvKeys().length === 0;
}

export function buildFirebaseConfigError(serviceName: string = "Firebase"): Error {
  const missingKeys = getMissingFirebaseEnvKeys();

  if (missingKeys.length === 0) {
    return new Error(`${serviceName} is unavailable right now.`);
  }

  return new Error(`${serviceName} is not configured. Missing: ${missingKeys.join(", ")}`);
}

function getFirebaseClientConfig(): FirebaseOptions {
  if (!isFirebaseClientConfigured()) {
    throw buildFirebaseConfigError();
  }

  return {
    apiKey: readRequiredFirebaseEnvValue("NEXT_PUBLIC_FIREBASE_API_KEY"),
    authDomain: readRequiredFirebaseEnvValue("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    projectId: readRequiredFirebaseEnvValue("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    appId: readRequiredFirebaseEnvValue("NEXT_PUBLIC_FIREBASE_APP_ID"),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim(),
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim(),
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID?.trim(),
  };
}

export function getFirebaseApp(): FirebaseApp {
  if (cachedFirebaseApp) {
    return cachedFirebaseApp;
  }

  cachedFirebaseApp = getApps().length > 0 ? getApp() : initializeApp(getFirebaseClientConfig());
  return cachedFirebaseApp;
}

