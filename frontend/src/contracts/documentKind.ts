export const DOCUMENT_KINDS = [
  "engineering-project",
  "road-design",
  "bridge-frame-analysis",
  "road-to-frame-transfer-package",
  "transfer-record",
  "persisted-result",
  "coordinate-context",
  "unit-context",
  "revision-metadata",
  "validation-result",
  "unknown-field-store",
  "migration-record",
] as const;

export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

const DOCUMENT_KIND_SET = new Set<string>(DOCUMENT_KINDS);

export function isDocumentKind(value: string): value is DocumentKind {
  return DOCUMENT_KIND_SET.has(value);
}
