"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { signInForMvp, useAuthUser } from "@/lib/firebase/auth";

function getSignInErrorMessage(error: unknown): string {
  if (!(error instanceof FirebaseError)) {
    if (error instanceof Error) {
      return error.message;
    }

    return "Unable to sign in right now. Please try again.";
  }

  switch (error.code) {
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/invalid-credential":
      return "Email or password is incorrect.";
    case "auth/email-already-in-use":
      return "That email is already in use. Try signing in instead.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 6 characters.";
    case "auth/popup-closed-by-user":
      return "Google sign-in was closed before completion.";
    case "auth/popup-blocked":
      return "Google sign-in popup was blocked by the browser.";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled in Firebase Authentication.";
    case "auth/unauthorized-domain":
      return "This app domain is not authorized for Google sign-in in Firebase.";
    default:
      return error.message;
  }
}

export default function SignInPage() {
  const router = useRouter();
  const { isLoading, user } = useAuthUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/app/today");
    }
  }, [isLoading, router, user]);

  const handleEmailSignIn = async (intent: "signin" | "signup") => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await signInForMvp({
        method: "email",
        email: emailInput,
        password: passwordInput,
        intent,
      });
      router.replace("/app/today");
    } catch (error) {
      setErrorMessage(getSignInErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await signInForMvp({ method: "google" });
      router.replace("/app/today");
    } catch (error) {
      setErrorMessage(getSignInErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await handleEmailSignIn("signin");
  };

  return (
    <main className="app-shell">
      <section className="app-frame justify-center p-5">
        <div className="ui-card space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Awareday</p>
            <h1 className="text-2xl font-semibold text-slate-900">Sign in to log your day</h1>
            <p className="text-sm text-slate-600">
              Capture what started, what ended, and what happened in a clean daily timeline.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 text-sm text-slate-600">
            <div className="rounded-xl bg-slate-50 px-3 py-2">Fast mobile-first logging</div>
            <div className="rounded-xl bg-slate-50 px-3 py-2">Activity totals from timestamps</div>
            <div className="rounded-xl bg-slate-50 px-3 py-2">Daily event counts and history</div>
          </div>

          {errorMessage ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMessage}
            </p>
          ) : null}

          <form className="space-y-3" onSubmit={handleEmailSubmit}>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600">Email</span>
              <input
                type="email"
                className="ui-input w-full"
                value={emailInput}
                onChange={(event) => setEmailInput(event.target.value)}
                autoComplete="email"
                disabled={isSubmitting || isLoading}
                required
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600">Password</span>
              <input
                type="password"
                className="ui-input w-full"
                value={passwordInput}
                onChange={(event) => setPasswordInput(event.target.value)}
                autoComplete="current-password"
                disabled={isSubmitting || isLoading}
                required
              />
            </label>

            <button
              type="submit"
              className="ui-button ui-button-primary w-full"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? "Signing in..." : "Sign in with email"}
            </button>

            <button
              type="button"
              className="ui-button ui-button-ghost w-full"
              disabled={isSubmitting || isLoading}
              onClick={() => void handleEmailSignIn("signup")}
            >
              Create account with email
            </button>
          </form>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs uppercase tracking-wide text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            className="ui-button ui-button-ghost w-full"
            onClick={() => void handleGoogleSignIn()}
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting ? "Signing in..." : "Continue with Google"}
          </button>

          <p className="text-xs text-slate-500">Use email/password or Google to sign in for MVP.</p>
        </div>
      </section>
    </main>
  );
}
