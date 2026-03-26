import Link from "next/link";

type AppLayoutProps = {
  children: React.ReactNode;
};

const appNavItems = [
  { href: "/app/today", label: "Today" },
  { href: "/app/history", label: "History" },
  { href: "/app/settings", label: "Settings" },
] as const;

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="app-shell">
      <div className="app-frame">
        <header className="app-header">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Awareday</p>
          <div className="flex items-end justify-between gap-3">
            <h1 className="text-xl font-semibold text-slate-900">Today</h1>
            <p className="text-xs text-slate-500">Thu, Mar 26</p>
          </div>
        </header>

        <main className="app-content">{children}</main>

        <nav className="app-nav" aria-label="Primary">
          {appNavItems.map((item) => (
            <Link key={item.href} href={item.href} className="ui-button ui-button-ghost h-10 text-xs">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

