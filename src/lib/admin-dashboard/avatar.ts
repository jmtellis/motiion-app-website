import { isIndustry, list, text, type Row } from './model.ts';

/** Identity images live on profiles.user_id, including for non_talent_profiles.id.
 * Ordered portfolio headshots are the talent preference; industry has its own image.
 * Never infer a person's image from a company, professional-profile ID, or originals.
 */
export function personImageCandidates(person: Row, industry = isIndustry(person)): string[] {
  const headshots = list(person.headshot_urls);
  const candidates = industry
    ? [person.industry_avatar_url, ...headshots]
    : [...headshots, person.industry_avatar_url];
  return [...new Set(candidates.flatMap(value => {
    try {
      const url = new URL(text(value).trim());
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return [];
      // Keep stored public/signed URLs intact. Never turn private object paths into public URLs.
      return [url.href];
    } catch { return []; }
  }))];
}
