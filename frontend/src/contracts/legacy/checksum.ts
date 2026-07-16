import { createHash } from "node:crypto";
import {
  CONTENT_CHECKSUM_ALGORITHM,
  parseContentChecksum,
  type ContentChecksum,
} from "../contentChecksum";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Deterministic canonical JSON for checksums. Sorts object keys; rejects non-JSON values.
 */
export function canonicalJsonForChecksum(value: unknown): string {
  if (value === null) {
    return "null";
  }
  const valueType = typeof value;
  if (valueType === "string" || valueType === "boolean") {
    return JSON.stringify(value);
  }
  if (valueType === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("canonicalJsonForChecksum rejects non-finite numbers.");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJsonForChecksum(entry)).join(",")}]`;
  }
  if (!isPlainObject(value)) {
    throw new Error("canonicalJsonForChecksum rejects non-JSON values.");
  }
  const entries = Object.keys(value)
    .sort((left, right) => left.localeCompare(right))
    .map((key) => `${JSON.stringify(key)}:${canonicalJsonForChecksum(value[key])}`);
  return `{${entries.join(",")}}`;
}

export function computeSha256Hex(value: unknown): string {
  return createHash("sha256").update(canonicalJsonForChecksum(value), "utf8").digest("hex");
}

export function computeContentChecksum(value: unknown): ContentChecksum {
  const checksum = parseContentChecksum({
    algorithm: CONTENT_CHECKSUM_ALGORITHM,
    hexDigest: computeSha256Hex(value),
  });
  if (checksum === undefined) {
    throw new Error("Failed to compute content checksum.");
  }
  return checksum;
}
