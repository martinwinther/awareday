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
  { href: "/app/today", label: "Today", subtitle: "Capture the day as it unfolds." },
  { href: "/app/history", label: "History", subtitle: "Review any day in a calm timeline." },
  { href: "/app/settings", label: "Settings", subtitle: "Manage your reusable quick labels." },
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

  const activeNavItem = useMemo(
    () => appNavItems.find((item) => pathname.startsWith(item.href)) ?? appNavItems[0],
    [pathname],
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
            <p className="text-sm text-stone-600">Checking your session...</p>
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
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-600">Awareday</p>
            </div>
            <button type="button" className="ui-button ui-button-ghost h-9 px-3 text-xs" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
          <div className="space-y-1">
            <div className="flex items-end justify-between gap-3">
              <h1 className="text-[1.45rem] font-semibold leading-tight text-stone-900">{activeNavItem.label}</h1>
              <p className="rounded-full border border-amber-200 bg-[#fff8ee] px-2.5 py-1 text-[11px] font-medium text-stone-600">
                {todayLabel}
              </p>
            </div>
            <p className="text-xs leading-relaxed text-stone-500">
              {activeNavItem.subtitle}
            </p>
          </div>
          {signOutError ? <p className="text-xs text-rose-700">{signOutError}</p> : null}
        </header>

        <main className="app-content">{children}</main>

        <nav className="app-nav" aria-label="Primary">
          {appNavItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`app-nav-link ${isActive ? "app-nav-link-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-amber-600" : "bg-amber-300"}`}
                    aria-hidden
                  />
                  <span>{item.label}</span>
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
