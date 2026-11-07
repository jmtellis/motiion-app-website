import { resolveCoverUrl, type NotionLinkPage } from "@/lib/links/link-tree";
import { linksDatabaseId, notionLinksClient } from "@/lib/links/notion-links";

const PAGE_ID = /^[0-9a-f]{32}$/;
const MAX_BYTES = 15 * 1024 * 1024;

function notFound() {
  return new Response("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=60" } });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; version: string }> },
) {
  const { id } = await params;
  if (!PAGE_ID.test(id)) return notFound();

  const notion = notionLinksClient();
  if (!notion) return notFound();

  let page: NotionLinkPage & { parent?: { database_id?: string } };
  try {
    page = (await notion.pages.retrieve({ page_id: id })) as typeof page;
  } catch {
    return notFound();
  }

  // Only rows from the Links database can be proxied.
  if (page.parent?.database_id?.replace(/-/g, "") !== linksDatabaseId()) return notFound();

  const coverUrl = resolveCoverUrl(page);
  if (!coverUrl) return notFound();

  const upstream = await fetch(coverUrl, { cache: "no-store" }).catch(() => null);
  const contentType = upstream?.headers.get("content-type") ?? "";
  const length = Number(upstream?.headers.get("content-length") ?? 0);
  if (!upstream?.ok || !upstream.body || !contentType.startsWith("image/") || length > MAX_BYTES) {
    return notFound();
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": contentType,
      // The version segment changes whenever the Notion row is edited.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
