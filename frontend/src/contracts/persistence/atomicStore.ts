import { createHash } from "node:crypto";
import {
  CONTENT_CHECKSUM_ALGORITHM,
  parseContentChecksum,
  type ContentChecksum,
} from "../contentChecksum";
import { canonicalJsonForChecksum } from "../legacy/checksum";
import type { AtomicJsonStorePort } from "./types";

export function serializeTargetDocument(document: unknown): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}

export function parseRawJson(raw: string):
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly causeMessage: string } {
  try {
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch (cause) {
    const causeMessage = cause instanceof Error ? cause.message : String(cause);
    return { ok: false, causeMessage };
  }
}

export function checksumForSerializedDocument(document: unknown): ContentChecksum {
  const hexDigest = createHash("sha256")
    .update(canonicalJsonForChecksum(document), "utf8")
    .digest("hex");
  const checksum = parseContentChecksum({
    algorithm: CONTENT_CHECKSUM_ALGORITHM,
    hexDigest,
  });
  if (checksum === undefined) {
    throw new Error("Failed to compute document checksum.");
  }
  return checksum;
}

/**
 * In-memory atomic JSON store used for frontend integration tests and local dry-runs.
 * Mirrors backend AtomicJsonStore semantics: create-only conflicts and checksum preconditions.
 */
export function createInMemoryAtomicJsonStore(): AtomicJsonStorePort {
  const files = new Map<string, { readonly payload: string; readonly checksum: string }>();

  function checksumBytes(payload: string): string {
    return createHash("sha256").update(payload, "utf8").digest("hex");
  }

  return {
    store(path, data, options = {}) {
      const payload = serializeTargetDocument(data);
      const checksum = checksumBytes(payload);
      const existing = files.get(path);

      if (options.createOnly === true && existing !== undefined) {
        throw new Error(`ALREADY_EXISTS: ${path}`);
      }
      if (options.expectedChecksum !== undefined) {
        if (existing === undefined) {
          throw new Error(`TARGET_NOT_FOUND: ${path}`);
        }
        if (existing.checksum !== options.expectedChecksum) {
          throw new Error(`CHECKSUM_MISMATCH: ${path}`);
        }
      }

      files.set(path, { payload, checksum });
      return {
        path,
        checksum,
        bytesWritten: Buffer.byteLength(payload, "utf8"),
      };
    },
    read(path) {
      const existing = files.get(path);
      if (existing === undefined) {
        throw new Error(`TARGET_NOT_FOUND: ${path}`);
      }
      return JSON.parse(existing.payload) as unknown;
    },
    checksumForPath(path) {
      const existing = files.get(path);
      if (existing === undefined) {
        throw new Error(`TARGET_NOT_FOUND: ${path}`);
      }
      return existing.checksum;
    },
  };
}
