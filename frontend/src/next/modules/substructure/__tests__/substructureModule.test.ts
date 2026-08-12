import { describe, expect, it } from "vitest";
import { createEmptyProject } from "../../../project/projectDataCore";
import { applyBusinessMetadata } from "../../../project/businessMetadata";
import { getProjectManager, resetProjectManagerForTest } from "../../../project/projectManagerInstance";
import type { BridgeLayoutReference, RoadReference, SuperstructureReference, SubstructureDocument } from "../substructureTypes";
import {
  buildSubstructureDocument,
  createEmptySubstructureDocument,
  attachSubstructureHandoffs,
  substructureDocumentIdFor,
} from "../substructureDocumentDomain";
import {
  validateSubstructureDocument,
  parseSubstructureDocument,
  isSubstructureData,
} from "../substructureValidation";
import {
  createSubstructureModuleRecord,
  createSubstructureData,
} from "../../substructureModule";
import {
  readSubstructureDocument,
  writeSubstructureDocument,
  hasSubstructureDocument,
} from "../../substructureModuleAdapter";
import {
  serializeSubstructureDocumentForPersistence,
  deserializeSubstructureDocumentFromPersistence,
} from "../substructurePersistence";

function refs() {
  return {
    bridgeLayoutReference: { bridgeId: "BR-900", moduleId: "bridgeLayout", documentVersion: "0.1.0", layoutFingerprint: "fp" } as BridgeLayoutReference,
    superstructureReference: { bridgeId: "BR-900", moduleId: "superstructure", documentVersion: "0.1.0", superstructureDocumentId: "SS-1", handoffSchemaVersion: "1.0.0" } as SuperstructureReference,
    roadReference: { moduleId: "road", alignmentId: "ALN-1", stationReferenceId: null, coordinatePolicyId: null } as RoadReference,
  };
}

function makeSupport(supportId = "A1") {
  return {
    supportId,
    supportType: "abutment" as const,
    placement: { source: "liner" as const, alignmentId: "ALN-1", station: 100, offset: 0 },
    skewRad: 0,
    bearingSeats: [],
    abutment: {
      id: `ab-${supportId}`,
      formType: "inverted_t" as const,
      backwall: { id: "bw", height: 2.0, thickness: 0.5, width: 12.0, seatElevation: 103.0 },
      wingWallL: { id: "wl", length: 3.0, height: 2.0, thickness: 0.4 },
      wingWallR: { id: "wr", length: 3.0, height: 2.0, thickness: 0.4 },
      footing: { id: "ft", length: 14.0, width: 5.0, thickness: 1.5, topElevation: 101.0 },
      pileGroup: null,
    },
  };
}

function makeDocument(projectId: string): SubstructureDocument {
  const built = buildSubstructureDocument({
    projectId,
    ...refs(),
    supports: [makeSupport("A1"), { ...makeSupport("P1"), supportType: "pier" as const, placement: { source: "liner" as const, alignmentId: "ALN-1", station: 300, offset: 0 }, pier: { id: "p1", formType: "single_column_rect" as const, column: { id: "c1", width: 2.0, depth: 2.0, height: 8.0 }, footing: { id: "ft-p1", length: 6.0, width: 6.0, thickness: 2.0, topElevation: 99.0 }, pileGroup: null }, abutment: undefined }, { ...makeSupport("A2"), placement: { source: "liner" as const, alignmentId: "ALN-1", station: 450, offset: 0 } }],
    footingConfigurations: [
      { id: "ft", length: 14.0, width: 5.0, thickness: 1.5, topElevation: 101.0 },
      { id: "ft-p1", length: 6.0, width: 6.0, thickness: 2.0, topElevation: 99.0 },
    ],
    foundationConfigurations: [
      { id: "fd-a1", formType: "spread", footingRefId: "ft", pileGroupRefId: null },
      { id: "fd-p1", formType: "spread", footingRefId: "ft-p1", pileGroupRefId: null },
    ],
    pileConfigurations: [],
  });
  if (!built.ok) throw new Error("build failed");
  return attachSubstructureHandoffs(
    built.document,
    {
      handoffId: "SH-1",
      schemaVersion: "1.0.0",
      generatedAt: "2026-08-12T00:00:00.000Z",
      supports: [
        { supportId: "A1", supportType: "abutment", label: "A1", station: 100, position: { domainX: 100, domainY: 0, elevation: 100 }, tangentAzimuthRad: 0, skewAngleRad: null, terrainElevation: 98, roadReferenceId: "ALN-1", coordinateContextId: null },
        { supportId: "P1", supportType: "pier", label: "P1", station: 300, position: { domainX: 300, domainY: 0, elevation: 101 }, tangentAzimuthRad: 0, skewAngleRad: null, terrainElevation: 95, roadReferenceId: "ALN-1", coordinateContextId: null },
        { supportId: "A2", supportType: "abutment", label: "A2", station: 450, position: { domainX: 450, domainY: 0, elevation: 100 }, tangentAzimuthRad: 0, skewAngleRad: null, terrainElevation: 97, roadReferenceId: "ALN-1", coordinateContextId: null },
      ],
    },
    null,
  );
}

