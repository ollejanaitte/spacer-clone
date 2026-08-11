export const PACKAGE_FORMAT_VERSION = "1" as const;
export const PROJECT_JSON_ENTRY = "project.json";

export interface PackageFileEntry {
  readonly path: string;
  readonly size: number;
  readonly checksum: string;
}

export interface PackageManifest {
  readonly packageFormatVersion: string;
  readonly containerFormat: string;
  readonly projectId: string;
  readonly projectSchemaVersion: string;
  readonly createdAt: string;
  readonly files: readonly PackageFileEntry[];
}

export interface SpacerProjPackage {
  readonly manifest: PackageManifest;
  readonly files: ReadonlyArray<{ readonly path: string; readonly content: string }>;
}

export type PackageInspectResult =
  | { ok: true; package: SpacerProjPackage }
  | { ok: false; reason: string };

export const SPACER_PROJ_EXTENSION = ".spacerproj";
