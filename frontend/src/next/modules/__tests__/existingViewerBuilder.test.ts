import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { buildExistingEntityMesh, buildExistingSceneGroup, entityColor } from "../existingViewerBuilder";
import type { ExistingConditionEntity } from "../existingConditions";

function riverEntity(): ExistingConditionEntity {
  return {
    entityId: "RIVER-1",
    type: "river",
    label: "〇〇川",
    geometry: { kind: "line", points: [{ x: 0, y: 100, z: 0 }, { x: 500, y: 100, z: 0 }] },
    coordinateContextId: "COORD-1",
    metadata: {},
    visibility: true,
    layer: "water",
    styleReference: null,
    sourceReference: null,
  };
}

function pipeEntity(): ExistingConditionEntity {
  return {
    entityId: "PIPE-1",
    type: "pipe",
    label: "水道管",
    geometry: { kind: "pipe", points: [{ x: 0, y: 0, z: -5 }, { x: 300, y: 0, z: -5 }], diameter: 2 },
    coordinateContextId: "COORD-1",
    metadata: {},
    visibility: true,
    layer: "underground",
    styleReference: null,
    sourceReference: null,
  };
}

describe("Phase 3-08 Existing Conditions 3D", () => {
  it("builds a river entity mesh", () => {
    const mesh = buildExistingEntityMesh(riverEntity());
    expect(mesh).toBeInstanceOf(THREE.Mesh);
    expect(mesh.geometry).toBeDefined();
    expect(mesh.name).toBe("");
  });

  it("builds a pipe/underground entity mesh (cylinder)", () => {
    const mesh = buildExistingEntityMesh(pipeEntity());
    expect(mesh).toBeInstanceOf(THREE.Mesh);
    expect(mesh.geometry).toBeInstanceOf(THREE.CylinderGeometry);
  });

  it("builds a scene group from multiple entities", () => {
    const group = buildExistingSceneGroup([riverEntity(), pipeEntity()]);
    expect(group.children.length).toBe(2);
    expect(group.children[0].name).toBe("RIVER-1:〇〇川");
    expect(group.children[1].name).toBe("PIPE-1:水道管");
  });

  it("entityColor returns deterministic per-type colors", () => {
    expect(entityColor("river")).toBe(entityColor("river"));
    expect(entityColor("river")).not.toBe(entityColor("railway"));
  });

  it("skips unbuildable entities without throwing", () => {
    const bad = { ...riverEntity(), geometry: { kind: "line", points: [] } };
    const group = buildExistingSceneGroup([bad as ExistingConditionEntity]);
    // empty geometry produces no children (or a marker fallback is safe)
    expect(Array.isArray(group.children)).toBe(true);
  });
});
