/** Adapt current iOS project columns to the web presentation model.
 * Canonical abilities are the project_abilities relation; legacy JSON remains a
 * read fallback for older web projects. This does not write or migrate records.
 */
export function normalizeProjectContract<T extends { is_composable?: boolean | null; is_active?: boolean | null; updated_at?: string | null; project_abilities?: { ability: string }[] | null; project_configuration?: unknown; enabled_modules?: unknown }>(row: T) {
  if (!row.is_composable) return row;
  const configuration = row.project_configuration && typeof row.project_configuration === "object" ? row.project_configuration as Record<string, unknown> : {};
  const previous = configuration.composable && typeof configuration.composable === "object" ? configuration.composable as Record<string, unknown> : {};
  const paused = Array.isArray(previous.paused) ? previous.paused.filter((id): id is string => typeof id === "string") : [];
  const abilities = new Set((row.project_abilities ?? []).map((item) => item.ability));
  // A removed canonical ability stays visible as paused only when this browser's
  // saved project metadata explicitly records a pause. Existing data is retained.
  const modules = Object.fromEntries(["casting", "roster", "classes"].map((id) => [id, abilities.has(id) || paused.includes(id)]));
  return { ...row, enabled_modules: { ...modules, activities: modules.classes }, project_configuration: { ...configuration, composable: { ...previous, version: 1, paused: paused.filter((id) => !abilities.has(id)), archived_at: row.is_active === false ? previous.archived_at || row.updated_at || "archived" : null } } };
}
