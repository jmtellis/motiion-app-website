import { CREATIVE_HEADSHOT_PATHS } from "@/lib/marketing/creative-headshots";
import { mockNavigatorTalent } from "@/lib/talent-navigator/mock-data";
import type { Talent, TalentRow } from "@/lib/talent-navigator/types";

export type NavigatorDemoDirection = "row-up" | "row-down" | "col-left" | "col-right";

export type NavigatorPreviewDemoAction = NavigatorDemoDirection | "open-details";

/** One-shot demo: down 2 → left 2 → down 2 → right 1 → details (hold). */
export const NAVIGATOR_PREVIEW_DEMO_PATH: NavigatorPreviewDemoAction[] = [
  "row-down",
  "row-down",
  "col-left",
  "col-left",
  "row-down",
  "row-down",
  "col-right",
  "open-details",
];

/** Resolve the ending grid focus for reduced-motion / final frame. */
export function getPreviewDemoFinalFocus(
  path: NavigatorPreviewDemoAction[],
  rowCount: number,
  colCount: number,
  rowIds: string[],
): { rowIndex: number; colIndex: number } {
  let rowIndex = 0;
  const colByRowId: Record<string, number> = {};

  for (const action of path) {
    if (action === "open-details") break;
    if (action === "row-down") rowIndex = (rowIndex + 1) % rowCount;
    if (action === "row-up") rowIndex = (rowIndex - 1 + rowCount) % rowCount;

    const rowId = rowIds[rowIndex];
    if (action === "col-right") {
      const base = colByRowId[rowId] ?? 0;
      colByRowId[rowId] = (base + 1) % colCount;
    }
    if (action === "col-left") {
      const base = colByRowId[rowId] ?? 0;
      colByRowId[rowId] = (base - 1 + colCount) % colCount;
    }
  }

  const rowId = rowIds[rowIndex] ?? rowIds[0];
  return { rowIndex, colIndex: colByRowId[rowId] ?? 0 };
}

const PREVIEW_ROW_META = [
  { id: "preview-row-commercial", label: "Commercial / Hip-Hop" },
  { id: "preview-row-contemporary", label: "Contemporary / Jazz" },
  { id: "preview-row-recommended", label: "Recommended near you" },
] as const;

const COLS_PER_ROW = 14;

function buildPreviewTalentPool(): Talent[] {
  const sources = [...CREATIVE_HEADSHOT_PATHS];

  return sources.map((imageUrl, index) => {
    const template = mockNavigatorTalent[index % mockNavigatorTalent.length];
    return {
      ...template,
      id: `preview-talent-${index + 1}`,
      slug: `preview-talent-${index + 1}`,
      imageUrl,
    };
  });
}

/** Mock navigator rows for the homepage product preview. */
export function buildPreviewTalentRows(): TalentRow[] {
  const pool = buildPreviewTalentPool();
  if (!pool.length) return [];

  return PREVIEW_ROW_META.map((row, rowIndex) => ({
    id: row.id,
    label: row.label,
    talent: Array.from({ length: COLS_PER_ROW }, (_, colIndex) => {
      const globalIndex = (rowIndex * COLS_PER_ROW + colIndex) % pool.length;
      const base = pool[globalIndex];
      return {
        ...base,
        id: `${row.id}-${colIndex + 1}`,
        slug: `${row.id}-${colIndex + 1}`,
      };
    }),
  }));
}
