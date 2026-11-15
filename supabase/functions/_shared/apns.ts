import { SignJWT, importPKCS8 } from "npm:jose@5";

let cachedJwt: { token: string; exp: number } | null = null;

export async function apnsJwt(): Promise<string> {
  const teamId = Deno.env.get("APNS_TEAM_ID")?.trim() ?? "";
  const keyId = Deno.env.get("APNS_KEY_ID")?.trim() ?? "";
  const pem = Deno.env.get("APNS_PRIVATE_KEY")?.trim() ?? "";
  if (!teamId || !keyId || !pem) {
    throw new Error("Missing APNS_TEAM_ID, APNS_KEY_ID, or APNS_PRIVATE_KEY");
  }

  const now = Math.floor(Date.now() / 1000);
  if (cachedJwt && cachedJwt.exp - 60 > now) {
    return cachedJwt.token;
  }

  const key = await importPKCS8(pem.replace(/\\n/g, "\n"), "ES256");
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt(now)
    .setExpirationTime(now + 50 * 60)
    .sign(key);

  cachedJwt = { token, exp: now + 50 * 60 };
  return token;
}

export function apnsBaseUrl(): string {
  const env = (Deno.env.get("APNS_ENV") ?? "sandbox").trim().toLowerCase();
  if (env === "production" || env === "prod") {
    return "https://api.push.apple.com";
  }
  return "https://api.sandbox.push.apple.com";
}
