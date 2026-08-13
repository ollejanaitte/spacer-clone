/**
 * Deterministic AnalysisDocument entity ID derivation (Phase 7-01 A §4 FROZEN).
 *
 * RFC 4122 UUIDv5 style derivation using the fixed analysis namespace
 * `a12d8c1e-11f4-4d6b-9a2e-7f8c5d0e1b3a`. Same (kind, sourceEntityId) always
 * produces the same UUID. Does not mutate inputs.
 */

import { createHash } from "node:crypto";
import type { UuidString } from "../../../contracts/uuid";
import { parseUuid } from "../../../contracts/uuid";
import { ANALYSIS_ID_NAMESPACE } from "./analysisDocumentTypes";

function parseNamespaceHex(namespace: string): Buffer {
  const hex = namespace.replace(/-/g, "");
  if (!/^[0-9a-fA-F]{32}$/.test(hex)) {
    throw new Error("analysis namespace must be a UUID.");
  }
  return Buffer.from(hex, "hex");
}

/**
 * Derive a deterministic RFC 4122 v5 UUID from the analysis namespace.
 * kind is the entity kind (`node` / `member` / `material` / `section` /
 * `support` / `bearing` / `spring` / `foundationSpring` / `rigidLink` / `mpc`).
 */
export function deriveAnalysisEntityId(kind: string, sourceEntityId: string): UuidString {
  if (kind.trim().length === 0) {
    throw new Error("analysis entity kind must be non-empty.");
  }
  if (sourceEntityId.trim().length === 0) {
    throw new Error("analysis sourceEntityId must be non-empty.");
  }
  const namespaceBytes = parseNamespaceHex(ANALYSIS_ID_NAMESPACE);
  const nameBytes = Buffer.from(`${kind}:${sourceEntityId}`, "utf8");

  // RFC 4122 §4.3 (UUIDv5): SHA-1 over namespace + name; version 5, variant 10x.
  const digest = createHash("sha1").update(namespaceBytes).update(nameBytes).digest();
  const bytes = Buffer.from(digest.subarray(0, 16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  const formatted = [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
  const parsed = parseUuid(formatted);
  if (parsed === undefined) {
    throw new Error("deriveAnalysisEntityId produced an invalid UUID.");
  }
  return parsed;
}
