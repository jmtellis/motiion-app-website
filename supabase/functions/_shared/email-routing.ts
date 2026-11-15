type Env = (key: string) => string | undefined;
type Email = { from: string; to: string[]; subject: string; text: string; html?: string };
const STAGING_HOST = "mvkvztpvakybrhyupown.supabase.co";
export function isStagingEmailProject(env: Env): boolean {
  const host = new URL(env("SUPABASE_URL") ?? "").hostname;
  if (host === STAGING_HOST) return true;
  if (["pygdxcscmebeqjxhzzuq.supabase.co", "api.motiion.app"].includes(host)) return false;
  throw new Error("Unknown email environment");
}
export function stagingAppOrigin(env: Env): string {
  if (!isStagingEmailProject(env)) throw new Error("Staging email configuration required");
  const url = new URL(env("STAGING_APP_URL") ?? "");
  if (!["http://localhost:3001", "https://motiion-industry-staging.vercel.app"].includes(url.origin)
      || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("Invalid staging email origin");
  return url.origin;
}
function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]!));
}
/** Known staging project only; missing routing configuration fails closed. */
export function routeEmail(message: Email, env: Env): Email {
  if (!isStagingEmailProject(env)) return message;
  const to = env("STAGING_EMAIL_RECIPIENT")?.trim().toLowerCase();
  if (!to || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(to)) throw new Error("One staging recipient is required");
  const origin = stagingAppOrigin(env);
  const rewrite = (text: string) => text.replaceAll("https://motiion-industry-staging.vercel.app", origin);
  const label = `Staging test. Intended account: ${message.to.join(", ")}`;
  return {
    ...message, to: [to], subject: `[STAGING] ${message.subject}`,
    text: `${label}\n\n${rewrite(message.text)}`,
    ...(message.html ? {html: `<p>${escapeHtml(label)}</p>${rewrite(message.html)}`} : {}),
  };
}
