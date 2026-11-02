/** Accept only same-origin application paths, never network-path references or auth loops. */
export function safeAuthReturnPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(value)) return null;
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(decoded)) return null;
    const url = new URL(value, "https://motiion.invalid");
    if (url.origin !== "https://motiion.invalid" || /^\/(?:auth|login|signup|reset-password|forgot-password)(?:\/|$)/.test(url.pathname)) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return null; }
}

export function resolveAuthCallbackOrigin(requestOrigin: string, forwardedHost: string | null, configuredOrigin?: string) {
  const request = new URL(requestOrigin);
  if (["localhost", "127.0.0.1", "[::1]"].includes(request.hostname)) return request.origin;
  // Forwarded hosts are not redirect authority. Only the explicitly configured deployment
  // origin may replace the request origin (some reverse proxies use an internal hostname).
  if (configuredOrigin && forwardedHost) {
    try {
      const configured = new URL(configuredOrigin);
      if (configured.protocol === "https:" && configured.host === forwardedHost) return configured.origin;
    } catch { /* use the request origin */ }
  }
  return request.origin;
}

export const EMAIL_RESEND_COOLDOWN_MS = 60_000;
export function resendSecondsRemaining(sentAt: number | null, now = Date.now()) {
  if (!sentAt || !Number.isFinite(sentAt)) return 0;
  return Math.max(0, Math.min(60, Math.ceil((sentAt + EMAIL_RESEND_COOLDOWN_MS - now) / 1000)));
}

export function authLinkErrorMessage(code: string | null) {
  if (code === "otp_expired" || code === "email_link_expired") return "This link has expired or has already been used. If you confirmed your email, log in. Otherwise, request a new confirmation email.";
  if (code === "pkce_verifier_missing" || code === "flow_state_not_found" || code === "flow_state_expired" || code === "bad_code_verifier" || code === "email_link_browser") return "Your email may already be confirmed. Log in here to continue, or open the newest link in the browser where you started signing up.";
  return "We couldn’t finish using that link. Try the newest email, request another link, or log in if you already confirmed your email.";
}

/** Recovery destinations follow the action; OAuth denial is not an email-confirmation failure. */
export function authCallbackFailurePath(code: string, purpose: "signin" | "oauth" | "recovery" | "email_change" = "signin") {
  const route = purpose === "email_change" ? "/auth/email-change" : purpose === "recovery" ? "/forgot-password" : purpose === "oauth" || code === "access_denied" || code === "unexpected_failure" ? "/login" : "/auth/link-error";
  return `${route}?error=${encodeURIComponent(code)}`;
}
