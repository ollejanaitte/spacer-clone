import { describe, expect, it } from "vitest";
import { createMockUnifiedScene } from "../mockScene";
import {
  UNIFIED_LAYER_KINDS,
  type UnifiedLayerKind,
} from "../../layerContract";
import { CANONICAL_TO_RENDER_TRANSFORM_NAME } from "../../renderCoordinate";

describe("Wave 1 mock unified scene", () => {
  const scene = createMockUnifiedScene();

  it("exposes all six required layer kinds", () => {
    const kinds = scene.layers.map((layer) => layer.kind);
    for (const kind of UNIFIED_LAYER_KINDS) {
      expect(kinds).toContain(kind);
    }
    expect(kinds).toEqual(expect.arrayContaining([...UNIFIED_LAYER_KINDS]));
  });

  it("shares one world basis and the default render transform", () => {
    expect(scene.worldBasis.axes).toEqual({ x: "along", y: "transverse", z: "elevation" });
    expect(scene.worldBasis.unit).toBe("m");
    expect(scene.renderTransform.name).toBe(CANONICAL_TO_RENDER_TRANSFORM_NAME);
    for (const layer of scene.layers) {
      expect(layer.visible).toBe(true);
      expect(layer.status.state).toBe("ready");
    }
  });

  it("has finite non-empty bounds on every layer", () => {
    for (const layer of scene.layers) {
      const b = layer.bounds;
      expect(b.maxX).toBeGreaterThan(b.minX);
      expect(b.maxY).toBeGreaterThan(b.minY);
      expect(b.maxZ).toBeGreaterThanOrEqual(b.minZ);
      for (const value of [b.minX, b.minY, b.minZ, b.maxX, b.maxY, b.maxZ]) {
        expect(Number.isFinite(value)).toBe(true);
      }
    }
  });

  it("lays out a bridge over a valley (deck above terrain)", () => {
    const terrain = scene.layers.find((l) => l.kind === "terrain");
    const road = scene.layers.find((l) => l.kind === "road");
    expect(terrain).toBeDefined();
    expect(road).toBeDefined();
    if (!terrain || !road) return;
    const deckZ = Math.max(...(road.data as { alignment: readonly { z: number }[] }).alignment.map((p) => p.z));
    const terrainMaxZ = terrain.bounds.maxZ;
    expect(deckZ).toBeGreaterThan(terrainMaxZ);
  });

  it("provides the minimum bridge parts (girders, bearings, piers, abutments)", () => {
    const superstructure = scene.layers.find((l) => l.kind === "superstructure");
    const bearing = scene.layers.find((l) => l.kind === "bearing");
    const substructure = scene.layers.find((l) => l.kind === "substructure");
    expect(superstructure).toBeDefined();
    expect(bearing).toBeDefined();
    expect(substructure).toBeDefined();
    if (!superstructure || !bearing || !substructure) return;
    const sd = superstructure.data as { girders: readonly unknown[]; deck?: unknown };
    expect(sd.girders.length).toBeGreaterThanOrEqual(2);
    expect(sd.deck).toBeDefined();
    expect((bearing.data as { bearings: readonly unknown[] }).bearings.length).toBeGreaterThan(0);
    const supports = (substructure.data as { supports: readonly unknown[] }).supports;
    expect(supports.length).toBeGreaterThanOrEqual(5);
    expect(
      (substructure.data as { supports: readonly { kind: string }[] }).supports.filter(
        (s) => s.kind === "abutment",
      ).length,
    ).toBe(2);
  });

  it("provides existing-condition entities on the terrain", () => {
    const existing = scene.layers.find((l) => l.kind === "existingConditions");
    expect(existing).toBeDefined();
    if (!existing) return;
    const entities = (existing.data as { entities: readonly unknown[] }).entities;
    expect(entities.length).toBeGreaterThanOrEqual(3);
  });

  it("assigns a stable layer id per kind", () => {
    const ids = scene.layers.map((layer) => layer.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const layer of scene.layers) {
      expect(layer.id.startsWith("layer-")).toBe(true);
      expect((layer.data as { kind: UnifiedLayerKind }).kind).toBe(layer.kind);
    }
  });
});