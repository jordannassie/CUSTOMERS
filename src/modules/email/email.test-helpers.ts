import { randomBytes } from "node:crypto";

/** A fresh signing secret per run, so no secret-looking literal is committed (scan-secrets.sh). */
export function testSecret(): string {
  return randomBytes(32).toString("hex");
}
