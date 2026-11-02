import {
  isIosUserAgent,
  profileAppSchemeUrl,
  profileWebUrl,
} from "@/lib/app-links/motiion-profile";

const FALLBACK_MS = 1400;

/**
 * Try the Motiion custom URL scheme, then fall back if the app did not take over.
 *
 * On iOS, a same-domain Universal Link (`motiion.app` → `/profile/…`) never leaves
 * Safari. The custom scheme opens the installed app; if the page is still visible
 * after a short timer, we send the visitor to the App Store. Non-iOS visitors go
 * to the public web profile.
 */
export function openMotiionProfile({
  slug,
  appStoreUrl,
}: {
  slug: string;
  appStoreUrl: string;
}): void {
  const webUrl = profileWebUrl(slug);
  if (!isIosUserAgent(navigator.userAgent)) {
    window.location.assign(webUrl);
    return;
  }

  const started = Date.now();
  let handedOff = false;

  const markHidden = () => {
    if (document.visibilityState === "hidden") handedOff = true;
  };

  document.addEventListener("visibilitychange", markHidden);
  window.addEventListener("pagehide", markHidden);

  window.location.href = profileAppSchemeUrl(slug);

  window.setTimeout(() => {
    document.removeEventListener("visibilitychange", markHidden);
    window.removeEventListener("pagehide", markHidden);
    if (handedOff || document.visibilityState === "hidden") return;
    if (Date.now() - started < FALLBACK_MS + 900) {
      window.location.assign(appStoreUrl);
    }
  }, FALLBACK_MS);
}
