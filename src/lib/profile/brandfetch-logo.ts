const LOGO_CDN_BASE = "https://cdn.brandfetch.io";

function trim(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

export function isBrandfetchHostedURL(rawURL: string | null | undefined): boolean {
  const trimmed = trim(rawURL);
  if (!trimmed) return false;
  try {
    const host = new URL(trimmed).hostname.toLowerCase();
    return host.includes("brandfetch.io") || host.includes("brandfetch.com");
  } catch {
    return false;
  }
}

export function normalizedDomain(rawDomainOrURL: string | null | undefined): string | null {
  const trimmed = trim(rawDomainOrURL).replace(/\/+$/, "");
  if (!trimmed) return null;

  const candidate = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
  try {
    let host = new URL(candidate).hostname.toLowerCase();
    if (!host) return null;
    if (host.startsWith("www.")) host = host.slice(4);
    return host;
  } catch {
    const lowered = trimmed.toLowerCase();
    if (!lowered.includes(".") || lowered.includes(" ")) return null;
    return lowered.startsWith("www.") ? lowered.slice(4) : lowered;
  }
}

export function domainFromHostedURL(rawURL: string | null | undefined): string | null {
  const trimmed = trim(rawURL);
  if (!trimmed || !isBrandfetchHostedURL(trimmed)) return null;

  try {
    const parts = new URL(trimmed).pathname.split("/").filter(Boolean);
    const domainIndex = parts.indexOf("domain");
    if (domainIndex === -1 || domainIndex + 1 >= parts.length) return null;
    return normalizedDomain(parts[domainIndex + 1]);
  } catch {
    return null;
  }
}

function brandfetchClientId(): string | null {
  // Prefer the public id so server-rendered client components hydrate with the same URLs.
  const raw =
    process.env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID?.trim() ||
    process.env.BRANDFETCH_CLIENT_ID?.trim();
  if (!raw || raw === "$(BRANDFETCH_CLIENT_ID)" || raw === "$(NEXT_PUBLIC_BRANDFETCH_CLIENT_ID)") {
    return null;
  }
  return raw;
}

export function brandfetchLogoURL(
  rawDomainOrURL: string | null | undefined,
  width = 400,
  height = 400,
): string | null {
  const clientId = brandfetchClientId();
  const domain = normalizedDomain(rawDomainOrURL);
  if (!clientId || !domain) return null;

  const encodedDomain = encodeURIComponent(domain);
  return `${LOGO_CDN_BASE}/domain/${encodedDomain}/w/${width}/h/${height}/theme/dark/fallback/lettermark/type/icon?c=${encodeURIComponent(clientId)}`;
}

/** Swap/refresh the Brandfetch client token on a CDN URL when we have one configured. */
function refreshBrandfetchClientParam(rawURL: string): string | null {
  const clientId = brandfetchClientId();
  if (!clientId) return null;
  try {
    const url = new URL(rawURL);
    url.searchParams.set("c", clientId);
    return url.toString();
  } catch {
    return null;
  }
}

/** Rebuild expiring Brandfetch asset URLs from a stored brand domain when possible. */
export function resolveBrandfetchLogoURL(
  storedURL: string | null | undefined,
  brandDomain: string | null | undefined,
): string | null {
  const trimmedStored = trim(storedURL);
  if (!trimmedStored) return null;

  if (!isBrandfetchHostedURL(trimmedStored)) {
    return trimmedStored;
  }

  const domain = normalizedDomain(brandDomain) ?? domainFromHostedURL(trimmedStored);
  if (domain) {
    return brandfetchLogoURL(domain) ?? refreshBrandfetchClientParam(trimmedStored);
  }

  // Brand-id CDN paths (`/idh2k…/`) cannot be rebuilt from a domain — refresh `c=` when possible.
  // Fall back to the stored URL so server/client markup stays aligned when the public client id
  // isn't inlined yet; <img onError> covers expired tokens.
  return refreshBrandfetchClientParam(trimmedStored) ?? trimmedStored;
}
