import { FirebaseApp, FirebaseOptions, getApp, getApps, initializeApp } from "firebase/app";

export const requiredFirebaseEnvKeys = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

export const optionalFirebaseEnvKeys = [
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID",
] as const;

type RequiredFirebaseEnvKey = (typeof requiredFirebaseEnvKeys)[number];
type OptionalFirebaseEnvKey = (typeof optionalFirebaseEnvKeys)[number];

let cachedFirebaseApp: FirebaseApp | null = null;

const firebaseRequiredEnv: Record<RequiredFirebaseEnvKey, string> = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() ?? "",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() ?? "",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ?? "",
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim() ?? "",
};

const firebaseOptionalEnv: Record<OptionalFirebaseEnvKey, string | undefined> = {
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: normalizeOptionalEnvValue(
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  ),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: normalizeOptionalEnvValue(
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  ),
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: normalizeOptionalEnvValue(
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
  ),
};

function normalizeOptionalEnvValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function readRequiredFirebaseEnvValue(key: RequiredFirebaseEnvKey): string {
  return firebaseRequiredEnv[key];
}

function readOptionalFirebaseEnvValue(key: OptionalFirebaseEnvKey): string | undefined {
  return firebaseOptionalEnv[key];
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
    storageBucket: readOptionalFirebaseEnvValue("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: readOptionalFirebaseEnvValue("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
    measurementId: readOptionalFirebaseEnvValue("NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID"),
  };
}

export function getFirebaseApp(): FirebaseApp {
  if (cachedFirebaseApp) {
    return cachedFirebaseApp;
  }

  cachedFirebaseApp = getApps().length > 0 ? getApp() : initializeApp(getFirebaseClientConfig());
  return cachedFirebaseApp;
}
