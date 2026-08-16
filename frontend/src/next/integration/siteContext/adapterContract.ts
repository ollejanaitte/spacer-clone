import type { ProjectModuleKey } from "../../project/schema";
import {
  PDC_METADATA_SLOT,
  PDC_MODULE_SLOTS,
  SITE_CONTEXT_SOURCE_CONCEPTS,
  SITE_CONTEXT_UNIFICATION_CONTRACT_VERSION,
  type PdcTargetSlot,
  type SiteContextSourceConcept,
} from "./contract";

/**
 * `.sitecontext` → SPACER Project Import Adapter contract (Wave 1 Lane B-3).
 *
 * This module FREEZES the adapter boundary: input shape, output report,
 * failure error codes, and version compatibility. It is a contract skeleton
 * only — the actual adapter implementation is B-4.
 *
 * Design base:
 * - docs/development/site-context-spacer-data-contract.md
 * - docs/development/site-context-spacer-field-mapping.md
 * - docs/development/site-context-spacer-adapter-interface.md
 * - docs/integration/site-context-unification/03_adapter_contract.md
 */

export const SITE_CONTEXT_ADAPTER_CONTRACT_VERSION = "1.0.0" as const;

/** Supported source package formats for `.sitecontext`. */
export const SUPPORTED_SITE_CONTEXT_PACKAGE_FORMAT = "sitecontext-package" as const;
export const SUPPORTED_SITE_CONTEXT_PACKAGE_VERSION = "1" as const;
export const SUPPORTED_SITE_CONTEXT_EXPORT_PROFILE = "sitecontext-v2" as const;

/** Source Project schema versions the adapter accepts (V1 is normalized to V2). */
export const SUPPORTED_SOURCE_SCHEMA_VERSIONS = ["1", "2"] as const;
export type SourceSchemaVersion = (typeof SUPPORTED_SOURCE_SCHEMA_VERSIONS)[number];

/** Target PDC schema version produced by the adapter. */
export const TARGET_PDC_SCHEMA_VERSION = "1.0.0" as const;
/** Target .spacerproj package format version (spacerproj-json-v1). */
export const TARGET_PACKAGE_FORMAT_VERSION = "1" as const;

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export interface SiteContextImportOptions {
  readonly asNew?: boolean;
  readonly targetProjectName?: string;
  readonly includeSource?: boolean;
  readonly availableBytes?: number;
  readonly strict?: boolean;
}

export interface SiteContextPackageFile {
  readonly path: string;
  readonly checksum: string;
  readonly size: number;
  readonly content: Uint8Array | string;
}

export interface SiteContextExportEnvelope {
  readonly format: string;
  readonly version: string;
  readonly exportProfile: string;
  readonly exportedAt: string;
  readonly revision: number;
  readonly projectId: string;
  readonly schemaVersion: string;
  readonly project: unknown; // ProjectV1 or ProjectV2 payload
  readonly files: readonly { readonly path: string; readonly checksum: string; readonly size: number }[];
  readonly guaranteeLevel?: "canonical-restorable" | "source-complete";
  readonly excludedSources?: readonly { readonly sourceDatasetId: string; readonly reason: string }[];
}

export interface SiteContextPackage {
  readonly envelope: SiteContextExportEnvelope;
  readonly files: readonly SiteContextPackageFile[];
}

