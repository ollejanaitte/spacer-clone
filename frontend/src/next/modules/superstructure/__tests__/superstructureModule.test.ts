import { describe, expect, it } from "vitest";
import { createEmptyProject } from "../../../project/projectDataCore";
import { applyBusinessMetadata } from "../../../project/businessMetadata";
import { getProjectManager, resetProjectManagerForTest } from "../../../project/projectManagerInstance";
import {
  SUPERSTRUCTURE_SCHEMA_VERSION,
  SUPERSTRUCTURE_TYPE_PLATE_GIRDER_RC_SLAB_NON_COMPOSITE,
  type BridgeLayoutReference,
  type RoadReference,
} from "../superstructureTypes";
import {
  buildSuperstructureDocument,
  createEmptySuperstructureDocument,
  deriveGirderOffsets,
  attachSuperstructureHandoffs,
  superstructureDocumentIdFor,
} from "../superstructureDocumentDomain";
import {
  validateSuperstructureDocument,
  parseSuperstructureDocument,
  isSuperstructureData,
} from "../superstructureValidation";
import {
  createSuperstructureModuleRecord,
  createSuperstructureData,
} from "../../superstructureModule";
import {
  readSuperstructureDocument,
  writeSuperstructureDocument,
  hasSuperstructureDocument,
} from "../../superstructureModuleAdapter";

function bridgeRef(bridgeId = "BR-001"): BridgeLayoutReference {
  return { bridgeId, moduleId: "bridgeLayout", documentVersion: "0.1.0", layoutFingerprint: "fp-001" };
}

function roadRef(): RoadReference {
  return { moduleId: "road", alignmentId: "ALN-1", stationReferenceId: null, coordinatePolicyId: null };
}

function makeGirderConfig() {
  return {
    girderCount: 2,
    girderSpacingM: 8,
    girderLines: [] as never[],
    girderSectionModel: {
      depthM: 2.0,
      webThicknessM: 0.012,
      topFlange: { widthM: 0.5, thicknessM: 0.03 },
      bottomFlange: { widthM: 0.6, thicknessM: 0.04 },
      areaM2: null,
      unitWeightPerM: null,
    },
  };
}

function makeDeckConfig() {
  return {
    deckId: "DECK-1",
    deckKind: "rc_non_composite" as const,
    thicknessM: 0.24,
    unitWeight: 24.5,
    overhangLeftM: 0.5,
    overhangRightM: 0.5,
    resolvedWidthM: 12.0,
  };
}

