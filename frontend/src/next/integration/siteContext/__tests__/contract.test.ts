import { describe, expect, it } from "vitest";
import { PROJECT_MODULE_KEYS, type ProjectModuleKey } from "../../../project/schema";
import { createEmptyProject } from "../../../project/projectDataCore";
import { createTerrainModuleRecord, type TerrainDocument } from "../../../modules/terrainModule";
import {
  PDC_METADATA_SLOT,
  PDC_MODULE_SLOTS,
  SITE_CONTEXT_SOURCE_CONCEPTS,
  SITE_CONTEXT_UNIFICATION_CONTRACT_VERSION,
  isPdcTargetSlot,
  isSiteContextSourceConcept,
  type PdcTargetSlot,
  type SiteContextMappingEntry,
} from "../contract";
import { SITE_CONTEXT_UNIFICATION_MANIFEST } from "../mappingManifest";

describe("siteContext unification contract", () => {
  it("is versioned and points at the canonical repository", () => {
    expect(SITE_CONTEXT_UNIFICATION_MANIFEST.contractVersion).toBe(
      SITE_CONTEXT_UNIFICATION_CONTRACT_VERSION,
    );
    expect(SITE_CONTEXT_UNIFICATION_MANIFEST.canonicalRepository).toBe("spacer-clone");
    expect(SITE_CONTEXT_UNIFICATION_MANIFEST.absorbedRepository).toBe("site-context-prototype");
  });

  it("declares the canonical package format as spacerproj-json-v1", () => {
    expect(SITE_CONTEXT_UNIFICATION_MANIFEST.packageFormat).toBe("spacerproj-json-v1");
  });

  it("maps every entry into an existing Project Data Core slot", () => {
    for (const entry of SITE_CONTEXT_UNIFICATION_MANIFEST.entries) {
      expect(
        isPdcTargetSlot(entry.targetSlot),
        `targetSlot ${entry.targetSlot} must be a PDC module key or metadata`,
      ).toBe(true);
    }
  });

  it("covers every site-context source concept exactly once", () => {
    const covered = SITE_CONTEXT_UNIFICATION_MANIFEST.entries.map((e) => e.sourceConcept);
    expect(covered).toEqual([...SITE_CONTEXT_SOURCE_CONCEPTS]);
    expect(new Set(covered).size).toBe(SITE_CONTEXT_SOURCE_CONCEPTS.length);
  });

  it("requires the core concepts for a valid import", () => {
    const required = SITE_CONTEXT_UNIFICATION_MANIFEST.entries
      .filter((e) => e.required)
      .map((e) => e.sourceConcept)
      .sort();
    expect(required).toEqual(["coordinateContexts", "projectCoordinateContextId", "siteContext"]);
  });

  it("declares slots that exist in the real module registry", () => {
    const moduleSlots = SITE_CONTEXT_UNIFICATION_MANIFEST.entries
      .map((e) => e.targetSlot)
      .filter((s): s is ProjectModuleKey => s !== PDC_METADATA_SLOT);
    for (const slot of moduleSlots) {
      expect(PROJECT_MODULE_KEYS).toContain(slot);
    }
  });

  it("keeps PDC_MODULE_SLOTS in sync with PROJECT_MODULE_KEYS", () => {
    expect([...PDC_MODULE_SLOTS]).toEqual([...PROJECT_MODULE_KEYS]);
  });
});

describe("siteContext boundary accepts the current schema without changes", () => {
  it("a site-context-shaped payload fits the loose terrain module slot", () => {
    const record = createTerrainModuleRecord();
    const siteContextPayload = {
      searchLocation: { name: "Gifu", lat: 35.0, lon: 137.0 },
      selectionArea: {
        type: "rect",
        coordinateContextId: "ctx-1",
        vertices: [
          [0, 0],
          [100, 100],
        ],
      },
      terrain: {
        terrainId: "t-1",
        status: "ready",
        elevationResource: "SCT1:abcd",
      },
    };
    record.data.siteContext = siteContextPayload;
    record.data.selectionArea = siteContextPayload.selectionArea;
    expect(record.data.siteContext).toEqual(siteContextPayload);
  });

  it("a site-context metadata payload fits the strict project schema metadata slot", () => {
    const project = createEmptyProject("site-context import");
    project.metadata = {
      siteContextCoordinateContexts: [
        { id: "ctx-1", crs: { kind: "projected", epsg: 6674 } },
      ],
      siteContextProjectCoordinateContextId: "ctx-1",
      siteContextSourceDatasets: [],
      existingConditions: [],
    };
    expect(project.metadata).toBeDefined();
    expect(project.schemaVersion).toBeDefined();
  });

  it("keeps terrain module slot available for the TerrainDocument contract", () => {
    const record = createTerrainModuleRecord();
    expect(record.data.terrainDocument).toBeUndefined();
    const terrainDocument = {
      terrainId: "t-1",
      schemaVersion: "0.1.0",
      source: { sourceType: "dem", sourceName: "gsi", importedAt: null },
      coordinateContext: {
        coordinateSystem: "project",
        projectOrigin: { x: 0, y: 0, z: 0 },
        localOrigin: null,
        unitSystem: "metric",
        axisConvention: "x-along/y-transverse/z-up",
      },
      bounds: null,
      surfaceReference: "SCT1:abcd",
      assetReferences: [],
    } satisfies TerrainDocument;
    record.data.terrainDocument = terrainDocument;
    expect((record.data.terrainDocument as TerrainDocument).surfaceReference).toBe("SCT1:abcd");
  });
});

describe("contract type guards", () => {
  it("isPdcTargetSlot accepts module keys and metadata", () => {
    expect(isPdcTargetSlot("terrain")).toBe(true);
    expect(isPdcTargetSlot("road")).toBe(true);
    expect(isPdcTargetSlot(PDC_METADATA_SLOT)).toBe(true);
    expect(isPdcTargetSlot("siteContext")).toBe(false);
  });

  it("isSiteContextSourceConcept accepts declared concepts only", () => {
    expect(isSiteContextSourceConcept("terrain")).toBe(true);
    expect(isSiteContextSourceConcept("selectionArea")).toBe(true);
    expect(isSiteContextSourceConcept("notAConcept")).toBe(false);
  });
});

describe("manifest entry shape", () => {
  it("every entry is a well-formed SiteContextMappingEntry", () => {
    for (const entry of SITE_CONTEXT_UNIFICATION_MANIFEST.entries) {
      const requiredFields: (keyof SiteContextMappingEntry)[] = [
        "sourceConcept",
        "targetSlot",
        "targetLocation",
        "required",
        "notes",
      ];
      for (const field of requiredFields) {
        expect(entry[field], `${field} must be present on ${entry.sourceConcept}`).toBeDefined();
      }
    }
  });

  it("maps the terrain and elevation concepts to the terrain slot", () => {
    const terrainEntries = SITE_CONTEXT_UNIFICATION_MANIFEST.entries.filter(
      (e): e is SiteContextMappingEntry & { targetSlot: "terrain" } => e.targetSlot === "terrain",
    );
    expect(terrainEntries.map((e) => e.sourceConcept)).toContain("terrain");
    expect(terrainEntries.map((e) => e.sourceConcept)).toContain("elevationResource");
  });
});
