import { personImageCandidates } from './avatar.ts';
import { text, type Source } from './model.ts';
import { acquisitionSourceOptions } from '../talent/copy.ts';

export type IndustryReviewProfile = {
  status: 'available' | 'missing' | 'unavailable';
  imageUrls: string[];
  acquisitionSource: string;
  acquisitionDetail: string;
  username?: string;
  dateOfBirth?: string;
};
export function industryReviewProfile(userId: string, source?: Source): IndustryReviewProfile {
  const profile = !source?.error && userId ? source?.rows.find(row => text(row.user_id) === userId) : undefined;
  const status = !source || source.error ? 'unavailable' : profile ? 'available' : 'missing';
  const raw = text(profile?.acquisition_source).trim();
  return {
    status,
    ...(text(profile?.username) ? { username: text(profile?.username) } : {}),
    ...(text(profile?.date_of_birth) ? { dateOfBirth: text(profile?.date_of_birth).slice(0, 10) } : {}),
    imageUrls: profile ? personImageCandidates(profile, true) : [],
    acquisitionSource: acquisitionSourceOptions.find(option => option.value === raw)?.label || raw.replaceAll('_', ' ') || 'Not recorded',
    acquisitionDetail: text(profile?.acquisition_source_detail).trim() || 'Not provided',
  };
}
export function industryReviewWebsite(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
