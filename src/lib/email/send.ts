import { Resend } from "resend";
import { getAppEnvironment } from "@/lib/environment";
import { isStagingEmailProject, routeEmail } from "../../../supabase/functions/_shared/email-routing";

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

/** Provider acceptance is not delivery. Return the email ID so delivery can be checked. */
export async function sendNotificationEmail(input: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  const resend = getResend();
  if (!resend) return { ok: false, error: "Resend not configured" };

  try {
    const env = (key: string) => key === "SUPABASE_URL" ? process.env.NEXT_PUBLIC_SUPABASE_URL : process.env[key];
    if (getAppEnvironment() !== "production" && !isStagingEmailProject(env)) {
      return { ok: false, error: "Email blocked: staging database required" };
    }
    const message = routeEmail({
      from: process.env.MOTIION_EMAIL_FROM || "Motiion <notifications@motiion.io>",
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: "",
    }, env);
    const { data, error } = await resend.emails.send({ ...message, html: message.html ?? input.html, text: message.text || undefined });
    if (error) {
      console.error("Resend send failed:", error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed";
    console.error("Resend send failed:", message);
    return { ok: false, error: message };
  }
}
