import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getProjectManager, resetProjectManagerForTest } from "../../../project/projectManagerInstance";
import { applyBusinessMetadata } from "../../../project/businessMetadata";
import { importReferenceMountainFixture, FIXTURE_REFERENCE_ID } from "../referenceFixture";
import { readRoadInputs } from "../../roadModuleAdapter";
import { readTerrainDocument } from "../../terrainModuleAdapter";
import { readBridgeLayoutDocument } from "../../bridgeLayoutModuleAdapter";
import { readSuperstructureDocument } from "../../superstructureModuleAdapter";
import { readSubstructureDocument } from "../../substructureModuleAdapter";

beforeEach(() => {
  resetProjectManagerForTest();
});

afterEach(() => {
  resetProjectManagerForTest();
});

function createEmptyProject(): string {
  const manager = getProjectManager();
  const result = manager.createProject({
    name: "REF-MTN-IMPORT",
    businessNumber: "WP7-1",
    designStage: "bridge-detailed",
  });
  if (!result.ok || !result.project) throw new Error("createProject failed");
  return result.project.projectId;
}

describe("WP-7 Reference Mountain fixture import (P0-07)", () => {
  it("imports all bundle modules atomically on an empty project", () => {
    const projectId = createEmptyProject();
    const result = importReferenceMountainFixture(getProjectManager(), projectId);
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.provenance?.fixtureId).toBe(FIXTURE_REFERENCE_ID);
    expect(result.provenance?.fixtureVersion).toBe("REF-MOUNTAIN-1");
    expect(result.provenance?.moduleChecksums.road).toMatch(/^[0-9a-f]+$/);

    const manager = getProjectManager();
    // all modules committed (road is committed as roadInput, canonicalized lazily)
    expect(readRoadInputs(manager, projectId).horizontal).toBeDefined();
    expect(readTerrainDocument(manager, projectId)).toBeDefined();
    const bl = readBridgeLayoutDocument(manager, projectId);
    const ss = readSuperstructureDocument(manager, projectId);
    const sb = readSubstructureDocument(manager, projectId);
    expect(bl).toBeDefined();
    expect(ss).toBeDefined();
    expect(sb).toBeDefined();
  });

  it("provenance records all non-null module checksums", () => {
    const projectId = createEmptyProject();
    const result = importReferenceMountainFixture(getProjectManager(), projectId);
    if (!result.ok || !result.provenance) throw new Error("import failed");
    const checksums = result.provenance.moduleChecksums;
    expect(checksums.road).toBeTruthy();
    expect(checksums.terrain).toBeTruthy();
    expect(checksums.bridgeLayout).toBeTruthy();
    expect(checksums.superstructure).toBeTruthy();
    expect(checksums.substructure).toBeTruthy();
    expect(checksums.analysis).toBeTruthy();
  });

  it("fails closed when project does not exist", () => {
    const result = importReferenceMountainFixture(getProjectManager(), "missing-id");
    expect(result.ok).toBe(false);
    expect(result.issues[0]?.path).toContain("project");
  });

  it("road checksum is deterministic across identical imports", () => {
    const a = importReferenceMountainFixture(getProjectManager(), createEmptyProject());
    const b = importReferenceMountainFixture(getProjectManager(), createEmptyProject());
    if (!a.ok || !b.ok) throw new Error("import failed");
    expect(a.provenance!.moduleChecksums.road).toBe(b.provenance!.moduleChecksums.road);
  });
});
