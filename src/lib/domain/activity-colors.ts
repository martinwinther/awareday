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

export function resolveActivityLabelColor(label: { normalizedName: string; color?: string | null }): string {
  const existing = label.color?.trim();

  if (existing) {
    return existing;
  }

  return pickActivityLabelColor(label.normalizedName);
}
