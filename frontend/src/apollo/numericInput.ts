export type ApolloNumericCommitResult =
  | { readonly ok: true; readonly value: number }
  | { readonly ok: false; readonly message: string };

const FULLWIDTH_DIGIT_OFFSET = 0xfee0;
const FULLWIDTH_PLUS = "＋";
const FULLWIDTH_MINUS = "－";
const FULLWIDTH_MINUS_ALT = "−";
const FULLWIDTH_DOT = "．";

function normalizeNumericTokenChar(char: string): string {
  const code = char.charCodeAt(0);
  if (code >= 0xff10 && code <= 0xff19) {
    return String.fromCharCode(code - FULLWIDTH_DIGIT_OFFSET);
  }
  if (char === FULLWIDTH_PLUS) return "+";
  if (char === FULLWIDTH_MINUS || char === FULLWIDTH_MINUS_ALT) return "-";
  if (char === FULLWIDTH_DOT) return ".";
  return char;
}

/** Normalizes accepted fullwidth ASCII numeric characters for commit-time parsing. */
export function normalizeApolloNumericDraft(value: string): string {
  const trimmed = value.trim();
  return Array.from(trimmed, normalizeNumericTokenChar).join("");
}

const INVALID_NUMERIC_PATTERN = /^[+-]?(\d+(\.\d+)?|\.\d+)$/;

/**
 * Commits a numeric draft string to a finite number.
 * Rejects kanji numerals, unit suffixes, grouping separators, and incomplete tokens.
 */
export function commitApolloNumericDraft(value: string): ApolloNumericCommitResult {
  const normalized = normalizeApolloNumericDraft(value);
  if (normalized.length === 0) {
    return { ok: false, message: "数値を入力してください。" };
  }
  if (!INVALID_NUMERIC_PATTERN.test(normalized)) {
    return { ok: false, message: "有効な数値を入力してください。" };
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return { ok: false, message: "有効な数値を入力してください。" };
  }
  return { ok: true, value: parsed };
}
