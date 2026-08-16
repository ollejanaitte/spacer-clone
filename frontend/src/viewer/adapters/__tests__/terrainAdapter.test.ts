import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  base64ToHeightfield,
  buildGujoSampleHeightfield,
  GUJO_BOUNDS_EPSG6674,
  GUJO_FIXTURE_GRID,
  GUJO_SAMPLE_SCT1_BASE64,
  loadGujoSampleHeightfield,
} from "../../../terrain";
import { computeTerrainLayerBounds } from "../../layers/layerContract";
import {
  heightfieldLayerBounds,
  heightfieldToTerrainLayer,
  projectOriginFromTerrainDocument,
  TERRAIN_NO_DATA_VALUE,
} from "../terrainAdapter";

describe("terrainAdapter (V-3 real terrain)", () => {
  it("maps a real Gujo Heightfield to TerrainLayerData with correct grid + origin", () => {
    const hf = buildGujoSampleHeightfield();
    const layer = heightfieldToTerrainLayer(hf);

    expect(layer.kind).toBe("terrain");
    expect(layer.width).toBe(GUJO_FIXTURE_GRID.width);
    expect(layer.height).toBe(GUJO_FIXTURE_GRID.height);
    expect(layer.cellSize).toBe(GUJO_FIXTURE_GRID.cellSize);
    expect(layer.originX).toBe(GUJO_FIXTURE_GRID.originX);
    expect(layer.originY).toBe(GUJO_FIXTURE_GRID.originY);
    expect(layer.heights.length).toBe(GUJO_FIXTURE_GRID.width * GUJO_FIXTURE_GRID.height);
    // no-data sentinel preserved for the terrain mesh renderer
    expect(layer.noDataValue).toBe(TERRAIN_NO_DATA_VALUE);
  });

  it("matches the documented EPSG:6674 bounds and elevation range", () => {
    const hf = buildGujoSampleHeightfield();
    const bounds = heightfieldLayerBounds(hf);

    expect(bounds.minX).toBe(GUJO_BOUNDS_EPSG6674.minX);
    expect(bounds.maxX).toBeCloseTo(
      GUJO_BOUNDS_EPSG6674.minX + (GUJO_FIXTURE_GRID.width - 1) * GUJO_FIXTURE_GRID.cellSize,
      6,
    );
    expect(bounds.minY).toBe(GUJO_BOUNDS_EPSG6674.minY);
    // elevation range 200..1200 m (basin floor -> mountain ridge)
    expect(bounds.minZ).toBeCloseTo(200, 6);
    expect(bounds.maxZ).toBeCloseTo(1200, 6);
  });

  it("produces the same bounds through the layer contract helper", () => {
    const hf = buildGujoSampleHeightfield();
    const layer = heightfieldToTerrainLayer(hf);
    const contractBounds = computeTerrainLayerBounds(layer);
    const adapterBounds = heightfieldLayerBounds(hf);
    expect(contractBounds).toEqual(adapterBounds);
  });

  it("decodes the committed SCT1 base64 back to a matching heightfield", () => {
    const decoded = base64ToHeightfield(GUJO_SAMPLE_SCT1_BASE64);
    expect(decoded.width).toBe(GUJO_FIXTURE_GRID.width);
    expect(decoded.height).toBe(GUJO_FIXTURE_GRID.height);
    expect(decoded.cellSize).toBe(GUJO_FIXTURE_GRID.cellSize);
    expect(decoded.originX).toBe(GUJO_FIXTURE_GRID.originX);
    expect(decoded.originY).toBe(GUJO_FIXTURE_GRID.originY);
    expect(decoded.data.length).toBe(GUJO_FIXTURE_GRID.width * GUJO_FIXTURE_GRID.height);
  });

  it("loads the sample heightfield through Lane T's loader", () => {
    const hf = loadGujoSampleHeightfield();
    expect(hf.width).toBe(GUJO_FIXTURE_GRID.width);
    expect(hf.data.length).toBe(GUJO_FIXTURE_GRID.width * GUJO_FIXTURE_GRID.height);
    const layer = heightfieldToTerrainLayer(hf);
    expect(computeTerrainLayerBounds(layer).minZ).toBeCloseTo(200, 6);
  });

  it("extracts the projectOrigin from a TerrainDocument (render local origin)", () => {
    const doc = {
      terrainId: "t",
      schemaVersion: "0.1.0",
      source: { sourceType: "dem" as const, sourceName: "s", importedAt: null },
      coordinateContext: {
        coordinateSystem: "project",
        projectOrigin: { x: 83996, y: -29697, z: 0 },
        localOrigin: null,
        unitSystem: "metric" as const,
        axisConvention: "x-along/y-transverse/z-up" as const,
      },
      bounds: null,
      surfaceReference: null,
      assetReferences: [],
    };
    expect(projectOriginFromTerrainDocument(doc)).toEqual({ x: 83996, y: -29697, z: 0 });
  });

  it("does not re-implement CRS inside the adapter (no lat/lon math here)", () => {
    // Guard: the adapter module must not contain its own projection math.
    // CRS conversion is Lane T territory (latLonToPlane / planeToLatLon).
    const adapterPath = join(dirname(fileURLToPath(import.meta.url)), "..", "terrainAdapter.ts");
    const src = readFileSync(adapterPath, "utf8");
    expect(src).not.toMatch(/Math\.sin/);
    expect(src).not.toMatch(/meridionalArc|footpoint|GRS80|6378137/);
  });
});

function terrainAdapterSourceText(): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require("fs").readFileSync(require.resolve("../terrainAdapter"), "utf8");
}
