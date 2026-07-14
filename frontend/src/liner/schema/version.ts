export const PROJECT_LINER_METADATA_SCHEMA_VERSION = "0.1.0" as const;

export const CURRENT_LINER_DRAFT_SCHEMA_VERSION = "0.3.0" as const;
export const LINER_DRAFT_SCHEMA_VERSION = CURRENT_LINER_DRAFT_SCHEMA_VERSION;

export const SUPPORTED_LINER_DRAFT_SCHEMA_VERSIONS = ["0.1.0", "0.2.0", "0.3.0"] as const;

export type LinerDraftSchemaVersion = "0.3.0";
export type SupportedLinerDraftSchemaVersion =
  (typeof SUPPORTED_LINER_DRAFT_SCHEMA_VERSIONS)[number];

export function isSupportedVersion(v: string): boolean {
  return (SUPPORTED_LINER_DRAFT_SCHEMA_VERSIONS as readonly string[]).includes(
    v,
  );
}

export function readDraftSchemaVersion(metadata: unknown): string | null {
  if (typeof metadata !== "object" || metadata === null) {
    return null;
  }
  const draftSchemaVersion = (metadata as Record<string, unknown>)
    .draftSchemaVersion;
  if (typeof draftSchemaVersion === "string") {
    return draftSchemaVersion;
  }
  return null;
}
