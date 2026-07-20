/**
 * Pure helpers for all/any credit entity matching (unit-testable).
 */
export function talentMatchesAllEntities(
  rows: Array<{
    artist_entity_id: string | null;
    choreographer_entity_id: string | null;
    production_entity_id: string | null;
  }>,
  artistIds: string[],
  choreographerIds: string[],
  productionIds: string[],
): boolean {
  const hasArtist =
    artistIds.length === 0 ||
    artistIds.every((id) => rows.some((row) => row.artist_entity_id === id));
  const hasChoreo =
    choreographerIds.length === 0 ||
    choreographerIds.every((id) => rows.some((row) => row.choreographer_entity_id === id));
  const hasProduction =
    productionIds.length === 0 ||
    productionIds.every((id) => rows.some((row) => row.production_entity_id === id));
  return hasArtist && hasChoreo && hasProduction;
}

export function talentMatchesAnyEntity(
  rows: Array<{
    artist_entity_id: string | null;
    choreographer_entity_id: string | null;
    production_entity_id: string | null;
  }>,
  artistIds: string[],
  choreographerIds: string[],
  productionIds: string[],
): boolean {
  const entityIds = [...artistIds, ...choreographerIds, ...productionIds];
  if (!entityIds.length) return true;
  return rows.some(
    (row) =>
      (row.artist_entity_id && artistIds.includes(row.artist_entity_id)) ||
      (row.choreographer_entity_id && choreographerIds.includes(row.choreographer_entity_id)) ||
      (row.production_entity_id && productionIds.includes(row.production_entity_id)),
  );
}
