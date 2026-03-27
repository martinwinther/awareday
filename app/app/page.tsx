import Link from "next/link";

export default function AppOverviewPage() {
  return (
    <section className="ui-section">
      <article className="ui-card space-y-2">
        <h2 className="text-base font-semibold text-slate-900">Welcome back</h2>
        <p className="text-sm text-slate-600">
          You are signed in. Use Today to capture activities and events quickly.
        </p>
        <Link href="/app/today" className="ui-button ui-button-primary w-full">
          Go to today
        </Link>
      </article>

      <article className="ui-card space-y-2">
        <p className="ui-section-title">Coming in next steps</p>
        <ul className="space-y-1 text-sm text-slate-600">
          <li>Static placeholders will become real activity and event actions.</li>
          <li>Daily totals and timeline will be derived from timestamped entries.</li>
          <li>Firestore persistence and editing flows will be wired in later tasks.</li>
        </ul>
      </article>
    </section>
  );
}
