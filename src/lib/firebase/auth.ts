"use client";

import { useEffect, useState } from "react";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import { firebaseApp } from "./client";

const requiredFirebaseEnv = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

function getMissingFirebaseEnvKeys(): string[] {
  return requiredFirebaseEnv.filter((key) => !process.env[key]);
}

function getClientAuth(): Auth | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (getMissingFirebaseEnvKeys().length > 0) {
    return null;
  }

  return getAuth(firebaseApp);
}

function buildFirebaseConfigError(): Error {
  const missingKeys = getMissingFirebaseEnvKeys();

  if (missingKeys.length === 0) {
    return new Error("Firebase auth is unavailable right now.");
  }

  return new Error(
    `Firebase auth is not configured. Missing: ${missingKeys.join(", ")}`
  );
}

type AuthUserState = {
  isLoading: boolean;
  user: User | null;
};

export function useAuthUser(): AuthUserState {
  const [state, setState] = useState<AuthUserState>({
    isLoading: true,
    user: null,
  });

  useEffect(() => {
    const auth = getClientAuth();

    if (!auth) {
      setState({
        isLoading: false,
        user: null,
      });
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setState({
        isLoading: false,
        user,
      });
    });

    return unsubscribe;
  }, []);

  return state;
}

export async function signInForMvp(): Promise<void> {
  const auth = getClientAuth();

  if (!auth) {
    throw buildFirebaseConfigError();
  }

  await signInAnonymously(auth);
}

export async function signOutCurrentUser(): Promise<void> {
  const auth = getClientAuth();

  if (!auth) {
    throw buildFirebaseConfigError();
  }

  await signOut(auth);
}
