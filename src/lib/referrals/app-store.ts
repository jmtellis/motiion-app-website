const DEFAULT_IOS_APP_STORE_ID = "6759847766";
const DEFAULT_IOS_APP_STORE_URL = `https://apps.apple.com/app/id${DEFAULT_IOS_APP_STORE_ID}`;

export function getIosAppStoreUrl(): string {
  return process.env.NEXT_PUBLIC_IOS_APP_STORE_URL?.trim() || DEFAULT_IOS_APP_STORE_URL;
}

export function getIosAppStoreId(): string {
  const explicit = process.env.NEXT_PUBLIC_IOS_APP_STORE_ID?.trim();
  if (explicit) return explicit;

  const url = process.env.NEXT_PUBLIC_IOS_APP_STORE_URL?.trim();
  const match = url?.match(/id(\d+)/i);
  return match?.[1] ?? DEFAULT_IOS_APP_STORE_ID;
}
