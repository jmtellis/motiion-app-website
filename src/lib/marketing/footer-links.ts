export type FooterLink = {
  label: string;
  href: string;
};

export type FooterColumn = {
  title: string;
  links: FooterLink[];
};

export const CONTACT_HREF = "mailto:hello@motiion.com";

/** Placeholder `#` links can be replaced when pages ship. */
export const footerColumns: FooterColumn[] = [
  {
    title: "Platform",
    links: [
      { label: "Auditions", href: "#" },
      { label: "Agency", href: "#" },
      { label: "Login", href: "/login" },
      { label: "Download App", href: "https://apps.apple.com/app/id6759847766" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Services", href: "/services" },
      { label: "Pricing", href: "/pricing" },
      { label: "Partnerships", href: "https://www.motiion.io/partnerships" },
      { label: "Contact", href: CONTACT_HREF },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Dancers Alliance", href: "https://www.dancersalliance.org/" },
      { label: "SAG-AFTRA", href: "https://www.sagaftra.org/" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Cookie Policy", href: "/cookies" },
    ],
  },
];

export type FooterSocialLink = {
  label: string;
  href: string;
  icon: "instagram" | "linkedin" | "tiktok" | "youtube";
};

export const footerSocialLinks: FooterSocialLink[] = [
  { label: "Instagram", href: "#", icon: "instagram" },
  { label: "LinkedIn", href: "#", icon: "linkedin" },
  { label: "TikTok", href: "#", icon: "tiktok" },
  { label: "YouTube", href: "#", icon: "youtube" },
];
