/**
 * Deep-normalize JSON Schema documents for order-independent semantic comparison.
 */
export function normalizeJsonSchema(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeJsonSchema(entry));
  }

  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const normalized: Record<string, unknown> = {};
    const keys = Object.keys(record).sort();
    for (const key of keys) {
      normalized[key] = normalizeJsonSchema(record[key]);
    }
    return normalized;
  }

  return value;
}

export function jsonSchemaSemanticallyEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(normalizeJsonSchema(left)) === JSON.stringify(normalizeJsonSchema(right));
}
