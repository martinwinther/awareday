"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthUser } from "@/lib/firebase/auth";

export default function HomePage() {
  const router = useRouter();
  const { isLoading, user } = useAuthUser();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    router.replace(user ? "/app/today" : "/signin");
  }, [isLoading, router, user]);

  return (
    <main className="app-shell">
      <section className="app-frame justify-center p-5">
        <div className="ui-card text-center">
          <p className="text-sm text-stone-600">Loading Awareday...</p>
        </div>
      </section>
    </main>
  );
}
