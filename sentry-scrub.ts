import type { ErrorEvent } from "@sentry/nextjs";

const SENSITIVE_KEYS = [
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "email",
  "phone",
  "ssn",
  "credit_card",
];

function scrubObject(value: unknown, depth = 0): unknown {
  if (depth > 6 || value == null) return value;
  if (Array.isArray(value)) return value.map((item) => scrubObject(item, depth + 1));
  if (typeof value !== "object") return value;

  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_KEYS.some((s) => lower.includes(s))) {
      result[key] = "[Filtered]";
    } else {
      result[key] = scrubObject(nested, depth + 1);
    }
  }
  return result;
}

export function beforeSendScrub(event: ErrorEvent): ErrorEvent | null {
  if (event.request?.headers) {
    event.request.headers = scrubObject(event.request.headers) as Record<string, string>;
  }
  if (event.extra) {
    event.extra = scrubObject(event.extra) as Record<string, unknown>;
  }
  if (event.contexts) {
    event.contexts = scrubObject(event.contexts) as ErrorEvent["contexts"];
  }
  return event;
}
