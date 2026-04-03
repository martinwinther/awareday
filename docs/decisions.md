# Architecture Decisions

## 2026-04-03: Firebase config via Expo Constants (app.json extra)

**Decision:** Read Firebase client config from `Constants.expoConfig.extra` in `app.json` rather than environment variables.

**Why:**
- Expo does not support `process.env` for client config.
- `expo-constants` is bundled with Expo and provides build-time config.
- For per-environment config, `app.json` can become `app.config.ts` later.

## 2026-04-03: Domain logic in src/lib/domain/

**Decision:** All pure domain logic (models, derivation helpers, label normalization) lives in `src/lib/domain/` with a barrel export at `src/lib/domain/index.ts`.

**Why:**
- Keeps business rules isolated from UI and Firebase infrastructure.
- Pure functions are easy to test with Vitest (no mocking needed).
- The barrel export provides a clean import surface for screens and hooks.

**What lives in src/lib/domain/:**
- `models.ts` — domain types (ActivityEntry, EventEntry, labels, etc.)
- `normalize-label.ts` — label text normalization
- `local-day.ts` — date boundary helpers
- `derive-activity-totals.ts` — session pairing + daily totals
- `derive-daily-event-counts.ts` — event counting
- `derive-open-activities.ts` — open activity detection
- `derive-single-day-calendar-items.ts` — calendar layout derivation
- `derive-today-timeline.ts` — timeline merging
- All test files and fixtures

## 2026-04-03: StyleSheet + theme module for visual design

**Decision:** Use React Native's `StyleSheet` API with a centralized theme module (`src/theme/`) rather than a CSS-in-JS or Tailwind-for-RN library.

**Why:**
- Raw `StyleSheet` is simple and has zero runtime overhead.
- The theme module captures the palette (warm amber/stone tones) as explicit constants.
- Screen structures use native conventions (safe area insets, platform-specific shadows).

## 2026-04-03: Expo Router for navigation

**Decision:** Use Expo Router (file-based routing) instead of standalone React Navigation config.

**Why:**
- Expo Router is the Expo team's recommended approach and is built on React Navigation.
- File-based routing keeps the route structure visible in the directory layout.
- Typed routes are enabled via `experiments.typedRoutes` in `app.json`.
