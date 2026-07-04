/** Parse iOS profiles.styles / profiles.skills jsonb into text arrays. */
export function jsonbToStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.values(value as Record<string, unknown>)
      .map((item) => String(item).trim())
      .filter(Boolean);
  }
  return [];
}

export function textToStringArray(value: string | null | undefined): string[] | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return [trimmed];
}
