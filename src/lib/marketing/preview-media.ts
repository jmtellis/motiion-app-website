/**
 * Locally hosted headshots used as clearly illustrative data inside the
 * marketing product previews. Replaces the previous third-party stock URLs so
 * previews cost no cross-origin requests and ship no live user data.
 */
const HEADSHOT_COUNT = 24;

/** Device-framed app captures used where a real Motiion surface exists. */
export const APP_SCREENSHOTS = {
  portfolio: "/marketing/app/portfolio.jpg",
  discovery: "/marketing/app/discover-gabriela.jpg",
  talentDatabase: "/marketing/app/discover-monique.jpg",
  credential: "/marketing/app/credential.jpg",
  eventCast: "/marketing/app/event-cast.jpg",
} as const;

export const APP_SCREENSHOT_SIZE = 1024;

export const PREVIEW_HEADSHOT_WIDTH = 480;
export const PREVIEW_HEADSHOT_HEIGHT = 640;

export function previewHeadshot(index: number): string {
  const slot = (((index % HEADSHOT_COUNT) + HEADSHOT_COUNT) % HEADSHOT_COUNT) + 1;
  return `/marketing/creative-headshots/${String(slot).padStart(2, "0")}.jpg`;
}

export function previewHeadshots(count: number, offset = 0): string[] {
  return Array.from({ length: count }, (_, index) => previewHeadshot(offset + index));
}
