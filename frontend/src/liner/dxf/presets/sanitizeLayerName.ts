const INVALID_LAYER_CHARS = /[^A-Za-z0-9_-]+/g;
const LEADING_NON_ALPHA = /^[^A-Za-z]+/;

/**
 * Sanitize DXF layer names to stable ASCII identifiers.
 * Japanese and other non-ASCII characters are removed.
 */
export function sanitizeDxfLayerName(name: string, fallback = "LAYER"): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return fallback;
  }

  let sanitized = trimmed
    .normalize("NFKC")
    .replace(INVALID_LAYER_CHARS, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!sanitized || /[^\x00-\x7F]/.test(sanitized)) {
    sanitized = sanitized.replace(/[^\x00-\x7F]/g, "") || fallback;
  }

  if (LEADING_NON_ALPHA.test(sanitized)) {
    sanitized = `L_${sanitized}`;
  }

  if (!sanitized) {
    return fallback;
  }

  return sanitized.slice(0, 255);
}
