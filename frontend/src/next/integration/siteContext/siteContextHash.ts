import { createHash } from "node:crypto";

/**
 * Pure hashing / encoding helpers for the `.sitecontext` import adapter.
 *
 * Mirrors site-context-prototype `packages/core/src/util/canonicalize.ts`
 * (canonicalHash = canonicalize + sha256) so that the ExportEnvelope
 * `files[].checksum` (which the exporter records as `canonicalHash`) is
 * verified faithfully. Binary payloads (e.g. base64-decoded SCT1 bytes) are
 * verified with plain sha256, per the Wave 1 data contract (site-context-
 * spacer-data-contract.md §3.16).
 *
 * All functions are pure (node:crypto + TextEncoder/TextDecoder only), so
 * they run in the vitest node environment without browser APIs.
 */

const B64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const B64_LOOKUP: Int16Array = (() => {
  const table = new Int16Array(256);
  table.fill(-1);
  for (let i = 0; i < B64_ALPHABET.length; i++) {
    table[B64_ALPHABET.charCodeAt(i)] = i;
  }
  return table;
})();

function round12(x: number): number {
  return Math.round((x + Number.EPSILON) * 1e12) / 1e12;
}

function normalizeNumber(x: number): string {
  if (!Number.isFinite(x)) throw new Error("CANON-NON-FINITE");
  if (x < -1e12 || x > 1e12) throw new Error(`CANON-OUT-OF-RANGE: ${x}`);
  const r = round12(x);
  if (Object.is(r, -0)) return "0";
  return String(r);
}

function canonicalizeValue(v: unknown, inArray: boolean): string {
  if (v === undefined) {
    if (inArray) return "null";
    throw new Error("CANON-UNDEFINED-IN-OBJECT");
  }
  if (v === null) return "null";
  const t = typeof v;
  if (t === "number") return normalizeNumber(v as number);
  if (t === "boolean") return String(v);
  if (t === "string") return JSON.stringify(v);
  if (Array.isArray(v)) {
    return "[" + v.map((x) => canonicalizeValue(x, true)).join(",") + "]";
  }
  if (t === "object") {
    const obj = v as Record<string, unknown>;
    const keys = Object.keys(obj).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const parts: string[] = [];
    for (const k of keys) {
      const val = obj[k];
      if (val === undefined) continue;
      parts.push(JSON.stringify(k) + ":" + canonicalizeValue(val, false));
    }
    return "{" + parts.join(",") + "}";
  }
  throw new Error(`CANON-UNSUPPORTED-TYPE: ${t}`);
}

/** Deterministic canonical string (recursively sorted keys, numeric tokens). */
export function canonicalize(obj: unknown): string {
  return canonicalizeValue(obj, false);
}

export function sha256HexString(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function sha256HexBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** canonicalize + sha256 (deterministic hash; matches site-context canonicalHash). */
export async function canonicalHash(value: unknown): Promise<string> {
  return sha256HexString(canonicalize(value));
}

/** Pure base64 → bytes (no atob / btoa; works in node and browser). */
export function base64ToBytes(input: string): Uint8Array {
  const clean = input.replace(/[\r\n\t ]+/g, "").replace(/=+$/, "");
  const len = clean.length;
  const out = new Uint8Array(Math.floor((len * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let o = 0;
  for (let i = 0; i < len; i++) {
    const code = clean.charCodeAt(i);
    const value = code < 256 ? B64_LOOKUP[code] : -1;
    if (value < 0) throw new Error("B64-INVALID-CHAR");
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (buffer >> bits) & 0xff;
    }
  }
  return out.subarray(0, o);
}

export function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

/** True when the leading 4 bytes are the SCT1 magic. */
export function isSct1Bytes(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  return (
    bytes[0] === 0x53 && // 'S'
    bytes[1] === 0x43 && // 'C'
    bytes[2] === 0x54 && // 'T'
    bytes[3] === 0x31 // '1'
  );
}

export interface Sct1Header {
  readonly magic: string;
  readonly formatVersion: number;
  readonly flags: number;
  readonly width: number;
  readonly height: number;
  readonly cellSize: number;
  readonly originX: number;
  readonly originY: number;
  readonly noDataValue: number;
  readonly dataOffset: number;
}

export const SCT1_HEADER_SIZE = 42;

/**
 * Parse the SCT1 binary header (09章6節 layout). Throws on malformed magic /
 * version. Pure DataView implementation (node + browser).
 */
export function parseSct1Header(bytes: Uint8Array): Sct1Header {
  if (bytes.length < SCT1_HEADER_SIZE) throw new Error("TER-BAD-MAGIC");
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = String.fromCharCode(
    dv.getUint8(0),
    dv.getUint8(1),
    dv.getUint8(2),
    dv.getUint8(3),
  );
  if (magic !== "SCT1") throw new Error("TER-BAD-MAGIC");
  const formatVersion = dv.getUint16(4, true);
  if (formatVersion !== 1) throw new Error(`TER-BAD-FORMAT: ${formatVersion}`);
  const flags = dv.getUint32(6, true);
  if (flags & 1) throw new Error("TER-BAD-FORMAT: masked");
  return {
    magic,
    formatVersion,
    flags,
    width: dv.getUint32(10, true),
    height: dv.getUint32(14, true),
    cellSize: dv.getFloat32(18, true),
    originX: dv.getFloat64(22, true),
    originY: dv.getFloat64(30, true),
    noDataValue: dv.getFloat32(38, true),
    dataOffset: SCT1_HEADER_SIZE,
  };
}

/** min/max elevation across the SCT1 payload, excluding the noData sentinel. */
export function sct1ElevationRange(
  bytes: Uint8Array,
  header: Sct1Header,
): { readonly minElevation: number; readonly maxElevation: number } | null {
  const expectedBytes = header.dataOffset + header.width * header.height * 4;
  if (bytes.length < expectedBytes) {
    throw new Error("TER-TRUNCATED");
  }
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (let k = 0; k < header.width * header.height; k++) {
    const value = dv.getFloat32(header.dataOffset + k * 4, true);
    if (value === header.noDataValue) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return { minElevation: min, maxElevation: max };
}
