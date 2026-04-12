/**
 * Awareday color palette — warm, neutral, approachable.
 */

export const colors = {
  // Primary warm sand background
  background: "#f3e9dc",
  backgroundLight: "#fcf7f0",
  backgroundCard: "#fff8f0",
  backgroundSoft: "#f8eddd",
  backgroundMuted: "#ece0cf",
  backgroundRaisedWarm: "#fffaf3",
  backgroundRaisedTint: "#fffbf7",
  backgroundAmberSoft: "#fff8ef",

  // Amber accent scale
  amber900: "#6a3e1c",
  amber800: "#865630",
  amber700: "#9a6f48",
  amber600: "#b07b33",
  amber500: "#cb8d44",
  amber300: "#cfab81",
  amber200: "#e4ccb0",
  amber100: "#f2e3d0",

  // Stone neutrals
  stone900: "#261d18",
  stone800: "#342923",
  stone700: "#4a3d35",
  stone600: "#615148",
  stone500: "#827166",
  stone400: "#aa9a8f",

  // Semantic: activity states
  emerald600: "#2b8b64",
  emerald50: "#e9f5ee",

  // Semantic: events
  indigo600: "#5a5ac8",
  indigo50: "#eeefff",

  // Semantic: errors
  rose700: "#b24a5f",
  rose200: "#f2c8cf",
  rose50: "#faecee",

  // Semantic: warnings
  orange700: "#b45a2b",

  // Borders and dividers
  borderLight: "rgba(228, 204, 176, 0.64)",
  borderAmber: "rgba(214, 179, 137, 0.8)",
  borderAmberStrong: "rgba(232, 207, 169, 0.9)",
  borderAmberSoft: "rgba(232, 207, 169, 0.7)",
  divider: "rgba(214, 179, 137, 0.48)",

  // Surface accents
  eventPillBackground: "rgba(238, 239, 255, 0.95)",
  eventPillBorder: "rgba(90, 90, 200, 0.85)",
  scheduleNowLine: "rgba(154, 111, 72, 0.78)",
  scheduleNowPillBackground: "rgba(255, 248, 240, 0.96)",
  scheduleNowPillBorder: "rgba(154, 111, 72, 0.42)",
  overlayBackdrop: "rgba(15, 23, 42, 0.42)",

  // Elevation shadows
  shadowCard: "rgba(68, 44, 24, 0.28)",
  shadowElevated: "rgba(63, 42, 26, 0.32)",
  shadowTabBar: "rgba(94, 66, 48, 0.2)",

  // Tab bar
  tabBarBackground: "#faf0e4",
  tabBarBorder: "rgba(214, 179, 137, 0.82)",
  tabBarGlassTint: "rgba(255, 249, 241, 0.5)",
  tabInactive: "#615148",
  tabActive: "#1c1917",
  tabActiveBackground: "rgba(255, 245, 228, 0.8)",
  tabActivePill: "rgba(249, 236, 214, 0.9)",
  tabActiveMarker: "#b07b33",
  tabIndicatorActive: "#b07b33",
  tabIndicatorInactive: "#cfab81",

  // Transparent overlays
  white: "#fff8f1",
  transparent: "transparent",
} as const;
