# Awareday

Awareday is a mobile-first web app for logging daily activities and one-off events with timestamps, so users can understand where their time goes and notice recurring habits.

## MVP feature set
- Firebase-authenticated app access
- Activity logging as raw `start` / `end` timestamp entries
- Event logging as one-off timestamp entries
- Editing and deleting logged activity/event entries
- Reusable quick-action labels (plus free-text logging)
- Overlapping activities support
- Daily activity totals derived from matched start/end pairs
- Daily event counts
- Chronological daily timeline

## Product guardrails
- Awareday is a timestamp logger, not a live timer-first app.
- Activities and events are separate concepts.
- Activity duration is always derived from raw entries.

## Tech stack
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Firebase Authentication (Email/Password and Google)
- Firestore
- Vitest (unit tests for derivation helpers)

## Repository layout
- `app/` - Next.js routes and UI components
- `src/lib/firebase/` - Firebase app/auth/firestore client setup
- `src/lib/firestore/` - models, repositories, derivation helpers, tests
- `firestore.rules` - Firestore security rules
- `firebase.json` - Firebase rules deployment mapping
- `docs/` - product/architecture guidance (gitignored but used in this repo)

## Routes
- `/signin`
- `/app`
- `/app/today`
- `/app/history`
- `/app/settings`

## Local setup
Prerequisites:
- Node.js 20+
- npm
- Firebase project with Authentication + Firestore enabled

Install and run:
```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment variables
Fill `.env.local` with Firebase Web App config values from Firebase Console -> Project settings -> General -> Your apps.

Required:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Optional:
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

These are web client config values (public by design) and should use the `NEXT_PUBLIC_` prefix.
Never put server-only credentials (service account JSON, private keys, access tokens) in client env vars.

## Firebase and Firestore setup expectations
For current app behavior, your Firebase project should have:
- Authentication enabled with `Email/Password` and `Google`
- Authorized domains including `localhost` and your deployed site domain
- Firestore database created in the same project

Current Firestore collections are per-user subcollections under `users/{userId}`:
- `activityLabels`
- `eventLabels`
- `activityEntries`
- `eventEntries`

## Scripts
```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
npm run verify
```

`npm run verify` runs `lint + typecheck + test + build` and is the recommended pre-deploy check.

## Firestore security rules
Rules are defined in `firestore.rules` and wired in `firebase.json`.

Deploy rules with Firebase CLI:
```bash
firebase use <your-project-id>
firebase deploy --only firestore:rules
```

Or with explicit project id:
```bash
firebase deploy --only firestore:rules --project <your-project-id>
```

Rules currently enforce:
- authenticated, per-user isolation (`request.auth.uid == userId`)
- strict document shapes for labels and entries
- immutable `userId` and `createdAt` on updates

## Netlify deployment notes
Set the same Firebase client env vars in Netlify Site settings -> Environment variables:
- required: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`
- optional: `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

Set values for each active context you use (Production, Deploy Previews, Branch Deploys).
After changing env vars, trigger a new deploy so Next.js rebuilds the client bundle with updated values.

Before deploying:
```bash
npm run verify
```

## Secret safety
- Do not commit `.env*` files with real values.
- Do not commit service account files or private keys.
- Treat credentials as blocking issues during review.
