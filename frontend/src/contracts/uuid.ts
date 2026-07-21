const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type UuidString = string & { readonly __brand: "UuidString" };

export interface RandomBytesSource {
  getRandomValues(bytes: Uint8Array): Uint8Array;
}

export class UuidGenerationUnavailableError extends Error {
  constructor(message = "Cryptographically secure UUID generation is unavailable.") {
    super(message);
    this.name = "UuidGenerationUnavailableError";
  }
}

function formatUuidFromBytes(bytes: Uint8Array): UuidString {
  const normalized = bytes.slice(0, 16);
  normalized[6] = (normalized[6] & 0x0f) | 0x40;
  normalized[8] = (normalized[8] & 0x3f) | 0x80;
  const hex = Array.from(normalized, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-") as UuidString;
}

function generateUuidFromBytesSource(source: RandomBytesSource): UuidString {
  const bytes = new Uint8Array(16);
  source.getRandomValues(bytes);
  return formatUuidFromBytes(bytes);
}

export function generateUuid(randomBytesSource?: RandomBytesSource): UuidString {
  if (randomBytesSource !== undefined) {
    return generateUuidFromBytesSource(randomBytesSource);
  }

  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID() as UuidString;
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    return generateUuidFromBytesSource({
      getRandomValues(bytes) {
        const generated = new Uint8Array(bytes.byteLength);
        crypto.getRandomValues(generated);
        bytes.set(generated);
        return bytes;
      },
    });
  }

  throw new UuidGenerationUnavailableError();
}

export function isValidUuid(value: string): value is UuidString {
  return UUID_PATTERN.test(value);
}

export function parseUuid(value: string): UuidString | undefined {
  return isValidUuid(value) ? value : undefined;
}
