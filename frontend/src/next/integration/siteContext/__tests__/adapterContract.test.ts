import { describe, expect, it } from "vitest";
import { PROJECT_MODULE_KEYS } from "../../../project/schema";
import { createEmptyProject } from "../../../project/projectDataCore";
import {
  SITE_CONTEXT_SOURCE_CONCEPTS,
  SITE_CONTEXT_UNIFICATION_CONTRACT_VERSION,
} from "../contract";
import { SITE_CONTEXT_UNIFICATION_MANIFEST } from "../mappingManifest";
import {
  SC_IMPORT_ERROR_CODES,
  SITE_CONTEXT_ADAPTER_CONTRACT_VERSION,
  SITE_CONTEXT_WARNING_CODE_PREFIX,
  SUPPORTED_SITE_CONTEXT_EXPORT_PROFILE,
  SUPPORTED_SITE_CONTEXT_PACKAGE_FORMAT,
  SUPPORTED_SITE_CONTEXT_PACKAGE_VERSION,
  SUPPORTED_SOURCE_SCHEMA_VERSIONS,
  TARGET_PACKAGE_FORMAT_VERSION,
  TARGET_PDC_SCHEMA_VERSION,
  assertSourceConceptsCovered,
  isSiteContextImportErrorCode,
  type SiteContextImportAdapter,
  type SiteContextImportReport,
  type SiteContextImportResult,
} from "../adapterContract";

