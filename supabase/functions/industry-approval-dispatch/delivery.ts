export type Delivery = { event_kind?: "approved" | "needs_information" | "submitted"; id: string; user_id: string; application_version: number; channel: "email" | "push"; destination: string; lease_id: string };
export type DeliveryResult = "sent" | "skipped" | "retry" | "failed";
export function responseResult(status: number): DeliveryResult {
  if (status >= 200 && status < 300) return "sent";
  if (status === 408 || status === 409 || status === 429 || status >= 500) return "retry";
  return "failed";
}
export function approvalURL(value: string | undefined): string {
  const url = new URL(value ?? "");
  if (url.protocol !== "https:" || url.pathname !== "/industry/approved" || url.username || url.password || url.search || url.hash) throw new Error("Configure INDUSTRY_APPROVAL_URL as the HTTPS approval landing page");
  return url.toString();
}
export function emailBody(row: Delivery, url: string) {
  if (row.event_kind === "submitted") {
    const statusURL = new URL("/talent-buyers/application", url).toString();
    return { from: "Motiion <notifications@motiion.io>", to: [row.destination],
      subject: "We received your Motiion industry application",
      text: `Your application is saved and is now in review with the Motiion team. No further action is needed right now. We’ll email you when you’re approved or if we need more information.\n\nCheck your application status:\n${statusURL}\n\nSign in with the account you used to apply. Submitting an application does not grant industry access or start a paid plan.` };
  }
  if (row.event_kind === "needs_information") {
    return { from: "Motiion <notifications@motiion.io>", to: [row.destination],
      subject: "Your Motiion application needs a little more information",
      text: `We’ve reviewed your industry application and need a little more information before we can continue.\n\nOpen Motiion to read the feedback, update your application, and submit it again:\n${url}\n\nSign in with the account you used to apply. Your application has not been approved yet.` };
  }
  // Plain text avoids interpolating profile or environment data into HTML.
  return { from: "Motiion <notifications@motiion.io>", to: [row.destination], subject: "Your Motiion Industry application is approved", text: `You’re approved. Discover talent, cast talent, and manage dancers on your projects.\n\nOpen Motiion to finish any remaining account setup and get started:\n${url}\n\nSign in to the account you used to apply. This link does not grant access to another account.` };
}
