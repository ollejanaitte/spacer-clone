import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEmptyProject } from "../../../project/projectDataCore";
import { applyBusinessMetadata } from "../../../project/businessMetadata";
import { getProjectManager, resetProjectManagerForTest } from "../../../project/projectManagerInstance";
import { buildBridgeLayoutFromRange } from "../../bridgeLayout/bridgeLayoutDomain";
import { addPier } from "../../bridgeLayout/bridgeLayoutPiers";
import { generateSpans } from "../../bridgeLayout/bridgeLayoutSpans";
import { writeRoadInputs, writeRoadData } from "../../roadModuleAdapter";
import { commitRoadEditorDraft } from "../../road/roadEditorDraft";
import { createDefaultLinerDraft } from "../../../../liner/adapters/linerUiAdapter";
import { writeTerrainDocument } from "../../terrainModuleAdapter";
import { createEmptyTerrainDocument } from "../../terrainModule";
import { writeExistingConditions } from "../../existingConditionsAdapter";
import { createEmptyExistingConditionsDocument } from "../../existingConditions";
import { createReferenceMountain } from "../../terrain/referenceMountain";
import { readBridgeLayoutDocument, writeBridgeLayoutDocument } from "../../bridgeLayoutModuleAdapter";
import { createEmptyBridgeLayoutDocument } from "../../bridgeLayout/bridgeLayoutTypes";
import { buildBridgeLayoutCsvWithPreamble, parseBridgeLayoutCsv, bridgeLayoutCsvFileName } from "../bridgeLayoutCsv";
import { currentBridgeLayoutFingerprint } from "../deliverablesArtifacts";

function makeRoadInputs() {
  const mountain = createReferenceMountain();
  return {
    label: "山岳道路",
    horizontal: mountain.roadHorizontal,
    vertical: mountain.roadVertical,
    crossSections: [mountain.roadCrossSection],
  };
}

function seedRoad(manager = getProjectManager(), projectId: string) {
  const result = writeRoadInputs(manager, projectId, makeRoadInputs());
  expect(result.ok).toBe(true);
}

beforeEach(() => {
  resetProjectManagerForTest();
});

afterEach(() => {
  resetProjectManagerForTest();
});

function setupLayout(): { projectId: string; bridgeId: string } {
  const manager = getProjectManager();
  const project = applyBusinessMetadata(createEmptyProject("BL-02 WP6"), {
    businessNumber: "WP6-1",
    designStage: "bridge-detailed",
  });
  expect(manager.importProject(project)).toBe(true);
  const projectId = manager.listProjects()[0].projectId;

  seedRoad(manager, projectId);
  const terrainDoc = {
    ...createEmptyTerrainDocument(),
    source: { sourceType: "csv" as const, sourceName: "mtn.csv", importedAt: null },
    surfaceReference: "assets/terrain/reference.bin",
  };
  writeTerrainDocument(manager, projectId, terrainDoc);
  writeExistingConditions(manager, projectId, createEmptyExistingConditionsDocument());

  const built = buildBridgeLayoutFromRange(manager, projectId, {
    bridgeId: "BR-900",
    name: "WP6橋",
    startStation: 100,
    endStation: 450,
  });
  if (!built.ok || !built.document) throw new Error("buildBridgeLayoutFromRange failed");
  let layout = built.document;
  layout = addPier(layout, { supportId: "P1", station: 300 });
  layout = { ...layout, spans: generateSpans(layout) };
  const write = writeBridgeLayoutDocument(manager, projectId, layout);
  if (!write.ok) throw new Error("writeBridgeLayoutDocument failed");
  return { projectId, bridgeId: "BR-900" };
}

describe("WP-6 BL-02 span/support CSV production (P0-06)", () => {
  it("canonical bridgeLayout -> CSV with preamble + header + sorted rows", () => {
    const { projectId } = setupLayout();
    const layout = readBridgeLayoutDocument(getProjectManager(), projectId);
    expect(layout).toBeDefined();
    const body = buildBridgeLayoutCsvWithPreamble(layout!, "cafe1234");
    const parsed = parseBridgeLayoutCsv(body);
    expect(parsed.ok).toBe(true);
    expect(parsed.headerOk).toBe(true);
    expect(parsed.preambleChecksum).toBe("cafe1234");
    expect(parsed.rowCount).toBeGreaterThan(0);
  });

  it("contains both span and support rows from canonical spans/supports", () => {
    const { projectId } = setupLayout();
    const layout = readBridgeLayoutDocument(getProjectManager(), projectId);
    const body = buildBridgeLayoutCsvWithPreamble(layout!, "cafe1234");
    const lines = body.replace(/\r\n/g, "\n").split("\n");
    const data = lines.slice(2).filter((l) => l.trim());
    const types = data.map((l) => l.split(",")[0]);
    expect(types).toContain("span");
    expect(types).toContain("support");
    // span count matches canonical spans (A1-P1 + P1-A2)
    const spanRows = types.filter((t) => t === "span").length;
    expect(spanRows).toBe(layout!.spans.length);
  });

  it("stale fingerprint changes when layout changes (P0-01 stale gate)", () => {
    const { projectId } = setupLayout();
    const manager = getProjectManager();
    const fp1 = currentBridgeLayoutFingerprint(manager, projectId);
    const layout = readBridgeLayoutDocument(manager, projectId);
    if (!layout) throw new Error("layout missing");
    const changed = addPier({ ...layout, piers: [], spans: [] }, { supportId: "P2", station: 380 });
    const write = writeBridgeLayoutDocument(manager, projectId, { ...changed, spans: generateSpans(changed) });
    expect(write.ok).toBe(true);
    const fp2 = currentBridgeLayoutFingerprint(manager, projectId);
    expect(fp2).not.toBe(fp1);
  });

  it("file name is sanitized and deterministic", () => {
    expect(bridgeLayoutCsvFileName("BR/900:1")).toMatch(/^bridge-layout-.*span-support\.csv$/);
    expect(bridgeLayoutCsvFileName("BR-900")).toBe("bridge-layout-BR-900-span-support.csv");
  });
});
