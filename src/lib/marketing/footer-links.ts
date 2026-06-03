export type FooterLink = {
  label: string;
  href: string;
};

export type FooterColumn = {
  title: string;
  links: FooterLink[];
};

/** Placeholder `#` links can be replaced when pages ship. */
export const footerColumns: FooterColumn[] = [
  {
    title: "Platform",
    links: [
      { label: "For Dancers", href: "/for-talent" },
      { label: "For Choreographers & Casting", href: "/for-casting" },
      { label: "Request a Demo", href: "/request-demo" },
      { label: "Log In", href: "/login" },
      { label: "Sign Up", href: "/signup" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Motiion", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Press", href: "#" },
      { label: "Contact", href: "mailto:hello@motiion.com" },
      { label: "Beta Program", href: "/#signup" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Help Center", href: "#" },
      { label: "Trust & Safety", href: "#" },
      { label: "Verified Talent", href: "#" },
      { label: "Blog", href: "#" },
      { label: "System Status", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Cookie Policy", href: "#" },
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
