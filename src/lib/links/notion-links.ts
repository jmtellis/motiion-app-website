import "server-only";

import { Client } from "@notionhq/client";
import { cache } from "react";

import {
  FALLBACK_LINKS,
  linkPageToItem,
  sortLinkPages,
  type LinkTreeItem,
  type NotionLinkPage,
} from "@/lib/links/link-tree";

/** Inline "Links" database on the Motiion Ventures › Links page in Notion. */
const DEFAULT_LINKS_DATABASE_ID = "fd1e33d97e744dbba5fb7b904a5b4530";

export type LinkTree = {
  links: LinkTreeItem[];
  source: "notion" | "fallback";
};

export function linksDatabaseId(): string {
  return (process.env.NOTION_LINKS_DATABASE_ID?.trim() || DEFAULT_LINKS_DATABASE_ID).replace(/-/g, "");
}

export function notionLinksClient(): Client | null {
  const auth = process.env.NOTION_API_KEY?.trim();
  return auth ? new Client({ auth }) : null;
}

async function resolveDataSourceId(notion: Client, databaseId: string): Promise<string> {
  const database = await notion.databases.retrieve({ database_id: databaseId });
  const dataSourceId = "data_sources" in database ? database.data_sources[0]?.id : undefined;
  if (!dataSourceId) throw new Error("Links database has no data source.");
  return dataSourceId;
}

export const loadLinkTree = cache(async (): Promise<LinkTree> => {
  const notion = notionLinksClient();
  if (!notion) return { links: FALLBACK_LINKS, source: "fallback" };

  try {
    const dataSourceId = await resolveDataSourceId(notion, linksDatabaseId());
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: { property: "Live", checkbox: { equals: true } },
      sorts: [
        { property: "Order", direction: "ascending" },
        { timestamp: "created_time", direction: "ascending" },
      ],
      page_size: 100,
    });

    const now = new Date();
    const pages = response.results.filter((result) => result.object === "page") as NotionLinkPage[];
    const links = sortLinkPages(pages)
      .map((page) => linkPageToItem(page, now))
      .filter((item): item is LinkTreeItem => item !== null);

    return { links, source: "notion" };
  } catch (error) {
    console.error("links: Notion query failed", error);
    return { links: FALLBACK_LINKS, source: "fallback" };
  }
});
