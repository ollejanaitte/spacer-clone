/**
 * Deterministic AnalysisDocument entity ID derivation (Phase 7-01 A §4 FROZEN).
 *
 * RFC 4122 UUIDv5 style derivation using the fixed analysis namespace
 * `a12d8c1e-11f4-4d6b-9a2e-7f8c5d0e1b3a`. Same (kind, sourceEntityId) always
 * produces the same UUID. Does not mutate inputs.
 *
 * Browser-safe: the original implementation used Node `Buffer` + `createHash`
 * which is undefined in the browser. The SHA-1 digest is implemented inline
 * (deterministic) so the derived UUIDs are byte-identical to the Node path.
 */

import type { UuidString } from "../../../contracts/uuid";
import { parseUuid } from "../../../contracts/uuid";
import { ANALYSIS_ID_NAMESPACE } from "./analysisDocumentTypes";

/** RFC 4122 §4.3 UUIDv5 namespace bytes from a UUID string. */
function parseNamespaceHex(namespace: string): Uint8Array {
  const hex = namespace.replace(/-/g, "");
  if (!/^[0-9a-fA-F]{32}$/.test(hex)) {
    throw new Error("analysis namespace must be a UUID.");
  }
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function utf8Bytes(input: string): Uint8Array {
  return new TextEncoder().encode(input);
}

/**
 * Deterministic SHA-1 (FIPS 180-4). Byte-identical to Node's
 * `createHash("sha1").update(data).digest()`.
 */
function sha1Bytes(data: Uint8Array): Uint8Array {
  const bitLen = data.length * 8;
  const paddedLength = Math.ceil((data.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLen / 0x100000000));
  view.setUint32(paddedLength - 4, bitLen >>> 0);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;
  const words = new Uint32Array(80);

  const rotl = (value: number, shift: number): number =>
    ((value << shift) | (value >>> (32 - shift))) >>> 0;

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      words[i] = view.getUint32(offset + i * 4);
    }
    for (let i = 16; i < 80; i += 1) {
      const w = words[i - 3]! ^ words[i - 8]! ^ words[i - 14]! ^ words[i - 16]!;
      words[i] = rotl(w, 1);
    }
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    for (let i = 0; i < 80; i += 1) {
      let f: number;
      let k: number;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const temp = (rotl(a, 5) + f + e + k + words[i]!) >>> 0;
      e = d;
      d = c;
      c = rotl(b, 30);
      b = a;
      a = temp;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  const out = new Uint8Array(20);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0);
  outView.setUint32(4, h1);
  outView.setUint32(8, h2);
  outView.setUint32(12, h3);
  outView.setUint32(16, h4);
  return out;
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
  const nameBytes = utf8Bytes(`${kind}:${sourceEntityId}`);

  // RFC 4122 §4.3 (UUIDv5): SHA-1 over namespace + name; version 5, variant 10x.
  const combined = new Uint8Array(namespaceBytes.length + nameBytes.length);
  combined.set(namespaceBytes, 0);
  combined.set(nameBytes, namespaceBytes.length);
  const digest = sha1Bytes(combined);
  const bytes = digest.slice(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const toHex = (byte: number): string => byte.toString(16).padStart(2, "0");
  const hex = Array.from(bytes, toHex).join("");
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
