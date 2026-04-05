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

## 2026-04-04: Signature mobile UI pass for Today, Sign-in, and History

**Decision:** Apply a focused design refinement to the three highest-impact surfaces with a warm editorial tone and stronger interaction hierarchy, while keeping all logging/auth/history behavior unchanged.

**Why:**
- These surfaces define first impression and daily repeat usage, so visual clarity and emotional tone directly affect retention.
- The product direction calls for calm, mindful, mobile-first interactions that avoid generic component-library aesthetics.
- A shared token and component refresh keeps implementation small while improving consistency across the app.

**Consequences:**
- Today now presents quick logging as a clearer staged interaction (activity lane + event lane).
- Sign-in communicates value more clearly before auth actions.
- History day schedule is easier to scan with a clearer time axis, dedicated event rail, and stronger day navigation hierarchy.
- Future UI work should build on the updated palette and shared component primitives for consistency.

## 2026-04-04: Layout rhythm arrangement pass

**Decision:** Refine spatial hierarchy by introducing a slightly expanded spacing scale (`4xl`), shared control-height tokens, and grouped summary structures on Today and History to reduce repetitive card rhythm.

**Why:**
- The previous structure repeated equal-spacing cards too uniformly, which weakened hierarchy and made secondary sections compete for attention.
- Grouping related data (activity totals + event counts) into single summary clusters creates tighter local rhythm while preserving generous separation between primary interaction zones.

**Consequences:**
- Today and History now use tighter intra-group spacing with clearer inter-group breathing room.
- Touch target sizing and control heights are more consistent via shared `controlSize` tokens.
- Future layout changes should prefer grouped section composition over adding additional same-weight cards.

- Date: 2026-04-05
- Decision: Add a responsive adaptation pass for Today, History, and Settings with width-aware horizontal spacing, larger tap targets, and a two-column quick-log layout on wide screens.
- Reason: The app must support phone web, native iOS/Android, and desktop web while prioritizing one-handed on-the-go logging.
- Consequences: Small-screen web layouts now preserve usable content width, key compact controls meet touch-target guidance more consistently, and desktop web gets denser side-by-side quick actions without changing logging behavior.

- Date: 2026-04-05
- Decision: Optimize startup and Today data loading by removing an unused font-gated splash path and replacing unbounded activity reads with a recent-day query window.
- Reason: Startup rendering was blocked on an unused font asset, and Today fetched full activity history regardless of day scope, which scales poorly as logs grow.
- Consequences: Initial render no longer waits on unused font loading, Today now reads a bounded recent activity window (14 days) for faster Firestore responses on long-lived accounts, and History schedule rendering avoids redundant width state updates.

- Date: 2026-04-05
- Decision: Normalize tab-screen presentation to shared design-system primitives by introducing theme layout helpers and replacing one-off tab-screen color literals with semantic tokens.
- Reason: Responsive spacing and max-width behavior were duplicated across screens, and several UI surfaces used hard-coded values outside the token system.
- Consequences: Today, History, Settings, and shared headers now use one consistent content-width/padding model, tab-screen colors are easier to maintain from the theme, and future screen work can reuse established layout and token patterns instead of adding one-offs.

- Date: 2026-04-05
- Decision: Apply a flagship-level polish pass focused on interaction accessibility metadata and semantic elevation tokens.
- Reason: The feature set was functionally complete, but icon-heavy and compact controls still had uneven screen-reader affordance and elevation colors were still partly one-off.
- Consequences: Primary account, label, and timeline actions now expose clearer accessibility labels and hints across screens, and core elevated surfaces use shared theme shadow tokens for more consistent visual behavior.
