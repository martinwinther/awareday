"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { signOutCurrentUser, useAuthUser } from "@/lib/firebase/auth";

type AppLayoutProps = {
  children: React.ReactNode;
};

const appNavItems = [
  { href: "/app/today", label: "Today" },
  { href: "/app/history", label: "History" },
  { href: "/app/settings", label: "Settings" },
] as const;

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading, user } = useAuthUser();
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(new Date()),
    [],
  );

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/signin");
    }
  }, [isLoading, router, user]);

  const handleSignOut = async () => {
    setSignOutError(null);

    try {
      await signOutCurrentUser();
      router.replace("/signin");
    } catch (error) {
      if (error instanceof FirebaseError) {
        setSignOutError(error.message);
      } else {
        setSignOutError("Could not sign out. Please try again.");
      }
    }
  };

  if (isLoading || !user) {
    return (
      <div className="app-shell">
        <div className="app-frame justify-center p-5">
          <div className="ui-card text-center">
            <p className="text-sm text-slate-600">Checking your session...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="app-frame">
        <header className="app-header">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Awareday</p>
            <button type="button" className="ui-button ui-button-ghost h-9 px-3" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
          <div className="flex items-end justify-between gap-3">
            <h1 className="text-xl font-semibold text-slate-900">Your log</h1>
            <p className="text-xs text-slate-500">{todayLabel}</p>
          </div>
          {signOutError ? <p className="text-xs text-rose-600">{signOutError}</p> : null}
        </header>

        <main className="app-content">{children}</main>

        <nav className="app-nav" aria-label="Primary">
          {appNavItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`ui-button h-10 text-xs ${isActive ? "ui-button-primary" : "ui-button-ghost"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
