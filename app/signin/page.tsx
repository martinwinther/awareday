"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { signInForMvp, useAuthUser } from "@/lib/firebase/auth";

export default function SignInPage() {
  const router = useRouter();
  const { isLoading, user } = useAuthUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/app/today");
    }
  }, [isLoading, router, user]);

  const handleSignIn = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await signInForMvp();
      router.replace("/app/today");
    } catch (error) {
      if (error instanceof FirebaseError) {
        setErrorMessage(error.message);
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unable to sign in right now. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
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

          <button
            type="button"
            className="ui-button ui-button-primary w-full"
            onClick={handleSignIn}
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting ? "Signing in..." : "Continue"}
          </button>

          <p className="text-xs text-slate-500">
            MVP auth currently uses a minimal temporary sign-in method while email auth UI is finalized.
          </p>
        </div>
      </section>
    </main>
  );
}
