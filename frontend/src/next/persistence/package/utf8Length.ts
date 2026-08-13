/**
 * UTF-8 byte length helper (browser + node compatible).
 *
 * The .spacerproj package builder/inspector previously used Node's
 * `Buffer.byteLength(str, "utf8")`, which is undefined in the browser and
 * broke the export flow (ReferenceError: Buffer is not defined). TextEncoder
 * is available in both runtimes and produces identical byte counts.
 */

const utf8Encoder = new TextEncoder();

export function utf8ByteLength(value: string): number {
  return utf8Encoder.encode(value).length;
}
