import { createHash } from "node:crypto";
import { parseUuid, type UuidString } from "../uuid";

/** DNS namespace UUID used as the root for deterministic legacy ID derivation (RFC 4122). */
const LEGACY_ID_ROOT_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

function sha256Bytes(input: string): Uint8Array {
  const digest = createHash("sha256").update(input, "utf8").digest();
  return new Uint8Array(digest.buffer, digest.byteOffset, digest.byteLength);
}

/**
 * Derives a deterministic UUID (version-5 style) from a namespace and legacy identifier.
 * Same inputs always produce the same UUID; does not mutate inputs.
 */
export function deriveStableUuid(namespace: string, legacyId: string): UuidString {
  if (namespace.trim().length === 0) {
    throw new Error("deriveStableUuid namespace must be a non-empty string.");
  }
  if (legacyId.trim().length === 0) {
    throw new Error("deriveStableUuid legacyId must be a non-empty string.");
  }

  const bytes = sha256Bytes(`${LEGACY_ID_ROOT_NAMESPACE}|${namespace}|${legacyId}`);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes.slice(0, 16), (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
  const formatted = [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
  const parsed = parseUuid(formatted);
  if (parsed === undefined) {
    throw new Error("deriveStableUuid produced an invalid UUID.");
  }
  return parsed;
}
