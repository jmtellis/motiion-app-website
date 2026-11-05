import { marketingPageLinks } from "@/lib/marketing/site-nav";

export type FooterLink = {
  label: string;
  href: string;
};

export type FooterColumn = {
  title: string;
  links: FooterLink[];
};

export const CONTACT_HREF = "mailto:hello@motiion.com";

export const footerColumns: FooterColumn[] = [
  {
    title: "Platform",
    links: [
      { label: "Casting opportunities", href: "/open-calls" },
      { label: "Join Motiion", href: "/signup" },
      { label: "Login", href: "/login" },
      { label: "Download App", href: "https://apps.apple.com/app/id6759847766" },
    ],
  },
  {
    title: "Company",
    links: [
      ...marketingPageLinks,
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

// Publish social links only when their official destination has been established.
export const footerSocialLinks: FooterSocialLink[] = [];
