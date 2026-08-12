import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEmptyProject } from "../../../project/projectDataCore";
import { applyBusinessMetadata } from "../../../project/businessMetadata";
import { getProjectManager, resetProjectManagerForTest } from "../../../project/projectManagerInstance";
import { buildSpanHandoff } from "../bridgeLayoutSpanHandoff";
import { buildBridgeLayoutFromRange } from "../bridgeLayoutDomain";
import { addPier, updatePierSkew } from "../bridgeLayoutPiers";
import { generateSpans } from "../bridgeLayoutSpans";
import { writeRoadInputs } from "../../roadModuleAdapter";
import { writeTerrainDocument } from "../../terrainModuleAdapter";
import { createEmptyTerrainDocument } from "../../terrainModule";
import { writeExistingConditions } from "../../existingConditionsAdapter";
import { createReferenceMountain } from "../../terrain/referenceMountain";

function makeProject() {
  return applyBusinessMetadata(createEmptyProject("Span Handoff"), {
    businessNumber: "BL-H-002",
    designStage: "bridge-detailed",
  });
}

function seedAll(manager = getProjectManager(), projectId: string) {
  const mountain = createReferenceMountain();
  const roadOk = writeRoadInputs(manager, projectId, {
    label: "山岳道路",
    horizontal: mountain.roadHorizontal,
    vertical: mountain.roadVertical,
    crossSections: [mountain.roadCrossSection],
  });
  expect(roadOk.ok).toBe(true);
  writeTerrainDocument(manager, projectId, {
    ...createEmptyTerrainDocument(),
    source: { sourceType: "csv" as const, sourceName: "mtn.csv", importedAt: null },
    surfaceReference: "assets/terrain/reference.bin",
  });
  writeExistingConditions(manager, projectId, { schemaVersion: "0.1.0", entities: [...mountain.existing] });
}

function buildDoc(manager = getProjectManager(), projectId: string) {
  const built = buildBridgeLayoutFromRange(manager, projectId, {
    bridgeId: "BR-801",
    name: "SpanHandoff橋",
    startStation: 100,
    endStation: 700,
  });
  expect(built.ok).toBe(true);
  let doc = built.document!;
  doc = addPier(doc, { supportId: "P1", station: 300 });
  doc = addPier(doc, { supportId: "P2", station: 500 });
  doc = updatePierSkew(doc, "P1", 0.25, "user");
  doc = { ...doc, spans: generateSpans(doc) };
  return doc;
}

beforeEach(() => {
  resetProjectManagerForTest();
});

afterEach(() => {
  resetProjectManagerForTest();
});

