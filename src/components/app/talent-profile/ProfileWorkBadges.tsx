import { Instagram, Youtube } from "lucide-react";

import { publicRepresentation, socialLinks } from "@/components/app/talent-profile/profile-model";
import type { PublicTalentProfile } from "@/types/public";

/** Agency / union / social chips shared by public and in-app profile chrome. */
export function ProfileWorkBadges({
  profile,
  className = "",
}: {
  profile: PublicTalentProfile;
  className?: string;
}) {
  const representation = publicRepresentation(profile);
  const union = profile.union_status?.trim();
  const socials = socialLinks(profile);
  if (!representation && !union && !socials.length) return null;

  return (
    <div className={`public-talent__work-chips${className ? ` ${className}` : ""}`} aria-label="Representation and socials">
      {representation ? (
        <span className="ui-chip public-talent__work-chip public-talent__work-chip--agency" aria-disabled="true" title={representation}>
          {profile.agency_logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.agency_logo_url} alt="" width={16} height={16} />
          ) : null}
          <span className="public-talent__work-chip-label">{representation}</span>
        </span>
      ) : null}
      {union ? (
        <span
          className="ui-chip public-talent__work-chip public-talent__work-chip--union"
          data-muted={/non/i.test(union)}
          aria-disabled="true"
          title={union}
        >
          <span className="public-talent__work-chip-label">{union}</span>
        </span>
      ) : null}
      {socials.map((link) => {
        const Icon = link.label === "YouTube" ? Youtube : Instagram;
        return (
          <a
            key={link.label}
            className="public-talent__social-icon"
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={link.label}
            title={link.label}
          >
            <Icon size={16} strokeWidth={1.75} aria-hidden />
          </a>
        );
      })}
    </div>
  );
}
