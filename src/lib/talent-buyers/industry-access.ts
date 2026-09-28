/** Soft industry-access phrase, matching the iOS onboarding gate. */
const INDUSTRY_ACCESS_PASSPHRASE = "industryinmotiion";

export const INDUSTRY_ACCESS_STORAGE_KEY = "motiion.industry-access";

export function isValidIndustryAccessPassword(raw: string) {
  return raw.trim() === INDUSTRY_ACCESS_PASSPHRASE;
}

export function hasIndustryAccessUnlock() {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(INDUSTRY_ACCESS_STORAGE_KEY) === "1";
}

export function grantIndustryAccessUnlock() {
  sessionStorage.setItem(INDUSTRY_ACCESS_STORAGE_KEY, "1");
}