describe("Phase 4-04 Span Handoff Contract", () => {
  it("builds a span handoff S1..S3 continuous A1→A2", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedAll(manager, project.projectId);
    const doc = buildDoc(manager, project.projectId);
    const result = buildSpanHandoff(manager, project.projectId, doc);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const h = result.handoff;
    expect(h.handoffKind).toBe("span-handoff");
    expect(h.schemaVersion).toBe("1.0.0");
    expect(h.bridgeId).toBe("BR-801");
    expect(h.spans).toHaveLength(3);
    expect(h.spans.map((s) => s.spanId)).toEqual(["S1", "S2", "S3"]);
    expect(h.spans.map((s) => s.startSupportId)).toEqual(["A1", "P1", "P2"]);
    expect(h.spans.map((s) => s.endSupportId)).toEqual(["P1", "P2", "A2"]);
    expect(h.validation.ok).toBe(true);
  });

  it("span length = end - start and Σ = bridgeLength", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedAll(manager, project.projectId);
    const doc = buildDoc(manager, project.projectId);
    const result = buildSpanHandoff(manager, project.projectId, doc);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const h = result.handoff;
    expect(h.spans.map((s) => s.spanLength)).toEqual([200, 200, 200]);
    const total = h.spans.reduce((sum, s) => sum + s.spanLength, 0);
    expect(total).toBeCloseTo(600, 6);
  });

  it("carries start/end support skew (CCW-positive) and references", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedAll(manager, project.projectId);
    const doc = buildDoc(manager, project.projectId);
    const result = buildSpanHandoff(manager, project.projectId, doc);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const h = result.handoff;
    const s1 = h.spans[0]; // A1-P1
    expect(s1.startSupportSkew).toBeNull(); // A1 skew null
    expect(s1.endSupportSkew).toBeCloseTo(0.25, 6); // P1 skew 0.25
    const s3 = h.spans[2]; // P2-A2
    expect(s3.startSupportSkew).toBeCloseTo(h.spans[1].endSupportSkew ?? 0, 4);
    expect(h.roadReference.alignmentId).toBe("ROAD-MTN-1");
    expect(h.coordinateContext.coordinatePolicyId).toBe("COORD-JGD2011");
    expect(h.coordinateContext.axisConvention).toBe("x-along/y-transverse/z-up");
    expect(h.skewConvention).toBe("counterclockwise-positive");
  });

  it("detects chain breaks (span not continuous)", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedAll(manager, project.projectId);
    const doc = buildDoc(manager, project.projectId);
    // break the chain in the stored spans
    const broken = {
      ...doc,
      spans: doc.spans.map((s) => (s.spanId === "S2" ? { ...s, startSupportId: "P9" } : s)),
    };
    const result = buildSpanHandoff(manager, project.projectId, broken);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.message.includes("derived inconsistency") || i.message.includes("chain broken") || i.message.includes("missing support"))).toBe(true);
    }
  });

  it("detects zero/negative span length", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedAll(manager, project.projectId);
    const doc = buildDoc(manager, project.projectId);
    const bad = {
      ...doc,
      spans: doc.spans.map((s, i) => (i === 1 ? { ...s, endStation: s.startStation, length: 0 } : s)),
    };
    const result = buildSpanHandoff(manager, project.projectId, bad);
    expect(result.ok).toBe(false);
  });

  it("detects ΣspanLength != bridgeLength", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedAll(manager, project.projectId);
    const doc = buildDoc(manager, project.projectId);
    const bad = {
      ...doc,
      spans: doc.spans.map((s) => (s.spanId === "S3" ? { ...s, endStation: 650, length: 150 } : s)),
    };
    const result = buildSpanHandoff(manager, project.projectId, bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.message.includes("derived inconsistency") || i.message.includes("must equal bridgeLength"))).toBe(true);
    }
  });

  it("detects missing support references", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedAll(manager, project.projectId);
    const doc = buildDoc(manager, project.projectId);
    const bad = {
      ...doc,
      spans: doc.spans.map((s) => (s.spanId === "S2" ? { ...s, endSupportId: "PX" } : s)),
    };
    const result = buildSpanHandoff(manager, project.projectId, bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.message.includes("derived inconsistency") || i.message.includes("missing support: PX"))).toBe(true);
    }
  });

  it("malformed input fails closed without throwing", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedAll(manager, project.projectId);
    const doc = buildDoc(manager, project.projectId);
    const malformed = { ...doc, spans: [{ spanId: "X", index: 1, startSupportId: "A1", endSupportId: "A2", startStation: Number.NaN, endStation: 700, length: Number.NaN }] };
    expect(() => buildSpanHandoff(manager, project.projectId, malformed)).not.toThrow();
    const result = buildSpanHandoff(manager, project.projectId, malformed);
    expect(result.ok).toBe(false);
  });

  it("does not include superstructure design decisions", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedAll(manager, project.projectId);
    const doc = buildDoc(manager, project.projectId);
    const result = buildSpanHandoff(manager, project.projectId, doc);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const json = JSON.stringify(result.handoff);
    expect(json).not.toContain("girder");
    expect(json).not.toContain("deck");
    expect(json).not.toContain("bearing");
  });
});
