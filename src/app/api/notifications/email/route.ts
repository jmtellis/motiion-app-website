import { NextResponse } from "next/server";
import { sendNotificationEmail } from "@/lib/email/send";

export async function POST(request: Request) {
  const expectedToken = process.env.INTERNAL_EMAIL_TOKEN;
  if (!expectedToken || request.headers.get("x-internal-token") !== expectedToken) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const { to, subject, html } = body as { to?: string; subject?: string; html?: string };
  if (typeof to !== "string" || typeof subject !== "string" || typeof html !== "string" || !to || !subject || !html) {
    return NextResponse.json({ ok: false, error: "Missing to, subject, or html" }, { status: 400 });
  }

  const result = await sendNotificationEmail({ to, subject, html });
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
