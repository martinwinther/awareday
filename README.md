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

Fill `.env.local` with your Firebase Web App config from Project settings.

Required for this app:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Optional (supported by the config loader):
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

Firebase project checklist for current MVP foundation:
- Firebase Authentication enabled with Email/Password and Google providers on
- `localhost` added to Firebase Authentication authorized domains for local Google sign-in
- Firestore database created for the same project
- Client config values copied into `.env.local` (never commit `.env.local`)

## Firestore security rules
This repository uses strict per-user Firestore rules for these collections:
- `users/{userId}/activityLabels`
- `users/{userId}/eventLabels`
- `users/{userId}/activityEntries`
- `users/{userId}/eventEntries`

Rules are defined in `firestore.rules` and linked in `firebase.json`.

Apply rules to your Firebase project (with Firebase CLI configured):
```bash
firebase use <your-project-id>
firebase deploy --only firestore:rules
```

