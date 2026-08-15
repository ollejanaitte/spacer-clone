import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getProjectManager, resetProjectManagerForTest } from "../../../project/projectManagerInstance";
import { applyBusinessMetadata } from "../../../project/businessMetadata";
import { createReferenceMountain } from "../../terrain/referenceMountain";
import { writeRoadInputs, writeRoadData, readRoadData, readRoadDataRaw } from "../../roadModuleAdapter";
import { ensureCanonicalRoadData } from "../../road/roadDataMigration";
import { buildRoadDrawingDxf } from "../deliverablesArtifacts";

beforeEach(() => {
  resetProjectManagerForTest();
});

afterEach(() => {
  resetProjectManagerForTest();
});

function setupProject(): { projectId: string; checksum: string } {
  const manager = getProjectManager();
  const result = manager.createProject({
    name: "REF-MTN-WP3",
    businessNumber: "WP3-1",
    designStage: "road-detailed",
  });
  if (!result.ok || !result.project) throw new Error("createProject failed");
  const projectId = result.project.projectId;

  const mountain = createReferenceMountain();
  const roadInput = {
    label: mountain.name,
    horizontal: mountain.roadHorizontal,
    vertical: mountain.roadVertical,
    crossSections: [mountain.roadCrossSection],
  };
  const write = writeRoadInputs(manager, projectId, roadInput);
  expect(write.ok).toBe(true);

  const existing = readRoadDataRaw(manager, projectId);
  const migrated = ensureCanonicalRoadData(existing, { roadInput });
  if (!migrated.ok) {
    throw new Error(`migrate failed: ${JSON.stringify(migrated.issues)}`);
  }
  const writeRes = writeRoadData(manager, projectId, migrated.roadData);
  if (!writeRes.ok) {
    throw new Error("writeRoadData failed");
  }
  const roadData = readRoadData(manager, projectId);
  if (!roadData) throw new Error("roadData not readable");
  return { projectId, checksum: roadData.contentChecksum };
}

describe("WP-3 Road DXF production (P0-02)", () => {
  it("RD-02 plan-type-a DXF has bytes and non-zero entities", () => {
    const { projectId, checksum } = setupProject();
    const result = buildRoadDrawingDxf(getProjectManager(), projectId, "plan-type-a");
    expect(result.ok).toBe(true);
    expect(result.byteLength).toBeGreaterThan(0);
    expect(result.entityCount).toBeGreaterThan(0);
    expect(result.dxf).toContain("SECTION");
    expect(result.sourceChecksum).toBe(checksum);
  });

  it("RD-03 profile-band DXF has bytes and non-zero entities", () => {
    const { projectId } = setupProject();
    const result = buildRoadDrawingDxf(getProjectManager(), projectId, "profile-band");
    expect(result.ok).toBe(true);
    expect(result.byteLength).toBeGreaterThan(0);
    expect(result.entityCount).toBeGreaterThan(0);
  });

  it("RD-04 cross-section DXF has bytes and non-zero entities", () => {
    const { projectId } = setupProject();
    const result = buildRoadDrawingDxf(getProjectManager(), projectId, "cross-section");
    expect(result.ok).toBe(true);
    expect(result.byteLength).toBeGreaterThan(0);
    expect(result.entityCount).toBeGreaterThan(0);
  });

  it("fail-closed: DXF export blocked when roadData absent", () => {
    const manager = getProjectManager();
    const result = manager.createProject({ name: "Empty", businessNumber: "E", designStage: "road-detailed" });
    if (!result.ok || !result.project) throw new Error("create failed");
    const out = buildRoadDrawingDxf(manager, result.project.projectId, "plan-type-a");
    expect(out.ok).toBe(false);
    expect(out.issues.some((m) => m.includes("roadData"))).toBe(true);
  });

  it("checksum stability: same inputs produce same contentChecksum", () => {
    const a = setupProject();
    const b = setupProject();
    expect(a.checksum).toBe(b.checksum);
  });
});