export interface SiteContextImportInput {
  readonly package: SiteContextPackage;
  readonly options?: SiteContextImportOptions;
  readonly sourceMetadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

export interface SiteContextWarning {
  readonly code: string;
  readonly message: string;
  readonly path?: string;
}

export interface SiteContextUnsupportedField {
  readonly path: string;
  readonly reason: "unsupported" | "deferred";
  readonly notes: string;
}

export interface SiteContextConversionDiagnostics {
  readonly migratedV1ToV2: boolean;
  readonly selectionAreaMigrated: boolean;
  readonly sourceCrsUnknownCount: number;
  readonly staleTerrainCount: number;
  readonly excludedSources: readonly { readonly sourceId: string; readonly reason: string }[];
}

export interface SiteContextCrsImportResult {
  readonly projectCoordinateContextId: string;
  readonly epsg: number | null;
  readonly crsKind: "known" | "local" | "unknown";
  readonly horizontalUnits: "m" | "degree";
  readonly supported: boolean;
}

export interface SiteContextTerrainImportResult {
  readonly terrainCount: number;
  readonly importedTerrainIds: readonly string[];
  readonly sct1Count: number;
  readonly missingAssetCount: number;
  readonly checksumVerifiedCount: number;
}

export interface SiteContextVersionInfo {
  readonly packageFormat: string;
  readonly packageVersion: string;
  readonly exportProfile: string;
  readonly sourceSchemaVersion: string;
  readonly targetSchemaVersion: string;
  readonly targetPackageFormatVersion: string;
}

export interface SiteContextImportReport {
  readonly projectId: string;
  readonly projectName: string;
  readonly schemaVersion: string;
  readonly sourceSchemaVersion: string;
  readonly warnings: readonly SiteContextWarning[];
  readonly unsupportedFields: readonly SiteContextUnsupportedField[];
  readonly diagnostics: SiteContextConversionDiagnostics;
  readonly crsImport: SiteContextCrsImportResult;
  readonly terrainImport: SiteContextTerrainImportResult;
  readonly version: SiteContextVersionInfo;
}

export type SiteContextImportResult =
  | { readonly ok: true; readonly projectId: string; readonly report: SiteContextImportReport }
  | { readonly ok: false; readonly errorCode: SiteContextImportErrorCode; readonly message: string; readonly report?: SiteContextImportReport };

// ---------------------------------------------------------------------------
// Failure conditions (fail-closed)
// ---------------------------------------------------------------------------

export const SC_IMPORT_ERROR_CODES = [
  "SC-ERR-UNSUPPORTED-CRS",
  "SC-ERR-CORRUPT-SOURCE",
  "SC-ERR-MISSING-REQUIRED",
  "SC-ERR-INCOMPATIBLE-VERSION",
  "SC-ERR-INVALID-TERRAIN-REF",
  "SC-ERR-SCHEMA-FAILED",
  "SC-ERR-TARGET-INVALID",
] as const;
export type SiteContextImportErrorCode = (typeof SC_IMPORT_ERROR_CODES)[number];

export function isSiteContextImportErrorCode(value: string): value is SiteContextImportErrorCode {
  return (SC_IMPORT_ERROR_CODES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Warning code prefix convention
// ---------------------------------------------------------------------------

export const SITE_CONTEXT_WARNING_CODE_PREFIX = "SC-WARN-" as const;

// ---------------------------------------------------------------------------
// Public surface (Lane T / V / U / S consumers)
// ---------------------------------------------------------------------------

/**
 * Public adapter entry points (implemented in B-4). Declared here so the
 * boundary shape is frozen before implementation.
 */
export interface SiteContextImportAdapter {
  /** Pre-import validation; never mutates the project store. */
  readonly inspect: (input: SiteContextImportInput) => SiteContextInspectResult;
  /** Apply the import into the Project Data Core store. */
  readonly import: (input: SiteContextImportInput) => SiteContextImportResult;
}

export type SiteContextInspectResult =
  | { readonly ok: true; readonly report: SiteContextImportReport }
  | { readonly ok: false; readonly errorCode: SiteContextImportErrorCode; readonly message: string; readonly report?: SiteContextImportReport };

// ---------------------------------------------------------------------------
// Mapping boundary validation helpers (contract freeze checks)
// ---------------------------------------------------------------------------

/** Every source concept must map into an existing PDC slot. */
export function assertSourceConceptsCovered(
  entries: readonly { readonly sourceConcept: SiteContextSourceConcept; readonly targetSlot: PdcTargetSlot }[],
): void {
  const covered = entries.map((e) => e.sourceConcept);
  const expected = [...SITE_CONTEXT_SOURCE_CONCEPTS];
  const missing = expected.filter((c) => !covered.includes(c));
  if (missing.length > 0) {
    throw new Error(`SC-CONTRACT-MISSING-CONCEPTS: ${missing.join(",")}`);
  }
  for (const entry of entries) {
    const validSlot = entry.targetSlot === PDC_METADATA_SLOT || (PDC_MODULE_SLOTS as readonly string[]).includes(entry.targetSlot);
    if (!validSlot) {
      throw new Error(`SC-CONTRACT-INVALID-SLOT: ${entry.targetSlot}`);
    }
  }
}

/** Re-export for downstream lanes. */
export type { ProjectModuleKey };
export { SITE_CONTEXT_UNIFICATION_CONTRACT_VERSION };
