const prefix = "motiion:guest-receipt:";
export function saveGuestReceipt(sessionId: string, token: string) {
  if (!sessionId.startsWith("cs_") || !token || token.length > 2048) throw new Error("Guest receipt access could not be prepared. Please try again.");
  sessionStorage.setItem(`${prefix}${sessionId}`, token);
}
export function readGuestReceipt(sessionId: string): string | null {
  try { return sessionStorage.getItem(`${prefix}${sessionId}`); } catch { return null; }
}
export function requireGuestReceiptStorage() {
  try { sessionStorage.setItem(`${prefix}check`, "1"); sessionStorage.removeItem(`${prefix}check`); }
  catch { throw new Error("Allow browser storage or sign in before continuing to payment, so you can securely view your receipt."); }
}
