const whitespacePattern = /\s+/g;

export function cleanLabelName(value: string): string {
  return value.trim().replace(whitespacePattern, " ");
}

export function normalizeLabelName(value: string): string {
  return cleanLabelName(value).toLocaleLowerCase();
}
