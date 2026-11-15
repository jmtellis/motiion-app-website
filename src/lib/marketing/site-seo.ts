export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.motiion.app").replace(/\/$/, "");
export const SITE_TITLE = "Motiion — The Professional Platform for Dance";
export const SITE_DESCRIPTION =
  "Discover dancers, build rosters, and manage castings with Motiion. Bring your project together, or create a talent profile to get discovered.";

export const homepageStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: "Motiion",
      alternateName: "motiion.app",
      description: SITE_DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en",
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Motiion",
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/motiion-icon-512.png`,
      description: SITE_DESCRIPTION,
    },
  ],
};
