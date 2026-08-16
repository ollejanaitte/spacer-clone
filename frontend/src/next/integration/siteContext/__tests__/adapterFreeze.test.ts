import { describe, expect, it } from "vitest";
import { PROJECT_MODULE_KEYS } from "../../../project/schema";
import {
  SITE_CONTEXT_SOURCE_CONCEPTS,
  SITE_CONTEXT_UNIFICATION_CONTRACT_VERSION,
  PDC_METADATA_SLOT,
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
} from "../adapterContract";
import {
  createSiteContextImportAdapter,
  mapSiteContextPackageToProject,
  siteContextImportAdapter,
} from "../importAdapter";

/**
 * B-07 Adapter Freeze — public surface の accidental field drift 検知。
 *
 * 本テストは Adapter 契約 (inspect/import)、mapping manifest、error code、
 * version 定数、公開 I/F が「意図せず」変化した場合に red になることを保証する。
 * 契約変更は意図的である必要があり、本テストの期待値更新と
 * docs/development/site-context-spacer-adapter-interface.md の更新を対にする。
 */

describe("B-07 Adapter Freeze (public surface drift guard)", () => {
  it("frozen: adapter contract version equals unification contract version", () => {
    expect(SITE_CONTEXT_ADAPTER_CONTRACT_VERSION).toBe("1.0.0");
    expect(SITE_CONTEXT_ADAPTER_CONTRACT_VERSION).toBe(SITE_CONTEXT_UNIFICATION_CONTRACT_VERSION);
  });

  it("frozen: source package format / version / profile / source schema versions", () => {
    expect(SUPPORTED_SITE_CONTEXT_PACKAGE_FORMAT).toBe("sitecontext-package");
    expect(SUPPORTED_SITE_CONTEXT_PACKAGE_VERSION).toBe("1");
    expect(SUPPORTED_SITE_CONTEXT_EXPORT_PROFILE).toBe("sitecontext-v2");
    expect(SUPPORTED_SOURCE_SCHEMA_VERSIONS).toEqual(["1", "2"]);
    expect(TARGET_PDC_SCHEMA_VERSION).toBe("1.0.0");
    expect(TARGET_PACKAGE_FORMAT_VERSION).toBe("1");
  });

  it("frozen: error code list is exactly the seven fail-closed codes", () => {
    expect(SC_IMPORT_ERROR_CODES).toEqual([
      "SC-ERR-UNSUPPORTED-CRS",
      "SC-ERR-CORRUPT-SOURCE",
      "SC-ERR-MISSING-REQUIRED",
      "SC-ERR-INCOMPATIBLE-VERSION",
      "SC-ERR-INVALID-TERRAIN-REF",
      "SC-ERR-SCHEMA-FAILED",
      "SC-ERR-TARGET-INVALID",
    ]);
  });

  it("frozen: warning code prefix convention", () => {
    expect(SITE_CONTEXT_WARNING_CODE_PREFIX).toBe("SC-WARN-");
  });

  it("frozen: mapping manifest covers exactly the eight source concepts once", () => {
    const covered = SITE_CONTEXT_UNIFICATION_MANIFEST.entries.map((e) => e.sourceConcept);
    expect(covered).toEqual([...SITE_CONTEXT_SOURCE_CONCEPTS]);
    expect(new Set(covered).size).toBe(SITE_CONTEXT_SOURCE_CONCEPTS.length);
  });

  it("frozen: manifest entries map only into existing PDC slots", () => {
    const validSlots = [...PROJECT_MODULE_KEYS, PDC_METADATA_SLOT];
    for (const entry of SITE_CONTEXT_UNIFICATION_MANIFEST.entries) {
      expect(validSlots).toContain(entry.targetSlot);
    }
  });

  it("frozen: required concepts are exactly coordinateContexts/projectCoordinateContextId/siteContext", () => {
    const required = SITE_CONTEXT_UNIFICATION_MANIFEST.entries
      .filter((e) => e.required)
      .map((e) => e.sourceConcept);
    expect(required).toEqual([
      "coordinateContexts",
      "projectCoordinateContextId",
      "siteContext",
    ]);
  });

  it("frozen: public adapter surface exposes createSiteContextImportAdapter / siteContextImportAdapter / mapSiteContextPackageToProject", () => {
    expect(typeof createSiteContextImportAdapter).toBe("function");
    expect(typeof mapSiteContextPackageToProject).toBe("function");
    expect(siteContextImportAdapter).toBeDefined();
    expect(typeof siteContextImportAdapter.inspect).toBe("function");
    expect(typeof siteContextImportAdapter.import).toBe("function");
  });

  it("frozen: public adapter function arities (inspect/import take a single input)", () => {
    expect(createSiteContextImportAdapter.name).toBe("createSiteContextImportAdapter");
    expect(mapSiteContextPackageToProject.length).toBe(1);
    expect(siteContextImportAdapter.inspect.length).toBe(1);
    expect(siteContextImportAdapter.import.length).toBe(1);
  });
});