describe("SubstructureDocument domain (WP-A)", () => {
  it("creates an empty document with FROZEN defaults", () => {
    const doc = createEmptySubstructureDocument("PROJ-1");
    expect(doc.schemaVersion).toBe("0.1.0");
    expect(doc.documentKind).toBe("substructure-design");
    expect(doc.status).toBe("DRAFT");
    expect(doc.revisionId).toBe(1);
    expect(doc.designResults.designStatus).toBe("NOT_AUTHORIZED");
    expect(doc.quantityResults.quantityStatus).toBe("NOT_AVAILABLE");
  });

  it("builds a document with deterministic documentId", () => {
    const doc = makeDocument("PROJ-1");
    expect(doc.documentId).toBe(substructureDocumentIdFor("BR-900"));
    expect(doc.supports).toHaveLength(3);
    expect(doc.footingConfigurations).toHaveLength(2);
  });

  it("attaches derived handoffs without touching canonical fields", () => {
    const doc = makeDocument("PROJ-1");
    expect(doc.supportReferences?.supports).toHaveLength(3);
    expect(doc.bearingReactionReferences).toBeNull();
    expect(doc.bridgeLayoutReference?.bridgeId).toBe("BR-900");
  });
});

describe("SubstructureDocument validation (WP-A)", () => {
  it("accepts a valid built document", () => {
    const issues = validateSubstructureDocument(makeDocument("PROJ-1"));
    expect(issues).toEqual([]);
  });

  it("rejects when references are missing", () => {
    const doc = createEmptySubstructureDocument("PROJ-1");
    const issues = validateSubstructureDocument(doc);
    expect(issues.some((i) => i.path === "substructureDocument.bridgeLayoutReference")).toBe(true);
    expect(issues.some((i) => i.path === "substructureDocument.superstructureReference")).toBe(true);
  });

  it("rejects duplicate supportId", () => {
    const doc = makeDocument("PROJ-1");
    const bad = { ...doc, supports: [doc.supports[0], { ...doc.supports[0] }] };
    const issues = validateSubstructureDocument(bad);
    expect(issues.some((i) => i.message.includes("duplicate supportId"))).toBe(true);
  });

  it("rejects support without shape (pier/abutment) at Gate validation", () => {
    const doc = makeDocument("PROJ-1");
    const noShape = { ...doc.supports[0], pier: undefined, abutment: undefined };
    const bad = { ...doc, supports: [noShape] };
    const issues = validateSubstructureDocument(bad);
    expect(issues.some((i) => i.message.includes("shape required"))).toBe(true);
  });

  it("parses valid / rejects unsupported version", () => {
    const doc = makeDocument("PROJ-1");
    const parsed = parseSubstructureDocument(JSON.parse(JSON.stringify(doc)));
    expect(parsed.ok).toBe(true);
    const bad = parseSubstructureDocument({ ...doc, schemaVersion: "9.9.9" });
    expect(bad.ok).toBe(false);
  });
});

describe("Substructure module + adapter + persistence (WP-A)", () => {
  it("creates module data and writes/reads via PDC", () => {
    resetProjectManagerForTest();
    const manager = getProjectManager();
    manager.importProject(applyBusinessMetadata(createEmptyProject("WP-A"), {
      businessNumber: "WP-A-1",
      designStage: "bridge-detailed",
    }));
    const projectId = manager.listProjects()[0].projectId;
    const data = createSubstructureData();
    expect(isSubstructureData(data)).toBe(true);
    const record = createSubstructureModuleRecord();
    expect(record.state.status).toBe("notStarted");

    const doc = makeDocument(projectId);
    expect(writeSubstructureDocument(manager, projectId, doc).ok).toBe(true);
    expect(hasSubstructureDocument(manager, projectId)).toBe(true);
    const read = readSubstructureDocument(manager, projectId);
    expect(read?.documentId).toBe(substructureDocumentIdFor("BR-900"));
    // derived stripped in persisted form
    expect(read?.supportReferences).toBeNull();
    expect(read?.supports).toHaveLength(3);
  });

  it("rejects invalid document on write (fail-closed)", () => {
    resetProjectManagerForTest();
    const manager = getProjectManager();
    manager.importProject(applyBusinessMetadata(createEmptyProject("WP-A-NG"), {
      businessNumber: "WP-A-NG",
      designStage: "bridge-detailed",
    }));
    const projectId = manager.listProjects()[0].projectId;
    const invalid = createEmptySubstructureDocument(projectId);
    const written = writeSubstructureDocument(manager, projectId, invalid);
    if (written.ok) throw new Error("invalid accepted");
    expect(written.reason).toBe("invalid-substructure-data");
  });

  it("serialize strips derived arrays; deserialize round-trips", () => {
    const doc = makeDocument("PROJ-1");
    const serialized = serializeSubstructureDocumentForPersistence(doc);
    expect(serialized.supportReferences).toBeNull();
    expect(serialized.bearingReactionReferences).toBeNull();
    expect(serialized.bearingSeatReferences).toEqual([]);
    const parsed = deserializeSubstructureDocumentFromPersistence(serialized);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.document.documentId).toBe(doc.documentId);
      expect(parsed.document.supports).toHaveLength(3);
    }
  });
});
