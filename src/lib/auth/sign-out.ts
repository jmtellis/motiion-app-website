/** Revoke this browser's session, then leave the protected document and its cache. */
export async function signOutLocally(
  auth: { signOut(options: { scope: "local" }): Promise<{ error: unknown }> },
  navigate: () => void,
) {
  const result = await auth.signOut({ scope: "local" });
  if (result.error) throw result.error;
  navigate();
}