describe("SuperstructureDocument domain (WP-A)", () => {
  it("creates an empty document with FROZEN defaults", () => {
    const doc = createEmptySuperstructureDocument("PROJ-1");
    expect(doc.schemaVersion).toBe(SUPERSTRUCTURE_SCHEMA_VERSION);
    expect(doc.documentKind).toBe("superstructure-design");
    expect(doc.status).toBe("DRAFT");
    expect(doc.revisionId).toBe(1);
    expect(doc.deckConfiguration.deckKind).toBe("rc_non_composite");
    expect(doc.loadModel.liveLoadReference).toBeNull();
    expect(doc.analysisModel.authorization.numericDesignAuthorization).toBe("NOT_GRANTED");
    expect(doc.designResults.designStatus).toBe("NOT_AUTHORIZED");
    expect(doc.validation.ok).toBe(false);
  });

  it("builds a document with derived equal-spaced girder offsets", () => {
    const result = buildSuperstructureDocument({
      projectId: "PROJ-1",
      bridgeLayoutReference: bridgeRef("BR-900"),
      roadReference: roadRef(),
      girderConfiguration: makeGirderConfig(),
      deckConfiguration: makeDeckConfig(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const doc = result.document;
    expect(doc.documentId).toBe(superstructureDocumentIdFor("BR-900"));
    expect(doc.girderConfiguration.girderLines).toHaveLength(2);
    expect(doc.girderConfiguration.girderLines[0].offsetFromCenterline).toBe(-4);
    expect(doc.girderConfiguration.girderLines[1].offsetFromCenterline).toBe(4);
    expect(doc.girderConfiguration.girderLines[0].girderId).toBe("G1");
    expect(doc.girderConfiguration.girderLines[1].girderId).toBe("G2");
  });

  it("derives offsets deterministically", () => {
    expect(deriveGirderOffsets(2, 8)).toEqual([-4, 4]);
    expect(deriveGirderOffsets(3, 4)).toEqual([-4, 0, 4]);
    expect(deriveGirderOffsets(2, null)).toBeNull();
    expect(deriveGirderOffsets(0, 8)).toBeNull();
  });

  it("attaches derived handoffs without touching canonical fields", () => {
    const built = buildSuperstructureDocument({
      projectId: "PROJ-1",
      bridgeLayoutReference: bridgeRef("BR-900"),
      roadReference: roadRef(),
      girderConfiguration: makeGirderConfig(),
      deckConfiguration: makeDeckConfig(),
    });
    if (!built.ok) throw new Error("build failed");
    const attached = attachSuperstructureHandoffs(
      built.document,
      { handoffId: "SH-1", schemaVersion: "1.0.0", generatedAt: "2026-08-12T00:00:00.000Z", spans: [] },
      { handoffId: "SH-2", schemaVersion: "1.0.0", generatedAt: "2026-08-12T00:00:00.000Z", supports: [] },
    );
    expect(attached.spanReferences?.handoffId).toBe("SH-1");
    expect(attached.supportReferences?.handoffId).toBe("SH-2");
    expect(attached.bridgeLayoutReference?.bridgeId).toBe("BR-900");
  });
});

describe("SuperstructureDocument validation (WP-A)", () => {
  it("accepts a valid built document", () => {
    const built = buildSuperstructureDocument({
      projectId: "PROJ-1",
      bridgeLayoutReference: bridgeRef("BR-900"),
      roadReference: roadRef(),
      girderConfiguration: makeGirderConfig(),
      deckConfiguration: makeDeckConfig(),
    });
    if (!built.ok) throw new Error("build failed");
    const doc = attachSuperstructureHandoffs(built.document, null, {
      handoffId: "SH-2",
      schemaVersion: "1.0.0",
      generatedAt: "2026-08-12T00:00:00.000Z",
      supports: [
        { supportId: "A1", supportType: "abutment", label: "A1", station: 0, position: { domainX: 0, domainY: 0, elevation: 100 }, tangentAzimuthRad: 0, skewAngleRad: null, terrainElevation: 98, roadReferenceId: "r", coordinateContextId: null },
        { supportId: "P1", supportType: "pier", label: "P1", station: 40, position: { domainX: 40, domainY: 0, elevation: 101 }, tangentAzimuthRad: 0, skewAngleRad: 0.1, terrainElevation: 97, roadReferenceId: "r", coordinateContextId: null },
        { supportId: "A2", supportType: "abutment", label: "A2", station: 80, position: { domainX: 80, domainY: 0, elevation: 100 }, tangentAzimuthRad: 0, skewAngleRad: null, terrainElevation: 98, roadReferenceId: "r", coordinateContextId: null },
      ],
    });
    const issues = validateSuperstructureDocument(doc);
    expect(issues).toEqual([]);
  });

  it("rejects when bridge layout is missing", () => {
    const doc = createEmptySuperstructureDocument("PROJ-1");
    const issues = validateSuperstructureDocument(doc);
    expect(issues.some((i) => i.path === "superstructureDocument.bridgeLayoutReference")).toBe(true);
  });

  it("rejects duplicate girder offsets (zero spacing)", () => {
    const built = buildSuperstructureDocument({
      projectId: "PROJ-1",
      bridgeLayoutReference: bridgeRef("BR-900"),
      roadReference: roadRef(),
      girderConfiguration: {
        girderCount: 2,
        girderSpacingM: null,
        girderLines: [
          { girderId: "G1", index: 0, label: "G1", offsetFromCenterline: 0, offsetEndFromCenterline: null, materialRefId: null, sectionIntentRefId: null },
          { girderId: "G2", index: 1, label: "G2", offsetFromCenterline: 0, offsetEndFromCenterline: null, materialRefId: null, sectionIntentRefId: null },
        ],
        girderSectionModel: { depthM: null, webThicknessM: null, topFlange: null, bottomFlange: null, areaM2: null, unitWeightPerM: null },
      },
      deckConfiguration: makeDeckConfig(),
    });
    if (!built.ok) throw new Error("build failed");
    const issues = validateSuperstructureDocument(built.document);
    expect(issues.some((i) => i.message.includes("duplicate girder offset"))).toBe(true);
  });

  it("rejects composite deck kind", () => {
    const built = buildSuperstructureDocument({
      projectId: "PROJ-1",
      bridgeLayoutReference: bridgeRef("BR-900"),
      roadReference: roadRef(),
      girderConfiguration: makeGirderConfig(),
      deckConfiguration: { ...makeDeckConfig(), deckKind: "composite" as never },
    });
    if (!built.ok) throw new Error("build failed");
    const issues = validateSuperstructureDocument(built.document);
    expect(issues.some((i) => i.message.includes("composite action forbidden"))).toBe(true);
  });

  it("rejects structuralSystem inconsistent with span count", () => {
    const built = buildSuperstructureDocument({
      projectId: "PROJ-1",
      bridgeLayoutReference: bridgeRef("BR-900"),
      roadReference: roadRef(),
      structuralSystem: { spanSystem: "continuous", bridgeSystem: "SIMPLE_SINGLE" },
      girderConfiguration: makeGirderConfig(),
      deckConfiguration: makeDeckConfig(),
    });
    if (!built.ok) throw new Error("build failed");
    const doc = attachSuperstructureHandoffs(built.document, {
      handoffId: "SH-1",
      schemaVersion: "1.0.0",
      generatedAt: "2026-08-12T00:00:00.000Z",
      spans: [
        { spanId: "S1", index: 0, startSupportId: "A1", endSupportId: "P1", startStation: 0, endStation: 40, spanLength: 40, startSupportSkew: null, endSupportSkew: null },
        { spanId: "S2", index: 1, startSupportId: "P1", endSupportId: "A2", startStation: 40, endStation: 80, spanLength: 40, startSupportSkew: null, endSupportSkew: null },
      ],
    }, null);
    const issues = validateSuperstructureDocument(doc);
    expect(issues.some((i) => i.message.includes("inconsistent"))).toBe(true);
  });

  it("parses a valid serialized document and rejects unsupported version", () => {
    const built = buildSuperstructureDocument({
      projectId: "PROJ-1",
      bridgeLayoutReference: bridgeRef("BR-900"),
      roadReference: roadRef(),
      girderConfiguration: makeGirderConfig(),
      deckConfiguration: makeDeckConfig(),
    });
    if (!built.ok) throw new Error("build failed");
    const parsed = parseSuperstructureDocument(JSON.parse(JSON.stringify(built.document)));
    expect(parsed.ok).toBe(true);
    const bad = parseSuperstructureDocument({ ...built.document, schemaVersion: "9.9.9" });
    expect(bad.ok).toBe(false);
  });
});

describe("Superstructure module + adapter (WP-A)", () => {
  it("creates module data and detects shape", () => {
    const data = createSuperstructureData();
    expect(isSuperstructureData(data)).toBe(true);
    const record = createSuperstructureModuleRecord();
    expect(record.state.status).toBe("notStarted");
    expect(isSuperstructureData(record.data)).toBe(true);
  });

  it("writes, reads, and detects a valid document", () => {
    resetProjectManagerForTest();
    const manager = getProjectManager();
    manager.importProject(applyBusinessMetadata(createEmptyProject("WP-A"), {
      businessNumber: "WP-A-1",
      designStage: "bridge-detailed",
    }));
    const projectId = manager.listProjects()[0].projectId;

    const built = buildSuperstructureDocument({
      projectId,
      bridgeLayoutReference: bridgeRef("BR-WP-A"),
      roadReference: roadRef(),
      girderConfiguration: makeGirderConfig(),
      deckConfiguration: makeDeckConfig(),
    });
    if (!built.ok) throw new Error("build failed");

    expect(hasSuperstructureDocument(manager, projectId)).toBe(false);
    const written = writeSuperstructureDocument(manager, projectId, built.document);
    expect(written.ok).toBe(true);
    expect(hasSuperstructureDocument(manager, projectId)).toBe(true);
    const read = readSuperstructureDocument(manager, projectId);
    expect(read?.bridgeLayoutReference?.bridgeId).toBe("BR-WP-A");
    expect(read?.documentId).toBe(superstructureDocumentIdFor("BR-WP-A"));
  });

  it("rejects an invalid document on write (fail-closed)", () => {
    resetProjectManagerForTest();
    const manager = getProjectManager();
    manager.importProject(applyBusinessMetadata(createEmptyProject("WP-A-NG"), {
      businessNumber: "WP-A-NG",
      designStage: "bridge-detailed",
    }));
    const projectId = manager.listProjects()[0].projectId;

    const invalid = createEmptySuperstructureDocument(projectId);
    const written = writeSuperstructureDocument(manager, projectId, invalid);
    if (written.ok) {
      throw new Error("invalid document was accepted");
    }
    expect(written.reason).toBe("invalid-superstructure-data");
    expect(hasSuperstructureDocument(manager, projectId)).toBe(false);
  });
});
