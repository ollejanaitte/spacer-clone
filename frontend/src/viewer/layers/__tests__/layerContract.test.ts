import { describe, expect, it } from "vitest";
import {
  UNIFIED_LAYER_KINDS,
  UNIFIED_LAYER_LABELS,
  LAYER_CONTRACT_VERSION,
  computeTerrainLayerBounds,
  computeRoadLayerBounds,
  computeBoxListBounds,
  computeLayerBounds,
  mergeLayerBounds,
  createViewerLayer,
  isLayerRenderable,
  layerKindOf,
  createDefaultWorldBasis,
  type LayerData,
  type LayerSource,
  type UnifiedLayerKind,
  type ViewerLayer,
} from "../layerContract";

function mockData(kind: UnifiedLayerKind): LayerData {
  switch (kind) {
    case "terrain":
      return {
        kind: "terrain",
        width: 3,
        height: 3,
        cellSize: 5,
        originX: 0,
        originY: 0,
        heights: new Float32Array([10, 12, 14, 11, 13, 15, 12, 14, 16]),
      };
    case "road":
      return {
        kind: "road",
        alignment: [
          { x: 0, y: 0, z: 10 },
          { x: 10, y: 0, z: 10 },
        ],
        width: 8,
      };
    case "superstructure":
      return {
        kind: "superstructure",
        girders: [
          {
            id: "g1",
            center: { x: 5, y: -3, z: 20 },
            size: { x: 10, y: 0.9, z: 1.8 },
          },
        ],
        deck: {
          id: "deck",
          center: { x: 5, y: 0, z: 21 },
          size: { x: 10, y: 8, z: 0.4 },
        },
      };
    case "bearing":
      return {
        kind: "bearing",
        bearings: [
          {
            id: "b1",
            center: { x: 5, y: 0, z: 18 },
            size: { x: 0.6, y: 1, z: 0.5 },
          },
        ],
      };
    case "substructure":
      return {
        kind: "substructure",
        supports: [
          {
            id: "sup-1",
            supportId: "P1",
            kind: "pier",
            column: {
              id: "p1-col",
              center: { x: 5, y: 0, z: 12 },
              size: { x: 2, y: 6, z: 8 },
            },
            foundation: {
              id: "p1-fnd",
              center: { x: 5, y: 0, z: 3 },
              size: { x: 6, y: 8, z: 2 },
            },
          },
        ],
      };
    case "existingConditions":
      return {
        kind: "existingConditions",
        entities: [
          {
            id: "river-1",
            type: "river",
            geometry: {
              geometryKind: "polyline",
              points: [
                { x: 0, y: -10, z: 5 },
                { x: 0, y: 10, z: 5 },
              ],
            },
          },
        ],
      };
  }
}

const source: LayerSource = { lane: "V", moduleId: "mock" };

