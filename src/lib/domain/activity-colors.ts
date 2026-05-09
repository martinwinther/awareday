const activityColorPalette = [
  "#2b8b64",
  "#5a5ac8",
  "#b07b33",
  "#b45a2b",
  "#b24a5f",
  "#2f7ea6",
  "#7a5b8f",
  "#6f8a4c",
];

type ActivitySurfaceOptions = {
  backgroundAlpha?: number;
  borderAlpha?: number;
  textAlpha?: number;
};

export type ActivitySurface = {
  background: string;
  border: string;
  text: string;
};

function hashLabel(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export function pickActivityLabelColor(normalizedName: string): string {
  const safeName = normalizedName.trim();

  if (!safeName) {
    return activityColorPalette[0];
  }

  const hash = hashLabel(safeName);
  return activityColorPalette[hash % activityColorPalette.length];
}

export function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const normalized = value.length === 3
    ? value.split("").map((char) => `${char}${char}`).join("")
    : value;

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function buildActivitySurface(
  color: string,
  options: ActivitySurfaceOptions = {},
): ActivitySurface {
  const {
    backgroundAlpha = 0.16,
    borderAlpha = 0.5,
    textAlpha = 0.95,
  } = options;

  return {
    background: hexToRgba(color, backgroundAlpha),
    border: hexToRgba(color, borderAlpha),
    text: hexToRgba(color, textAlpha),
  };
}

export function resolveActivityLabelColor(label: { normalizedName: string; color?: string | null }): string {
  const existing = label.color?.trim();

  if (existing) {
    return existing;
  }

  return pickActivityLabelColor(label.normalizedName);
}
