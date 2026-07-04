import { createHash } from "node:crypto";

export function digestCastingPassword(password: string): string {
  return createHash("sha256").update(password, "utf8").digest("hex");
}
