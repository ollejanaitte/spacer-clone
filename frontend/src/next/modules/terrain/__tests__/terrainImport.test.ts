import { afterEach, describe, expect, it } from "vitest";
import { parseTerrainText, parseTerrainAuto, detectDelimiter } from "../terrainImport";
import { registerTerrainImport } from "../terrainImportAdapter";
import { getProjectManager, resetProjectManagerForTest } from "../../../project/projectManagerInstance";
import { applyBusinessMetadata } from "../../../project/businessMetadata";
import { createEmptyProject } from "../../../project/projectDataCore";
import { readTerrainDocument } from "../../terrainModuleAdapter";

function makeProject() {
  return applyBusinessMetadata(createEmptyProject("地形Import業務"), {
    businessNumber: "TRN-I-001",
    designStage: "road-preliminary",
  });
}

afterEach(() => {
  resetProjectManagerForTest();
});

describe("Phase 3-02 Terrain Import (XYZ/CSV)", () => {
  it("parses a valid XYZ point cloud", () => {
    const text = [
      "x,y,z",
      "0,0,100",
      "100,0,120",
      "0,100,110",
      "100,100,130",
    ].join("\n");
    const result = parseTerrainText(text);
    expect(result.ok).toBe(true);
    expect(result.pointCount).toBe(4);
    expect(result.bounds.maxZ).toBe(130);
    expect(result.bounds.minZ).toBe(100);
    expect(result.bounds.maxX).toBe(100);
  });

  it("parses tab-delimited data automatically", () => {
    const text = "0\t0\t50\n10\t0\t55\n";
    expect(detectDelimiter(text)).toBe("\t");
    const result = parseTerrainAuto(text);
    expect(result.ok).toBe(true);
    expect(result.pointCount).toBe(2);
  });

  it("rejects NaN and Infinity", () => {
    const text = "0,0,100\nNaN,1,50\nInfinity,2,60\n3,4,70\n";
    const result = parseTerrainText(text);
    // NaN and Infinity rows are malformed -> issues, but valid rows remain
    expect(result.ok).toBe(false);
    expect(result.pointCount).toBe(2);
    expect(result.issues.some((i) => i.includes("malformed"))).toBe(true);
  });

  it("rejects malformed rows", () => {
    const text = "0,0,100\nbad,row\n5,6,70\n";
    const result = parseTerrainText(text);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.includes("malformed"))).toBe(true);
  });

  it("rejects empty data", () => {
    const result = parseTerrainText("");
    expect(result.ok).toBe(false);
    expect(result.issues).toContain("empty terrain data");
    expect(result.pointCount).toBe(0);
  });

  it("detects excessive size", () => {
    const text = Array.from({ length: 20 }, (_, i) => `${i},0,${i}`).join("\n");
    const result = parseTerrainText(text, { maxPoints: 10 });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.includes("exceeded max point count"))).toBe(true);
    expect(result.pointCount).toBe(10);
  });

  it("registers import into Terrain Module without embedding points in project.json", async () => {
    const manager = getProjectManager();
    const project = makeProject();
    expect(manager.importProject(project)).toBe(true);

    const text = "x,y,z\n0,0,100\n100,0,120\n0,100,110\n100,100,130\n";
    const parsed = parseTerrainText(text);
    expect(parsed.ok).toBe(true);

    const result = registerTerrainImport(manager, project.projectId, {
      sourceType: "csv",
      sourceName: "山岳地形.csv",
      importResult: parsed,
      surfaceAssetRef: "assets/terrain/mountain.bin",
    });
    expect(result.ok).toBe(true);
    await manager.flushPendingSaves();

    const doc = readTerrainDocument(manager, project.projectId);
    expect(doc?.source.sourceType).toBe("csv");
    expect(doc?.source.sourceName).toBe("山岳地形.csv");
    expect(doc?.bounds?.maxX).toBe(100);
    expect(doc?.bounds?.minElevation).toBe(100);
    expect(doc?.surfaceReference).toBe("assets/terrain/mountain.bin");
    expect(doc?.assetReferences).toContain("assets/terrain/mountain.bin");
    // points are NOT embedded in project.json - only referenced via assets
    // The terrain module stores metadata/bounds, not the raw point array.
    const storedJson = JSON.stringify(manager.getProject(project.projectId)?.modules?.terrain);
    expect(storedJson).not.toContain("points");
    expect(storedJson).not.toContain("pointCount");
  });

  it("rejects empty import registration", () => {
    const manager = getProjectManager();
    const project = makeProject();
    manager.importProject(project);
    const empty = parseTerrainText("");
    const result = registerTerrainImport(manager, project.projectId, {
      sourceType: "csv",
      sourceName: "empty.csv",
      importResult: empty,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("empty-import");
  });
});
