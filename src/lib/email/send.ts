import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

/** Fire-and-forget transactional email; failures are logged, never thrown. */
export async function sendNotificationEmail(input: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) return { ok: false, error: "Resend not configured" };

  try {
    const { error } = await resend.emails.send({
      from: "Motiion <notifications@motiion.app>",
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    if (error) {
      console.error("Resend send failed:", error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed";
    console.error("Resend send failed:", message);
    return { ok: false, error: message };
  }
}
