import { readdirSync, statSync } from "node:fs";
import path from "node:path";

export type LookalikeTag =
  | "Button"
  | "Card"
  | "Modal"
  | "Empty"
  | "Shell"
  | "Header"
  | "Chip"
  | "Badge"
  | "Tabs"
  | "Input"
  | "Other";

export type ComponentInventoryItem = {
  /** File basename without extension, e.g. EmptyState */
  name: string;
  /** Path relative to src/components, e.g. talent/EmptyState.tsx */
  relativePath: string;
  /** Top-level folder under src/components, e.g. talent-buyers */
  folder: string;
  lookalike: LookalikeTag;
};

const LOOKALIKE_PATTERNS: Array<{ tag: LookalikeTag; re: RegExp }> = [
  { tag: "Button", re: /Button|Btn/i },
  { tag: "Card", re: /Card/i },
  { tag: "Modal", re: /Modal|Dialog/i },
  { tag: "Empty", re: /Empty/i },
  { tag: "Shell", re: /Shell|Chrome/i },
  { tag: "Header", re: /Header|PageHeader|SectionHeader/i },
  { tag: "Chip", re: /Chip|Pill/i },
  { tag: "Badge", re: /Badge/i },
  { tag: "Tabs", re: /Tabs|TabStrip|Segmented/i },
  { tag: "Input", re: /Input|TextField|TextArea|Autocomplete|SearchField|Picker/i },
];

export function lookalikeForName(name: string): LookalikeTag {
  for (const { tag, re } of LOOKALIKE_PATTERNS) {
    if (re.test(name)) return tag;
  }
  return "Other";
}

function walkTsxFiles(dir: string, baseDir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".") || entry === "node_modules") continue;
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkTsxFiles(full, baseDir, out);
      continue;
    }
    if (entry.endsWith(".tsx") && !entry.endsWith(".test.tsx") && !entry.endsWith(".stories.tsx")) {
      out.push(full);
    }
  }
}

/** Scan website `src/components` for a merge/drop catalog. Server-only (uses fs). */
export function scanWebsiteComponents(componentsRoot?: string): ComponentInventoryItem[] {
  const root =
    componentsRoot ?? path.join(process.cwd(), "src", "components");
  const files: string[] = [];
  walkTsxFiles(root, root, files);

  const items: ComponentInventoryItem[] = files.map((full) => {
    const relativePath = path.relative(root, full).split(path.sep).join("/");
    const name = path.basename(full, ".tsx");
    const folder = relativePath.includes("/")
      ? relativePath.slice(0, relativePath.indexOf("/"))
      : "(root)";
    return {
      name,
      relativePath,
      folder,
      lookalike: lookalikeForName(name),
    };
  });

  items.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return items;
}

export function groupByFolder(
  items: ComponentInventoryItem[],
): Record<string, ComponentInventoryItem[]> {
  const groups: Record<string, ComponentInventoryItem[]> = {};
  for (const item of items) {
    (groups[item.folder] ??= []).push(item);
  }
  return groups;
}

export function groupByLookalike(
  items: ComponentInventoryItem[],
): Record<LookalikeTag, ComponentInventoryItem[]> {
  const tags: LookalikeTag[] = [
    "Button",
    "Card",
    "Modal",
    "Empty",
    "Shell",
    "Header",
    "Chip",
    "Badge",
    "Tabs",
    "Input",
    "Other",
  ];
  const groups = Object.fromEntries(tags.map((t) => [t, [] as ComponentInventoryItem[]])) as Record<
    LookalikeTag,
    ComponentInventoryItem[]
  >;
  for (const item of items) {
    groups[item.lookalike].push(item);
  }
  return groups;
}
