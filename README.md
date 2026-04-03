# Awareday

Awareday is a mobile app for logging daily activities and one-off events with timestamps, so users can understand where their time goes and notice recurring habits.

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

- Expo (React Native)
- TypeScript (strict mode)
- Expo Router (file-based routing)
- Firebase Authentication (Email/Password and Google)
- Firestore
- Vitest (unit tests for domain logic)

## Prerequisites

- Node.js 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npx expo`)
- iOS Simulator (macOS) or Android Emulator, or Expo Go on a physical device

## Setup

```bash
npm install
```

### Firebase configuration

Add your Firebase config to `app.json` under `expo.extra`:

```json
{
  "expo": {
    "extra": {
      "firebaseApiKey": "your-api-key",
      "firebaseAuthDomain": "your-project.firebaseapp.com",
      "firebaseProjectId": "your-project-id",
      "firebaseAppId": "your-app-id"
    }
  }
}
```

These are Firebase web client config values (public by design). Do not put server-only credentials here.

For per-environment config, convert `app.json` to `app.config.ts` and read from environment variables.

## Running

```bash
npx expo start          # Start dev server
npx expo start --ios    # Open in iOS Simulator
npx expo start --android # Open in Android Emulator
```

Press `i` for iOS or `a` for Android in the terminal after starting.

## Project structure

```
├── app/                        # Expo Router file-based routes
│   ├── _layout.tsx             # Root layout (status bar, navigation stack)
│   ├── sign-in.tsx             # Sign-in screen
│   ├── +not-found.tsx          # 404 fallback
│   └── (tabs)/                 # Bottom tab navigator
│       ├── _layout.tsx         # Tab bar config
│       ├── index.tsx           # Today (default tab)
│       ├── history.tsx         # History
│       └── settings.tsx        # Settings
├── src/
│   ├── lib/
│   │   ├── domain/             # Pure domain logic
│   │   │   ├── models.ts       # Domain types
│   │   │   ├── normalize-label.ts
│   │   │   ├── local-day.ts
│   │   │   ├── derive-*.ts     # Derivation helpers
│   │   │   ├── index.ts        # Barrel export
│   │   │   └── *.test.ts       # Tests
│   │   ├── firebase/           # Firebase init, auth hook, Firestore singleton
│   │   └── firestore/          # Firestore paths and repositories
│   ├── components/             # Shared React Native UI components
│   └── theme/                  # Color palette, spacing, typography tokens
├── assets/                     # Fonts, icons, splash images
├── app.json                    # Expo configuration
├── firebase.json               # Firebase rules deployment mapping
├── firestore.rules             # Firestore security rules
├── vitest.config.ts            # Test runner config
├── package.json
└── tsconfig.json
```

## Scripts

```bash
npm start           # Start Expo dev server
npm run ios         # Start on iOS Simulator
npm run android     # Start on Android Emulator
npm run typecheck   # TypeScript type checking
npm test            # Run tests
npm run test:watch  # Run tests in watch mode
```

## Firebase and Firestore setup

Your Firebase project should have:
- Authentication enabled with `Email/Password` and `Google`
- Authorized domains including `localhost`
- Firestore database created in the same project

Firestore collections are per-user subcollections under `users/{userId}`:
- `activityLabels`
- `eventLabels`
- `activityEntries`
- `eventEntries`

## Firestore security rules

Rules are defined in `firestore.rules` and wired in `firebase.json`.

Deploy rules with Firebase CLI:
```bash
firebase deploy --only firestore:rules --project <your-project-id>
```

Rules enforce:
- Authenticated, per-user isolation (`request.auth.uid == userId`)
- Strict document shapes for labels and entries
- Immutable `userId` and `createdAt` on updates

## Secret safety

- Do not commit `.env*` files with real values.
- Do not commit service account files or private keys.
- Firebase client config in `app.json` is public by design (same as web API keys).
