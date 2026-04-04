import { ExpoConfig, ConfigContext } from "expo/config";

// Read from FIREBASE_* or fall back to NEXT_PUBLIC_FIREBASE_* (legacy Netlify env vars)
const env = (key: string): string =>
  process.env[key] ?? process.env[`NEXT_PUBLIC_${key}`] ?? "";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? "Awareday",
  slug: config.slug ?? "awareday",
  extra: {
    ...config.extra,
    firebaseApiKey: env("FIREBASE_API_KEY"),
    firebaseAuthDomain: env("FIREBASE_AUTH_DOMAIN"),
    firebaseProjectId: env("FIREBASE_PROJECT_ID"),
    firebaseAppId: env("FIREBASE_APP_ID"),
    firebaseStorageBucket: env("FIREBASE_STORAGE_BUCKET"),
    firebaseMessagingSenderId: env("FIREBASE_MESSAGING_SENDER_ID"),
    firebaseMeasurementId: env("FIREBASE_MEASUREMENT_ID"),
  },
});
