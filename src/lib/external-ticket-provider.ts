import { brandfetchLogoURL, normalizedDomain } from "@/lib/profile/brandfetch-logo";

export type ExternalTicketProviderId =
  | "eventbrite"
  | "partiful"
  | "dice"
  | "ticketmaster"
  | "posh"
  | "shotgun"
  | "residentAdvisor"
  | "luma"
  | "other";

export type ResolvedExternalTicketProvider = {
  id: ExternalTicketProviderId;
  displayName: string;
  brandDomain: string | null;
  logoURL: string | null;
};

const KNOWN_PROVIDERS: Record<
  Exclude<ExternalTicketProviderId, "other">,
  { displayName: string; brandDomain: string }
> = {
  eventbrite: { displayName: "Eventbrite", brandDomain: "eventbrite.com" },
  partiful: { displayName: "Partiful", brandDomain: "partiful.com" },
  dice: { displayName: "Dice", brandDomain: "dice.fm" },
  ticketmaster: { displayName: "Ticketmaster", brandDomain: "ticketmaster.com" },
  posh: { displayName: "Posh", brandDomain: "posh.vip" },
  shotgun: { displayName: "Shotgun", brandDomain: "shotgun.live" },
  residentAdvisor: { displayName: "Resident Advisor", brandDomain: "ra.co" },
  luma: { displayName: "Luma", brandDomain: "lu.ma" },
};

export function detectExternalTicketProvider(
  rawURL: string | null | undefined,
): ExternalTicketProviderId {
  const trimmed = rawURL?.trim();
  if (!trimmed) return "other";
  const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let host: string;
  try {
    host = new URL(normalized).hostname.toLowerCase();
  } catch {
    return "other";
  }
  if (host.includes("eventbrite")) return "eventbrite";
  if (host.includes("partiful")) return "partiful";
  if (host.includes("dice.fm") || host.startsWith("dice.")) return "dice";
  if (host.includes("ticketmaster")) return "ticketmaster";
  if (host.includes("posh.vip") || host.includes("posh.com")) return "posh";
  if (host.includes("shotgun")) return "shotgun";
  if (host.includes("ra.co") || host.includes("residentadvisor")) return "residentAdvisor";
  if (host.includes("lu.ma") || host.includes("luma.")) return "luma";
  return "other";
}

export function resolveExternalTicketProvider(
  rawURL: string | null | undefined,
): ResolvedExternalTicketProvider | null {
  const trimmed = rawURL?.trim();
  if (!trimmed) return null;

  const id = detectExternalTicketProvider(trimmed);
  const known = id === "other" ? null : KNOWN_PROVIDERS[id];
  const domain = known?.brandDomain ?? normalizedDomain(trimmed);
  return {
    id,
    displayName: known?.displayName ?? "External event",
    brandDomain: domain,
    logoURL: brandfetchLogoURL(domain),
  };
}
