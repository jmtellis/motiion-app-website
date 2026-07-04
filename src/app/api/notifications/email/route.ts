import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: Request) {
  const expectedToken = process.env.INTERNAL_EMAIL_TOKEN;
  if (!expectedToken || request.headers.get("x-internal-token") !== expectedToken) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!resend) {
    return NextResponse.json({ ok: false, error: "Resend not configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const { to, subject, html } = body as { to?: string; subject?: string; html?: string };
  if (!to || !subject || !html) {
    return NextResponse.json({ ok: false, error: "Missing to, subject, or html" }, { status: 400 });
  }

  try {
    const { error } = await resend.emails.send({
      from: "Motiion <notifications@motiion.app>",
      to,
      subject,
      html,
    });
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Send failed" },
      { status: 502 },
    );
  }
}
