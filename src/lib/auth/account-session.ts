/** Decide whether a protected document still belongs to the browser's account. */
export function accountSessionChanged(
  event: string,
  expectedUserId: string,
  sessionUserId: string | null,
): boolean {
  if (sessionUserId) return sessionUserId !== expectedUserId;
  // A null startup result can reflect client initialization/refresh failure;
  // the server already authorized this document. Only explicit sign-out ends it.
  return event === "SIGNED_OUT";
}
