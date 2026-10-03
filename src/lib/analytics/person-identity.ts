import { getProfileAvatarUrl } from "@/lib/auth/avatar";
import { getFullName } from "@/lib/auth/profile";

const USER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PersonIdentity = {
  displayName: string;
  secondary: string | null;
  avatarUrl: string | null;
};

export type ProfileIdentitySource = {
  user_id?: string | null;
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  username?: string | null;
  headshot_urls?: string[] | null;
};

function clean(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function nameIsRawUserId(value: string | null | undefined, userId?: string | null) {
  const name = clean(value);
  if (!name) return true;
  if (userId && name === userId) return true;
  return USER_ID_PATTERN.test(name);
}

export function identityFromProfile(profile: ProfileIdentitySource | null | undefined): PersonIdentity & {
  hasProfile: boolean;
  email: string | null;
  username: string | null;
} {
  if (!profile?.user_id) {
    return {
      hasProfile: false,
      displayName: "No profile",
      secondary: null,
      avatarUrl: null,
      email: null,
      username: null,
    };
  }

  const email = clean(profile.email);
  const username = clean(profile.username);
  const headshots = Array.isArray(profile.headshot_urls)
    ? profile.headshot_urls.filter((item): item is string => typeof item === "string")
    : null;
  return {
    hasProfile: true,
    displayName: getFullName({
      display_name: profile.display_name ?? null,
      first_name: profile.first_name ?? null,
      last_name: profile.last_name ?? null,
    }),
    secondary: email ?? (username ? `@${username}` : null),
    avatarUrl: getProfileAvatarUrl(headshots),
    email,
    username,
  };
}

/**
 * Presentation rule for admin person rows.
 * A raw user id is never the name or the line under it.
 * Missing profiles say so. Anonymous events stay anonymous.
 */
export function identityFromFields(input: {
  userId?: string | null;
  displayName?: string | null;
  email?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  hasProfile?: boolean;
}): PersonIdentity {
  const email = clean(input.email);
  const username = clean(input.username);
  const avatarUrl = clean(input.avatarUrl);
  const secondary = email ?? (username ? `@${username}` : null);
  const rawName = clean(input.displayName);
  const unnamed =
    !rawName ||
    nameIsRawUserId(rawName, input.userId) ||
    rawName === "Anonymous" ||
    rawName === "Unknown user";

  if (!input.userId) {
    return { displayName: "Anonymous", secondary: null, avatarUrl: null };
  }

  const profileMissing =
    input.hasProfile === false ||
    (input.hasProfile !== true && unnamed && !email && !username && !avatarUrl);

  if (profileMissing) {
    return { displayName: "No profile", secondary: null, avatarUrl: null };
  }

  return {
    displayName: unnamed ? "Motiion User" : rawName!,
    secondary,
    avatarUrl,
  };
}
