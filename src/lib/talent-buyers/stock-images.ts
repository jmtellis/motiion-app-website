const crop = (photoId: string, width = 1200) =>
  `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${width}&q=80`;

/** Verified working Unsplash IDs (HEAD-checked). */
const projectStockImages = [
  crop("photo-1508700929628-666bc8bd84ea"),
  crop("photo-1518611012118-696072aa579a"),
  crop("photo-1524504388940-b1c1722653e1"),
  crop("photo-1514525253161-7a46d19cd819"),
  crop("photo-1494790108377-be9c29b29330"),
  crop("photo-1517841905240-472988babdf9"),
  crop("photo-1506794778202-cad84cf45f1d"),
  crop("photo-1488426862026-3ee34a7d66df"),
];

const eventStockImages = [
  crop("photo-1516450360452-9312f5e86fc7"),
  crop("photo-1470229722913-7c0e2dbbafd3"),
  crop("photo-1493225457124-a3eb161ffa5f"),
  crop("photo-1511671782779-c97d3d27a1d4"),
  crop("photo-1459749411175-04bf5292ceea"),
  crop("photo-1504593811423-6dd665756598"),
  crop("photo-1508214751196-bcfd4ca60f91"),
  crop("photo-1500648767791-00dcc994a43e"),
];

function hashId(id: string) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash << 5) - hash + id.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function getBuyerStockImage(id: string, category: "project" | "event") {
  const images = category === "project" ? projectStockImages : eventStockImages;
  return images[hashId(id) % images.length];
}

export function resolveBuyerCoverImage(
  id: string,
  coverImageUrl: string | null | undefined,
  category: "project" | "event",
) {
  const trimmed = coverImageUrl?.trim();
  if (trimmed && isHttpUrl(trimmed)) return trimmed;
  return getBuyerStockImage(id, category);
}
