import { createHash } from "node:crypto";

export function computeSha256Hex(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}