describe("siteContext adapter contract (Wave 1 Lane B-3)", () => {
  it("is versioned consistently with the unification contract", () => {
    expect(SITE_CONTEXT_ADAPTER_CONTRACT_VERSION).toBe("1.0.0");
    expect(SITE_CONTEXT_ADAPTER_CONTRACT_VERSION).toBe(SITE_CONTEXT_UNIFICATION_CONTRACT_VERSION);
  });

  it("freezes source package format / version / profile", () => {
    expect(SUPPORTED_SITE_CONTEXT_PACKAGE_FORMAT).toBe("sitecontext-package");
    expect(SUPPORTED_SITE_CONTEXT_PACKAGE_VERSION).toBe("1");
    expect(SUPPORTED_SITE_CONTEXT_EXPORT_PROFILE).toBe("sitecontext-v2");
  });

  it("accepts V1 and V2 source schema versions and targets PDC 1.0.0", () => {
    expect(SUPPORTED_SOURCE_SCHEMA_VERSIONS).toEqual(["1", "2"]);
    expect(TARGET_PDC_SCHEMA_VERSION).toBe("1.0.0");
    expect(TARGET_PACKAGE_FORMAT_VERSION).toBe("1");
  });

  it("freezes the fail-closed error code list", () => {
    expect(SC_IMPORT_ERROR_CODES).toEqual([
      "SC-ERR-UNSUPPORTED-CRS",
      "SC-ERR-CORRUPT-SOURCE",
      "SC-ERR-MISSING-REQUIRED",
      "SC-ERR-INCOMPATIBLE-VERSION",
      "SC-ERR-INVALID-TERRAIN-REF",
      "SC-ERR-SCHEMA-FAILED",
      "SC-ERR-TARGET-INVALID",
    ]);
    for (const code of SC_IMPORT_ERROR_CODES) {
      expect(isSiteContextImportErrorCode(code)).toBe(true);
    }
    expect(isSiteContextImportErrorCode("SC-ERR-UNKNOWN")).toBe(false);
  });

  it("declares the warning code prefix convention", () => {
    expect(SITE_CONTEXT_WARNING_CODE_PREFIX).toBe("SC-WARN-");
  });

  it("maps every source concept into an existing PDC slot (no drift vs manifest)", () => {
    expect(() =>
      assertSourceConceptsCovered(SITE_CONTEXT_UNIFICATION_MANIFEST.entries),
    ).not.toThrow();
  });

  it("keeps the manifest concept coverage aligned with the frozen source concepts", () => {
    const covered = SITE_CONTEXT_UNIFICATION_MANIFEST.entries.map((e) => e.sourceConcept);
    expect(covered).toEqual([...SITE_CONTEXT_SOURCE_CONCEPTS]);
  });

  it("produces a union result type with a frozen success branch", () => {
    const ok: SiteContextImportResult = {
      ok: true,
      projectId: "00000000-0000-4000-8000-000000000000",
      report: {
        projectId: "00000000-0000-4000-8000-000000000000",
        projectName: "sample",
        schemaVersion: "1.0.0",
        sourceSchemaVersion: "2",
        warnings: [],
        unsupportedFields: [],
        diagnostics: {
          migratedV1ToV2: false,
          selectionAreaMigrated: false,
          sourceCrsUnknownCount: 0,
          staleTerrainCount: 0,
          excludedSources: [],
        },
        crsImport: {
          projectCoordinateContextId: "ctx-1",
          epsg: 6677,
          crsKind: "known",
          horizontalUnits: "m",
          supported: true,
        },
        terrainImport: {
          terrainCount: 1,
          importedTerrainIds: ["t-1"],
          sct1Count: 1,
          missingAssetCount: 0,
          checksumVerifiedCount: 1,
        },
        version: {
          packageFormat: "sitecontext-package",
          packageVersion: "1",
          exportProfile: "sitecontext-v2",
          sourceSchemaVersion: "2",
          targetSchemaVersion: "1.0.0",
          targetPackageFormatVersion: "1",
        },
      },
    };
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.report.version.targetSchemaVersion).toBe("1.0.0");
    }
  });

  it("produces a union result type with a frozen failure branch", () => {
    const err: SiteContextImportResult = {
      ok: false,
      errorCode: "SC-ERR-UNSUPPORTED-CRS",
      message: "project CRS geographic is not supported",
    };
    expect(err.ok).toBe(false);
    expect(err.errorCode).toBe("SC-ERR-UNSUPPORTED-CRS");
  });

  it("declares a report shape with all required fields (contract freeze)", () => {
    const report: SiteContextImportReport = {
      projectId: "p-1",
      projectName: "n",
      schemaVersion: "1.0.0",
      sourceSchemaVersion: "2",
      warnings: [],
      unsupportedFields: [],
      diagnostics: {
        migratedV1ToV2: false,
        selectionAreaMigrated: false,
        sourceCrsUnknownCount: 0,
        staleTerrainCount: 0,
        excludedSources: [],
      },
      crsImport: {
        projectCoordinateContextId: "ctx-1",
        epsg: null,
        crsKind: "local",
        horizontalUnits: "m",
        supported: true,
      },
      terrainImport: {
        terrainCount: 0,
        importedTerrainIds: [],
        sct1Count: 0,
        missingAssetCount: 0,
        checksumVerifiedCount: 0,
      },
      version: {
        packageFormat: "sitecontext-package",
        packageVersion: "1",
        exportProfile: "sitecontext-v2",
        sourceSchemaVersion: "2",
        targetSchemaVersion: "1.0.0",
        targetPackageFormatVersion: "1",
      },
    };
    expect(report.schemaVersion).toBe("1.0.0");
    expect(report.warnings).toEqual([]);
    expect(report.unsupportedFields).toEqual([]);
  });

  it("declares the adapter surface for downstream lanes (T/V/U/S)", () => {
    const adapter: SiteContextImportAdapter = {
      inspect: () => ({ ok: false, errorCode: "SC-ERR-MISSING-REQUIRED", message: "not implemented (B-4)" }),
      import: () => ({ ok: false, errorCode: "SC-ERR-MISSING-REQUIRED", message: "not implemented (B-4)" }),
    };
    expect(typeof adapter.inspect).toBe("function");
    expect(typeof adapter.import).toBe("function");
  });

  it("keeps the terrain module slot available for imported terrainDocument", () => {
    const project = createEmptyProject("imported");
    expect(project.modules.terrain).toEqual({});
    expect(PROJECT_MODULE_KEYS).toContain("terrain");
  });
});
