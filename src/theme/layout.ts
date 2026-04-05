import { spacing } from "./spacing";

export const layout = {
  contentMaxWidth: 980,
  compactWebWidth: 480,
  wideWebWidth: 880,
} as const;

export function getScreenHorizontalPadding(width: number, isWeb: boolean): number {
  if (!isWeb) {
    return spacing.lg;
  }

  if (width < layout.compactWebWidth) {
    return spacing.md;
  }

  if (width < layout.wideWebWidth) {
    return spacing.lg;
  }

  return spacing["2xl"];
}