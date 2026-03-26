const quickActivities = ["Deep work", "Walking", "Cleaning", "Cooking"] as const;
const quickEvents = ["Coffee", "Water", "Snack", "Stretch"] as const;

export default function TodayPage() {
  return (
    <div className="space-y-4">
      <section className="ui-card ui-section">
        <p className="ui-section-title">New entry</p>
        <input className="ui-input" placeholder="Type an activity or event label" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button type="button" className="ui-button ui-button-success w-full">
            Start activity
          </button>
          <button type="button" className="ui-button ui-button-warning w-full">
            End activity
          </button>
          <button type="button" className="ui-button ui-button-primary w-full">
            Log event
          </button>
        </div>
      </section>

      <section className="ui-card ui-section">
        <p className="ui-section-title">Quick activities</p>
        <div className="flex flex-wrap gap-2">
          {quickActivities.map((label) => (
            <button key={label} type="button" className="ui-chip">
              {label}
            </button>
          ))}
          <button type="button" className="ui-chip ui-chip-muted">
            + Add label
          </button>
        </div>
      </section>

      <section className="ui-card ui-section">
        <p className="ui-section-title">Quick events</p>
        <div className="flex flex-wrap gap-2">
          {quickEvents.map((label) => (
            <button key={label} type="button" className="ui-chip">
              {label}
            </button>
          ))}
          <button type="button" className="ui-chip ui-chip-muted">
            + Add label
          </button>
        </div>
      </section>

      <section className="ui-card ui-section">
        <p className="ui-section-title">Open activities</p>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
            <span className="font-medium text-slate-800">Deep work</span>
            <span className="text-slate-500">Started 9:12 AM</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
            <span className="font-medium text-slate-800">Walking</span>
            <span className="text-slate-500">Started 12:41 PM</span>
          </div>
        </div>
      </section>

      <section className="ui-card ui-section">
        <p className="ui-section-title">Today summary</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-slate-50 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Activities</p>
            <p className="mt-1 font-semibold text-slate-800">3h 40m logged</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Events</p>
            <p className="mt-1 font-semibold text-slate-800">7 total today</p>
          </div>
        </div>
      </section>

      <section className="ui-card ui-section">
        <p className="ui-section-title">Recent timeline</p>
        <ol className="space-y-2 text-sm text-slate-700">
          <li className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
            <span>Log event: Coffee</span>
            <span className="text-slate-500">2:10 PM</span>
          </li>
          <li className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
            <span>End activity: Walking</span>
            <span className="text-slate-500">1:24 PM</span>
          </li>
          <li className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
            <span>Start activity: Deep work</span>
            <span className="text-slate-500">9:12 AM</span>
          </li>
        </ol>
      </section>
    </div>
  );
}

