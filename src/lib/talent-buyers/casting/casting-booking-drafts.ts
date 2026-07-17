import type { CastingCandidate, CastingRole } from "@/lib/talent-buyers/casting/casting-types";
import { roleMatchIds } from "@/lib/talent-buyers/casting/casting-filters";

export type FinalSelectBookingPerson = {
  candidate: CastingCandidate;
  role: CastingRole | null;
};

export type FinalSelectBookingCard = {
  id: string;
  agencyEmail: string | null;
  displayName: string;
  people: FinalSelectBookingPerson[];
  isDirect: boolean;
};

function normalizeEmail(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase() ?? "";
  return trimmed.includes("@") ? trimmed : null;
}

function titleCaseWords(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (word === word.toUpperCase() && word.length > 1) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function displayNameFromAgencyEmail(email: string): string {
  const at = email.indexOf("@");
  let label = at >= 0 ? email.slice(at + 1) : email;
  const dot = label.indexOf(".");
  if (dot >= 0) label = label.slice(0, dot);
  label = label.replace(/[-_.]+/g, " ");
  return titleCaseWords(label) || "Agency";
}

/** Agency booking email only when representation looks like an email (not talent direct email). */
export function bookingAgencyEmail(candidate: CastingCandidate): string | null {
  return normalizeEmail(candidate.agency);
}

export function agencyDisplayName(candidate: CastingCandidate, agencyEmail: string | null): string {
  const representation = candidate.agency?.trim();
  if (representation && !representation.includes("@")) return titleCaseWords(representation);
  if (agencyEmail) return displayNameFromAgencyEmail(agencyEmail);
  return "Direct contact";
}

function hasRepresentation(candidate: CastingCandidate): boolean {
  return Boolean(candidate.agency?.trim());
}

/** Bucket key for represented talent — prefer email when present, otherwise normalized agency name. */
function representationBucketKey(candidate: CastingCandidate): string | null {
  const representation = candidate.agency?.trim();
  if (!representation) return null;
  const email = normalizeEmail(representation);
  if (email) return `email:${email}`;
  return `name:${representation.toLowerCase()}`;
}

export function buildFinalSelectBookingCards(input: {
  candidates: CastingCandidate[];
  roles: CastingRole[];
}): FinalSelectBookingCard[] {
  const { candidates, roles } = input;
  if (!candidates.length) return [];

  type Entry = {
    candidate: CastingCandidate;
    role: CastingRole | null;
    agencyEmail: string | null;
    bucketKey: string | null;
  };

  const entries: Entry[] = candidates.map((candidate) => {
    const role =
      roles.find((item) => candidate.roleIds.some((id) => roleMatchIds(item).includes(id))) ?? null;
    return {
      candidate,
      role,
      agencyEmail: bookingAgencyEmail(candidate),
      bucketKey: representationBucketKey(candidate),
    };
  });

  const represented = entries.filter((entry) => entry.bucketKey);
  const direct = entries.filter((entry) => !entry.bucketKey);

  const agencyBuckets = new Map<string, Entry[]>();
  for (const entry of represented) {
    const key = entry.bucketKey!;
    const bucket = agencyBuckets.get(key) ?? [];
    bucket.push(entry);
    agencyBuckets.set(key, bucket);
  }

  const agencyCards: FinalSelectBookingCard[] = [...agencyBuckets.entries()]
    .sort(([, a], [, b]) => {
      const nameA = agencyDisplayName(a[0]!.candidate, a[0]!.agencyEmail);
      const nameB = agencyDisplayName(b[0]!.candidate, b[0]!.agencyEmail);
      return nameA.localeCompare(nameB);
    })
    .map(([bucketKey, bucket]) => {
      const people = bucket
        .map((entry) => ({ candidate: entry.candidate, role: entry.role }))
        .sort((a, b) => a.candidate.displayName.localeCompare(b.candidate.displayName));
      const agencyEmail =
        bucket.map((entry) => entry.agencyEmail).find((email): email is string => Boolean(email)) ??
        null;
      return {
        id: `agency:${bucketKey}`,
        agencyEmail,
        displayName: agencyDisplayName(bucket[0]!.candidate, agencyEmail),
        people,
        isDirect: false,
      };
    });

  const directCards: FinalSelectBookingCard[] = direct
    .sort((a, b) => a.candidate.displayName.localeCompare(b.candidate.displayName))
    .map((entry) => ({
      id: `direct:${entry.candidate.id}`,
      agencyEmail: null,
      displayName: "Direct contact",
      people: [{ candidate: entry.candidate, role: entry.role }],
      isDirect: true,
    }));

  return [...agencyCards, ...directCards];
}

export function buildBookingMailto(card: FinalSelectBookingCard, castingTitle: string): string | null {
  const names = card.people.map((person) => person.candidate.displayName).filter(Boolean);
  if (!names.length) return null;

  const subject = encodeURIComponent(
    `Booking request${castingTitle ? ` — ${castingTitle}` : ""}`,
  );
  const body = encodeURIComponent(
    [
      `Hi${card.isDirect ? "" : ` ${card.displayName}`},`,
      "",
      `We'd like to move forward with booking ${names.join(", ")} for ${castingTitle || "this casting"}.`,
      "",
      "Please confirm availability and next steps when you can.",
      "",
      "Thank you,",
    ].join("\n"),
  );

  if (card.agencyEmail) {
    const cc = card.people
      .map((person) => person.candidate.email?.trim())
      .filter((email): email is string => Boolean(email && email.includes("@")))
      .filter((email) => email.toLowerCase() !== card.agencyEmail);
    const ccParam = cc.length ? `&cc=${encodeURIComponent(cc.join(","))}` : "";
    return `mailto:${encodeURIComponent(card.agencyEmail)}?subject=${subject}&body=${body}${ccParam}`;
  }

  const to = card.people[0]?.candidate.email?.trim();
  if (!to || !to.includes("@")) return null;
  return `mailto:${encodeURIComponent(to)}?subject=${subject}&body=${body}`;
}

export function buildPersonBookingMailto(
  person: FinalSelectBookingPerson,
  castingTitle: string,
): string | null {
  const agencyEmail = bookingAgencyEmail(person.candidate);
  const represented = hasRepresentation(person.candidate);
  return buildBookingMailto(
    {
      id: `person:${person.candidate.id}`,
      agencyEmail,
      displayName: agencyDisplayName(person.candidate, agencyEmail),
      people: [person],
      isDirect: !represented,
    },
    castingTitle,
  );
}
