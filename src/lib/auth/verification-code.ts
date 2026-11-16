/** Accept copy/pasted visual separators without changing letters or other invalid input. */
export function normalizeVerificationCode(value: string): string {
  return value.replace(/[\s\u002d\u2010-\u2015]/g, "");
}
