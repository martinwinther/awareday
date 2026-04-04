import { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import { getFirebaseApp, isFirebaseConfigured } from "./client";

function getClientAuth(): Auth | null {
  if (!isFirebaseConfigured()) {
    return null;
  }

  return getAuth(getFirebaseApp());
}

type AuthUserState = {
  user: User | null;
  loading: boolean;
};

type EmailSignInInput = {
  method: "email";
  email: string;
  password: string;
  intent: "signin" | "signup";
};

type GoogleSignInInput = {
  method: "google";
};

export type MvpSignInInput = EmailSignInInput | GoogleSignInInput;

export function useAuthUser(): AuthUserState {
  const [state, setState] = useState<AuthUserState>({
    user: null,
    loading: true,
  });

  useEffect(() => {
    const auth = getClientAuth();

    if (!auth) {
      setState({ user: null, loading: false });
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setState({ user, loading: false });
    });

    return unsubscribe;
  }, []);

  return state;
}

export async function signInForMvp(input: MvpSignInInput): Promise<void> {
  const auth = getClientAuth();

  if (!auth) {
    throw new Error("Firebase auth is not configured.");
  }

  if (input.method === "google") {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    return;
  }

  const email = input.email.trim();

  if (email.length === 0) {
    throw new Error("Enter an email address.");
  }

  if (input.password.length === 0) {
    throw new Error("Enter a password.");
  }

  if (input.intent === "signup") {
    await createUserWithEmailAndPassword(auth, email, input.password);
    return;
  }

  await signInWithEmailAndPassword(auth, email, input.password);
}

export async function signOutCurrentUser(): Promise<void> {
  const auth = getClientAuth();

  if (!auth) {
    throw new Error("Firebase auth is not configured.");
  }

  await signOut(auth);
}
