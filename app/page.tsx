import Link from "next/link";

export default function HomePage() {
  return (
    <main className="app-shell">
      <section className="app-frame justify-center p-5">
        <div className="ui-card space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Awareday</p>
          <h1 className="text-2xl font-semibold text-slate-900">Log your day in seconds.</h1>
          <p className="text-sm text-slate-600">
            Awareday is a mobile-first timestamp logger for activities and one-off events.
          </p>
          <div className="space-y-2">
            <Link href="/app/today" className="ui-button ui-button-primary w-full">
              Open today view
            </Link>
            <Link href="/app" className="ui-button ui-button-ghost w-full">
              Preview app shell
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
