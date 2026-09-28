const ROLE_PRIORITY = ["choreographer", "dancer", "instructor"] as const;

/** One self-title. Choreographer wins, then dancer, then instructor. */
export function primaryTalentLabel(values: Array<string | null | undefined> | null | undefined): string | null {
  const labels = (values ?? [])
    .flatMap((value) => (value ?? "").split(/[,·]/))
    .map((value) => value.trim().toLowerCase().replace(/_/g, " "))
    .filter(Boolean);

  for (const preferred of ROLE_PRIORITY) {
    if (labels.includes(preferred)) {
      return preferred.charAt(0).toUpperCase() + preferred.slice(1);
    }
  }

  const first = labels[0];
  if (!first) return null;
  return first.replace(/\b\w/g, (char) => char.toUpperCase());
}
