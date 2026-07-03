import type { JipLinerImporterProject, ImporterSchemaVersion } from "./types";

export const IMPORTER_SCHEMA_VERSION = "0.1.0" as const;

export const SUPPORTED_IMPORTER_SCHEMA_VERSIONS = [
  "0.1.0",
] as const satisfies readonly ImporterSchemaVersion[];

export type SupportedImporterSchemaVersion =
  (typeof SUPPORTED_IMPORTER_SCHEMA_VERSIONS)[number];

export function isSupportedImporterVersion(
  version: string,
): version is SupportedImporterSchemaVersion {
  return (SUPPORTED_IMPORTER_SCHEMA_VERSIONS as readonly string[]).includes(
    version,
  );
}

export function getImporterSchemaVersion(
  project: JipLinerImporterProject,
): string | null {
  const version = project.liner?.importerSchemaVersion;
  return typeof version === "string" ? version : null;
}
