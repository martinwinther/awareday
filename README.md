# Awareday

Awareday is a mobile-first web app for logging daily activities and one-off events with timestamps, so users can understand where their time goes and notice recurring habits.

## MVP focus
- Sign in with Firebase Authentication
- Log activity `start` and `end` entries (including overlapping activities)
- Log one-off event entries
- Edit logged entries
- Show open activities
- Show daily activity totals (derived from matched start/end entries)
- Show daily event counts
- Show a chronological daily log
- Support both free-text input and reusable quick-action labels/buttons

## Product rules
- Timestamp logger first, not a live timer-first app
- Activities and events stay separate concepts
- Activity duration is derived from raw `start`/`end` entries

## Planned stack
- Next.js
- TypeScript
- Tailwind CSS
- Firebase Authentication
- Firestore

## Default routes
- `/signin`
- `/app`
- `/app/today`
- `/app/history`
- `/app/settings`

## Data shape direction
Per-user Firestore subcollections:
- `users/{userId}/activityLabels`
- `users/{userId}/eventLabels`
- `users/{userId}/activityEntries`
- `users/{userId}/eventEntries`

## Status
Project planning and architecture documents live in `docs/` (gitignored in this repo).

Minimal project foundation is in place:
- Next.js App Router scaffold
- TypeScript configuration
- Tailwind CSS setup
- ESLint + Prettier configuration
- Firebase client app initialization scaffold (env-driven)

## Local setup
```bash
npm install
cp .env.example .env.local
npm run dev
```

