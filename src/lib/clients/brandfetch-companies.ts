import { brandfetchLogoURL } from "@/lib/profile/brandfetch-logo";

import type { ClientSearchResult } from "./types";

const DEFAULT_LIMIT = 8;
const SEARCH_BASE = "https://api.brandfetch.io/v2/search";

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function hasBrandfetchClientId(): boolean {
  return Boolean(
    process.env.BRANDFETCH_CLIENT_ID?.trim() ||
      process.env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID?.trim(),
  );
}

function resolveClientId(): string | null {
  const raw =
    process.env.BRANDFETCH_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID?.trim();
  if (!raw || raw === "$(BRANDFETCH_CLIENT_ID)") return null;
  return raw;
}

export async function searchBrandfetchCompanies(
  query: string,
  limit = DEFAULT_LIMIT,
): Promise<ClientSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const clientId = resolveClientId();
  if (!clientId) {
    throw new Error("Brandfetch client ID is not configured.");
  }

  const url = `${SEARCH_BASE}/${encodeURIComponent(trimmed)}?c=${encodeURIComponent(clientId)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Brandfetch search failed (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  if (!Array.isArray(payload)) return [];

  return payload
    .slice(0, limit)
    .map((item, index): ClientSearchResult | null => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const name = normalizeString(record.name);
      if (!name) return null;
      const domain = normalizeString(record.domain);
      const brandId = normalizeString(record.brandId) || normalizeString(record._id) || domain || `${name}-${index}`;
      const icon = normalizeString(record.icon);
      const persistentLogo = domain ? brandfetchLogoURL(domain) : null;

      return {
        id: brandId,
        name,
        subtitle: domain || "Company",
        imageUrl: persistentLogo || icon,
        domain,
      };
    })
    .filter((item): item is ClientSearchResult => item !== null);
}