describe("Layer Contract (V-2)", () => {
  it("defines the six required layer kinds", () => {
    expect(UNIFIED_LAYER_KINDS).toEqual([
      "terrain",
      "road",
      "superstructure",
      "bearing",
      "substructure",
      "existingConditions",
    ]);
  });

  it("labels every kind", () => {
    for (const kind of UNIFIED_LAYER_KINDS) {
      expect(UNIFIED_LAYER_LABELS[kind]).toBeTruthy();
    }
  });

  it("freezes a contract version", () => {
    expect(LAYER_CONTRACT_VERSION).toBe(1);
  });

  it("computeTerrainLayerBounds covers the full grid and z range", () => {
    const data = mockData("terrain") as Extract<LayerData, { kind: "terrain" }>;
    const bounds = computeTerrainLayerBounds(data);
    expect(bounds.minX).toBe(0);
    expect(bounds.maxX).toBe(10);
    expect(bounds.minY).toBe(0);
    expect(bounds.maxY).toBe(10);
    expect(bounds.minZ).toBe(10);
    expect(bounds.maxZ).toBe(16);
  });

  it("computeTerrainLayerBounds skips no-data cells", () => {
    const data = mockData("terrain") as Extract<LayerData, { kind: "terrain" }>;
    const bounds = computeTerrainLayerBounds({
      ...data,
      heights: new Float32Array([-9999, 10, 10, 10, 10, 10, 10, 10, 10]),
      noDataValue: -9999,
    });
    expect(bounds.minZ).toBe(10);
  });

  it("computeRoadLayerBounds includes carriageway half width", () => {
    const data = mockData("road") as Extract<LayerData, { kind: "road" }>;
    const bounds = computeRoadLayerBounds(data);
    expect(bounds.maxY).toBeCloseTo(4, 6);
    expect(bounds.minY).toBeCloseTo(-4, 6);
    expect(bounds.maxX).toBe(10);
  });

it("computeRoadLayerBounds accounts for the road direction", () => {
    const data: Extract<LayerData, { kind: "road" }> = {
      kind: "road",
      alignment: [
        { x: 0, y: 0, z: 10 },
        { x: 0, y: 10, z: 10 },
      ],
      width: 4,
    };
    const bounds = computeRoadLayerBounds(data);
    // Direction is +Y, so the transverse spread must fall on X, not Y.
    expect(bounds.maxX).toBeCloseTo(2, 6);
    expect(bounds.minX).toBeCloseTo(-2, 6);
    expect(bounds.maxY).toBe(10);
    expect(bounds.minY).toBeCloseTo(-2, 6);
  });

  it("computeBoxListBounds accounts for yawDeg rotation", () => {
    const bounds = computeBoxListBounds([
      {
        id: "rotated",
        center: { x: 0, y: 0, z: 0 },
        size: { x: 2, y: 2, z: 2 },
        yawDeg: 45,
      },
    ]);
    // A 2x2 box rotated 45° has diagonal extent sqrt(2)*2/2 ≈ 1.414 in X/Y.
    const halfDiagonal = Math.SQRT2;
    expect(bounds.maxX).toBeCloseTo(halfDiagonal, 6);
    expect(bounds.maxY).toBeCloseTo(halfDiagonal, 6);
    expect(bounds.minX).toBeCloseTo(-halfDiagonal, 6);
    expect(bounds.minY).toBeCloseTo(-halfDiagonal, 6);
    expect(bounds.maxZ).toBe(1);
    expect(bounds.minZ).toBe(-1);
  });

  it("computeLayerBounds dispatches by kind", () => {
    for (const kind of UNIFIED_LAYER_KINDS) {
      const bounds = computeLayerBounds(mockData(kind));
      expect(bounds.maxX).toBeGreaterThanOrEqual(bounds.minX);
      expect(bounds.maxY).toBeGreaterThanOrEqual(bounds.minY);
      expect(bounds.maxZ).toBeGreaterThanOrEqual(bounds.minZ);
    }
  });

  it("mergeLayerBounds unions multiple bounds", () => {
    const merged = mergeLayerBounds(
      { minX: 0, minY: 0, minZ: 0, maxX: 10, maxY: 10, maxZ: 10 },
      { minX: 5, minY: 5, minZ: 5, maxX: 20, maxY: 20, maxZ: 20 },
    );
    expect(merged).toEqual({ minX: 0, minY: 0, minZ: 0, maxX: 20, maxY: 20, maxZ: 20 });
  });

  it("createViewerLayer derives kind and bounds from the payload", () => {
    const layer = createViewerLayer({
      id: "road-layer",
      data: mockData("road") as Extract<LayerData, { kind: "road" }>,
      source,
    });
    expect(layer.kind).toBe("road");
    expect(layer.visible).toBe(true);
    expect(layer.selectable).toBe(true);
    expect(layer.status.state).toBe("ready");
    expect(layer.bounds.maxX).toBe(10);
  });

  it("isLayerRenderable respects visibility and status", () => {
    const layer = createViewerLayer({
      id: "terrain-layer",
      data: mockData("terrain") as Extract<LayerData, { kind: "terrain" }>,
      source,
    }) as ViewerLayer;
    expect(isLayerRenderable(layer)).toBe(true);
    expect(isLayerRenderable({ ...layer, visible: false })).toBe(false);
    expect(
      isLayerRenderable({ ...layer, status: { state: "error", message: "load failed" } }),
    ).toBe(false);
  });

  it("layerKindOf returns the payload discriminator", () => {
    expect(layerKindOf(mockData("bearing"))).toBe("bearing");
  });

  it("createDefaultWorldBasis fixes the shared axis convention", () => {
    const basis = createDefaultWorldBasis();
    expect(basis.axes).toEqual({ x: "along", y: "transverse", z: "elevation" });
    expect(basis.unit).toBe("m");
    expect(basis.handedness).toBe("right-handed");
  });
});