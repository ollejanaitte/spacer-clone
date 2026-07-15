/** Shared contract family version checked into schemas/contracts/v0.1/. */
export const SHARED_CONTRACT_VERSION = "0.1.0" as const;

/** Stable URI prefix for JSON Schema `$id` values. */
export const CONTRACT_SCHEMA_ID_BASE =
  "https://spacer.local/schemas/contracts/v0.1" as const;

export function contractSchemaId(slug: string): string {
  return `${CONTRACT_SCHEMA_ID_BASE}/${slug}.schema.json`;
}
