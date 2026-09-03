import { createHash } from "node:crypto";

export function shortId(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}
