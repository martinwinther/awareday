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

## Firebase client env contract
Only Firebase Web App config values should be set in `NEXT_PUBLIC_FIREBASE_*` variables.
These values are public by design and are safe to ship to the browser.

Required client env vars:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Optional client env vars:
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

All Firebase values above are web-client config values (public by design) and are safe to use with the `NEXT_PUBLIC_` prefix.
Do not place service account JSON, admin SDK keys, private keys, access tokens, or any non-public credentials in client env vars.
Do not add `FIREBASE_PRIVATE_KEY`, `GOOGLE_APPLICATION_CREDENTIALS`, or any server-only credential in this project unless you are explicitly adding secure server code.

Firebase project checklist for current MVP foundation:
- Firebase Authentication enabled with Email/Password and Google providers on
- `localhost` added to Firebase Authentication authorized domains for local Google sign-in
- Firestore database created for the same project
- Client config values copied into `.env.local` (never commit `.env.local`)

## Deployment safety checklist
- Set the same `NEXT_PUBLIC_FIREBASE_*` values in your deployment provider for each deploy context you use.
- Ensure Firebase Authentication authorized domains include your deployed site domain.
- Ensure all required values are non-empty (`API_KEY`, `AUTH_DOMAIN`, `PROJECT_ID`, `APP_ID`) in every deploy context.
- Do not commit `.env*` files with real values.
- Run a local safety pass before deploying:

```bash
npm run verify
```

## Netlify environment variables
If deploying with Netlify, configure these variables in Netlify Site settings -> Environment variables:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- optional: `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- optional: `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- optional: `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

Set them for each active context you use (for example: Production, Deploy Previews, and Branch Deploys) so sign-in and Firestore access behave consistently.
After changing Netlify env vars, trigger a new deploy so updated values are compiled into the Next.js client bundle.

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

You can also deploy rules with an explicit project id in CI/local scripts:
```bash
firebase deploy --only firestore:rules --project <your-project-id>
```

## Firestore rules and data model alignment
Current rules enforce per-user isolation and schema checks for the same subcollections used by the repository layer:
- `activityLabels`
- `eventLabels`
- `activityEntries`
- `eventEntries`

On updates, rules keep `userId` and `createdAt` immutable, which matches current repository update calls.

