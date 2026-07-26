export type StrictNumericDraft =
  | { kind: "empty" }
  | { kind: "valid"; value: number }
  | { kind: "invalid" };

const STRICT_ASCII_DECIMAL = /^-?(?:\d+\.?\d*|\.\d+)$/;

/** Trim ASCII whitespace and full-width space (U+3000). */
export function trimNumericDraft(raw: string): string {
  return raw.replace(/^[\s\u3000]+|[\s\u3000]+$/g, "");
}

function containsFullWidthDigit(text: string): boolean {
  return /[\uFF10-\uFF19]/.test(text);
}

/**
 * Parse a free-form numeric draft without coercing empty input to zero.
 * Full-width digits are rejected (policy B — no silent normalize).
 */
export function parseStrictNumericDraft(raw: string): StrictNumericDraft {
  const trimmed = trimNumericDraft(raw);
  if (trimmed.length === 0) {
    return { kind: "empty" };
  }
  if (containsFullWidthDigit(trimmed)) {
    return { kind: "invalid" };
  }
  if (!STRICT_ASCII_DECIMAL.test(trimmed)) {
    return { kind: "invalid" };
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return { kind: "invalid" };
  }
  return { kind: "valid", value };
}
