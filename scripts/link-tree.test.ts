import assert from "node:assert/strict";
import { test } from "node:test";

import { linkPageToItem, normalizeLinkHref, parseLinkKind, sortLinkPages, type NotionLinkPage } from "../src/lib/links/link-tree.ts";

const NOW = new Date("2026-11-07T16:00:00Z");

function page(overrides: Record<string, unknown> = {}, extra: Partial<NotionLinkPage> = {}): NotionLinkPage {
  return {
    id: "411e739e-c4ef-818c-b031-f8167d7f34e4",
    last_edited_time: "2026-11-07T15:00:00.000Z",
    ...extra,
    properties: {
      Title: { type: "title", title: [{ plain_text: "Shop Motiion" }] },
      URL: { type: "url", url: "https://motiion.app/shop" },
      Live: { type: "checkbox", checkbox: true },
      Type: { type: "select", select: { name: "Shop" } },
      ...overrides,
    } as NotionLinkPage["properties"],
  };
}

test("live rows become link items with site links made relative", () => {
  const item = linkPageToItem(page(), NOW);
  assert.equal(item?.id, "411e739ec4ef818cb031f8167d7f34e4");
  assert.equal(item?.href, "/shop");
  assert.equal(item?.kind, "shop");
  assert.equal(item?.coverSrc, null);
});

test("unpublished, untitled, or link-less rows are hidden", () => {
  assert.equal(linkPageToItem(page({ Live: { checkbox: false } }), NOW), null);
  assert.equal(linkPageToItem(page({ Title: { title: [] } }), NOW), null);
  assert.equal(linkPageToItem(page({ URL: { url: null } }), NOW), null);
  assert.equal(linkPageToItem(page({}, { in_trash: true }), NOW), null);
});

test("show window hides rows before start and after the end date", () => {
  assert.equal(linkPageToItem(page({ "Show from": { date: { start: "2026-11-08" } } }), NOW), null);
  assert.ok(linkPageToItem(page({ "Show from": { date: { start: "2026-11-07" } } }), NOW));
  assert.ok(linkPageToItem(page({ "Show until": { date: { start: "2026-11-07" } } }), NOW));
  assert.equal(linkPageToItem(page({ "Show until": { date: { start: "2026-11-06" } } }), NOW), null);
  assert.equal(linkPageToItem(page({ "Show until": { date: { start: "2026-11-07T15:00:00Z" } } }), NOW), null);
});

test("uploaded or page covers use the versioned proxy path", () => {
  const uploaded = linkPageToItem(page({ Cover: { files: [{ type: "file", file: { url: "https://s3.example/x.png" } }] } }), NOW);
  assert.match(uploaded!.coverSrc!, /^\/links\/cover\/411e739ec4ef818cb031f8167d7f34e4\/[0-9a-z]+$/);
  const pageCover = linkPageToItem(page({}, { cover: { type: "external", external: { url: "https://img.example/a.jpg" } } }), NOW);
  assert.ok(pageCover?.coverSrc);
});

test("link URLs are normalized and unsafe schemes rejected", () => {
  assert.equal(normalizeLinkHref("instagram.com/motiion.app"), "https://instagram.com/motiion.app");
  assert.equal(normalizeLinkHref("/shop"), "/shop");
  assert.equal(normalizeLinkHref("https://www.motiion.app/shop?ref=ig"), "/shop?ref=ig");
  assert.equal(normalizeLinkHref("javascript:alert(1)"), null);
  assert.equal(normalizeLinkHref("//evil.example"), "https://evil.example/");
  assert.equal(normalizeLinkHref("  "), null);
});

test("types fall back to other, and rows without an order sort last", () => {
  assert.equal(parseLinkKind("Instagram"), "instagram");
  assert.equal(parseLinkKind("Podcast"), "other");
  const sorted = sortLinkPages([
    page({ Order: { number: null }, Title: { title: [{ plain_text: "C" }] } }),
    page({ Order: { number: 2 }, Title: { title: [{ plain_text: "B" }] } }),
    page({ Order: { number: 1 }, Title: { title: [{ plain_text: "A" }] } }),
  ]);
  assert.deepEqual(sorted.map((p) => p.properties?.Title?.title?.[0]?.plain_text), ["A", "B", "C"]);
});
