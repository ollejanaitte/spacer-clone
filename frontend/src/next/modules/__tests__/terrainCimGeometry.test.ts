import { describe, expect, it } from "vitest";
import { buildTerrainCimGeometry, buildExistingConditionsCimGeometry, TERRAIN_CIM_VERSION, EXISTING_CIM_VERSION } from "../terrainCimGeometry";
import { createTerrainGrid, gridToMesh } from "../terrain/terrainSurface";
import { createEmptyTerrainDocument } from "../terrainModule";
import { createEmptyExistingConditionsDocument, type ExistingConditionEntity } from "../existingConditions";

function makeTerrainDoc() {
  const doc = createEmptyTerrainDocument();
  return {
    ...doc,
    source: { ...doc.source, sourceType: "csv" as const, sourceName: "mountain.csv", importedAt: "2026-08-11T00:00:00.000Z" },
    coordinateContext: {
      ...doc.coordinateContext,
      projectOrigin: { x: 1000, y: 2000, z: 300 },
    },
  };
}

function makeTerrainMesh() {
  const grid = createTerrainGrid(5, 5, 25, 0, 0, (x, y) => x + y);
  return gridToMesh(grid);
}

function makeRiver(): ExistingConditionEntity {
  return {
    entityId: "RIVER-1",
    type: "river",
    label: "河川",
    geometry: { kind: "line", points: [{ x: 0, y: 0, z: 0 }, { x: 100, y: 0, z: 0 }] },
    coordinateContextId: "COORD-1",
    metadata: { width: 30 },
    visibility: true,
    layer: "water",
    styleReference: null,
    sourceReference: null,
  };
}

describe("Phase 3-10 Terrain / Existing CIM Geometry", () => {
  it("builds Terrain CIM geometry with metadata, coordinate, and surface", () => {
    const doc = makeTerrainDoc();
    const mesh = makeTerrainMesh();
    const cim = buildTerrainCimGeometry(doc, mesh, "assets/terrain/mountain.bin");
    expect(cim.version).toBe(TERRAIN_CIM_VERSION);
    expect(cim.coordinateContext.projectOrigin.x).toBe(1000);
    expect(cim.coordinateContext.unitSystem).toBe("metric");
    expect(cim.coordinateContext.axisConvention).toBe("x-along/y-transverse/z-up");
    expect(cim.surface.vertexCount).toBe(25);
    expect(cim.surface.surfaceReference).toBe("assets/terrain/mountain.bin");
    expect(cim.source.sourceName).toBe("mountain.csv");
    expect(cim.surface.bounds.maxZ).toBeGreaterThan(0);
  });

  it("builds Terrain CIM with empty surface reference when mesh is null", () => {
    const doc = makeTerrainDoc();
    const cim = buildTerrainCimGeometry(doc, null, null);
    expect(cim.surface.vertexCount).toBe(0);
    expect(cim.surface.triangleCount).toBe(0);
    expect(cim.surface.surfaceReference).toBeNull();
  });

  it("builds Existing Conditions CIM geometry with entity summaries", () => {
    const doc = createEmptyExistingConditionsDocument();
    const withRiver = { ...doc, entities: [makeRiver()] };
    const cim = buildExistingConditionsCimGeometry(withRiver);
    expect(cim.version).toBe(EXISTING_CIM_VERSION);
    expect(cim.entityCount).toBe(1);
    expect(cim.entities[0].type).toBe("river");
    expect(cim.entities[0].layer).toBe("water");
    expect(cim.entities[0].geometry.kind).toBe("line");
    expect(cim.entities[0].geometry.pointCount).toBe(2);
    expect(cim.entities[0].metadata.width).toBe(30);
  });

  it("builds empty Existing CIM for empty document", () => {
    const doc = createEmptyExistingConditionsDocument();
    const cim = buildExistingConditionsCimGeometry(doc);
    expect(cim.entityCount).toBe(0);
    expect(cim.entities).toEqual([]);
  });
});
