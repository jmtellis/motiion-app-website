export const LINK_KINDS = [
  "app",
  "instagram",
  "shop",
  "event",
  "video",
  "article",
  "website",
  "other",
] as const;

export type LinkKind = (typeof LINK_KINDS)[number];

export type LinkTreeItem = {
  id: string;
  title: string;
  description: string | null;
  href: string;
  kind: LinkKind;
  featured: boolean;
  button: string | null;
  badge: string | null;
  /** Cover uploaded in Notion; null means the page uses the default for the kind. */
  coverSrc: string | null;
};

export const LINK_KIND_LABELS: Record<LinkKind, string> = {
  app: "App",
  instagram: "Instagram",
  shop: "Shop",
  event: "Event",
  video: "Video",
  article: "Article",
  website: "Website",
  other: "Link",
};

const DEFAULT_BUTTON_LABELS: Record<LinkKind, string> = {
  app: "Download",
  instagram: "Follow",
  shop: "Shop now",
  event: "Get details",
  video: "Watch",
  article: "Read",
  website: "Visit",
  other: "Open",
};

export const DEFAULT_FEATURED_COVER = "/motiion-share-preview.png";

const DEFAULT_COVERS: Partial<Record<LinkKind, string>> = {
  shop: "/shop/motiion-wordmark-tee.jpg",
};

export function defaultCoverFor(kind: LinkKind): string {
  return DEFAULT_COVERS[kind] ?? DEFAULT_FEATURED_COVER;
}

/** Product shot for compact rows; other kinds show their icon instead. */
export function defaultThumbFor(kind: LinkKind): string | null {
  if (kind === "app") return "/motiion-icon-512.png";
  return DEFAULT_COVERS[kind] ?? null;
}

export function buttonLabelFor(item: Pick<LinkTreeItem, "button" | "kind">): string {
  return item.button ?? DEFAULT_BUTTON_LABELS[item.kind];
}

export const FALLBACK_LINKS: LinkTreeItem[] = [
  {
    id: "fallback-app",
    title: "Download the Motiion app",
    description: "Your portfolio, credits, and casting opportunities in one place.",
    href: "https://apps.apple.com/app/id6759847766",
    kind: "app",
    featured: true,
    button: "Download on the App Store",
    badge: null,
    coverSrc: null,
  },
  {
    id: "fallback-shop",
    title: "Shop Motiion",
    description: "T-shirts and other pieces from Motiion.",
    href: "/shop",
    kind: "shop",
    featured: false,
    button: null,
    badge: null,
    coverSrc: null,
  },
  {
    id: "fallback-instagram",
    title: "Follow @motiion.app",
    description: "Casting calls, behind the scenes, and the dance community.",
    href: "https://www.instagram.com/motiion.app/",
    kind: "instagram",
    featured: false,
    button: null,
    badge: null,
    coverSrc: null,
  },
];

/* ------------------------------------------------------- Notion parsing */

type RichText = { plain_text?: string };
type NotionFile = {
  type?: string;
  file?: { url?: string };
  external?: { url?: string };
};
type NotionProperty = {
  type?: string;
  title?: RichText[];
  rich_text?: RichText[];
  url?: string | null;
  select?: { name?: string } | null;
  checkbox?: boolean;
  number?: number | null;
  date?: { start?: string; end?: string | null } | null;
  files?: NotionFile[];
};

export type NotionLinkPage = {
  id: string;
  object?: string;
  in_trash?: boolean;
  archived?: boolean;
  last_edited_time?: string;
  cover?: NotionFile | null;
  properties?: Record<string, NotionProperty>;
};

const SITE_HOSTS = new Set(["motiion.app", "www.motiion.app"]);

function text(prop: NotionProperty | undefined): string | null {
  const parts = prop?.title ?? prop?.rich_text;
  const value = parts?.map((part) => part.plain_text ?? "").join("").trim();
  return value ? value : null;
}

function fileUrl(file: NotionFile | null | undefined): string | null {
  if (!file) return null;
  return file.file?.url ?? file.external?.url ?? null;
}

/** Notion-hosted file URLs expire after an hour, so callers resolve them fresh. */
export function resolveCoverUrl(page: NotionLinkPage): string | null {
  const uploaded = page.properties?.Cover?.files?.find((file) => fileUrl(file));
  return fileUrl(uploaded) ?? fileUrl(page.cover);
}

export function normalizeLinkHref(raw: string | null): string | null {
  const value = raw?.trim();
  if (!value) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return value;

  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (!["https:", "http:", "mailto:", "tel:"].includes(url.protocol)) return null;
  if (SITE_HOSTS.has(url.hostname)) return `${url.pathname}${url.search}${url.hash}` || "/";
  return url.toString();
}

export function parseLinkKind(raw: string | null | undefined): LinkKind {
  const value = raw?.trim().toLowerCase();
  return LINK_KINDS.find((kind) => kind === value) ?? "other";
}

function isWithinWindow(page: NotionLinkPage, now: Date): boolean {
  const from = page.properties?.["Show from"]?.date?.start;
  const until = page.properties?.["Show until"]?.date;
  if (from && Date.parse(from) > now.getTime()) return false;
  const untilValue = until?.end ?? until?.start;
  if (untilValue) {
    // Date-only values stay visible through the end of that day.
    const end = untilValue.length === 10 ? Date.parse(`${untilValue}T23:59:59.999Z`) : Date.parse(untilValue);
    if (end < now.getTime()) return false;
  }
  return true;
}

function coverVersion(page: NotionLinkPage): string {
  const edited = page.last_edited_time ? Date.parse(page.last_edited_time) : Number.NaN;
  return Number.isFinite(edited) ? edited.toString(36) : "0";
}

export function linkPageToItem(page: NotionLinkPage, now: Date): LinkTreeItem | null {
  const props = page.properties ?? {};
  if (page.in_trash || page.archived) return null;
  if (props.Live?.checkbox !== true) return null;
  if (!isWithinWindow(page, now)) return null;

  const title = text(props.Title);
  const href = normalizeLinkHref(props.URL?.url ?? null);
  if (!title || !href) return null;

  const id = page.id.replace(/-/g, "");
  return {
    id,
    title,
    description: text(props.Description),
    href,
    kind: parseLinkKind(props.Type?.select?.name),
    featured: props.Featured?.checkbox === true,
    button: text(props.Button),
    badge: text(props.Badge),
    coverSrc: resolveCoverUrl(page) ? `/links/cover/${id}/${coverVersion(page)}` : null,
  };
}

export function sortLinkPages(pages: NotionLinkPage[]): NotionLinkPage[] {
  const order = (page: NotionLinkPage) => page.properties?.Order?.number ?? Number.POSITIVE_INFINITY;
  return [...pages].sort((a, b) => order(a) - order(b));
}

export function isExternalHref(href: string): boolean {
  return !href.startsWith("/");
}
