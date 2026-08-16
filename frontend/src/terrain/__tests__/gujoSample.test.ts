import { describe, expect, it } from "vitest";
import { latLonToPlane } from "../coordinate/transform";
import { elevationRangeFromHeightfield } from "../generation";
import { heightfieldToBase64, serializeHeightfieldBinary } from "../sct1";
import { sha256BytesHex } from "../canonicalize";
import { extractTerrainDocument, verifyTerrainAssetChecksum } from "../terrainPersistence";
import { parseProject } from "../../next/project/projectDataCore";
import {
  GUJO_BOUNDS_EPSG6674,
  GUJO_BOUNDS_WGS84,
  GUJO_CENTER_EPSG6674,
  GUJO_CENTER_WGS84,
  GUJO_COORDINATE_CONTEXT,
  GUJO_COORDINATE_CONTEXT_ID,
  GUJO_DEM5A,
  GUJO_EPSG,
  GUJO_SAMPLE_ASSET_CHECKSUM,
  GUJO_SAMPLE_ASSET_PATH,
  GUJO_SAMPLE_ASSET_SIZE,
  GUJO_SAMPLE_SCT1_BASE64,
  GUJO_SAMPLE_TERRAIN_ID,
  GUJO_SOURCE_DATASET,
  buildGujoSampleAsset,
  buildGujoSampleHeightfield,
  buildGujoSampleProject,
  buildGujoSampleTerrainDocument,
  loadGujoSampleHeightfield,
} from "../gujoSample";

describe("T-6 Gujo Hachiman Sample PORT (Reference Business 001 fixture)", () => {
  it("baseline constants match reference-business-001-gujo-baseline.md", () => {
    expect(GUJO_CENTER_WGS84).toEqual({ lat: 35.7512, lon: 136.9567 });
    expect(GUJO_EPSG).toBe(6674);
    expect(GUJO_CENTER_EPSG6674).toEqual({ x: 86522.4, y: -27181.2 });
    expect(GUJO_BOUNDS_WGS84).toEqual({ lonMin: 136.929, lonMax: 136.9844, latMin: 35.7287, latMax: 35.7737 });
    expect(GUJO_BOUNDS_EPSG6674).toEqual({ minX: 83996, minY: -29697, maxX: 89050, maxY: -24665 });
    expect(GUJO_DEM5A.datasetId).toBe("dem5a_png");
    expect(GUJO_DEM5A.zoom).toBe(15);
    expect(GUJO_DEM5A.tileXMin).toBe(28847);
    expect(GUJO_DEM5A.tileXMax).toBe(28852);
    expect(GUJO_DEM5A.tileYMin).toBe(12892);
    expect(GUJO_DEM5A.tileYMax).toBe(12897);
    expect(GUJO_DEM5A.tileCount).toBe(36);
    expect(GUJO_DEM5A.cellSize).toBe(5);
    // 約 5km×5km（baseline §4: 約 5km × 5km・25km²）
    const spanX = GUJO_BOUNDS_EPSG6674.maxX - GUJO_BOUNDS_EPSG6674.minX;
    const spanY = GUJO_BOUNDS_EPSG6674.maxY - GUJO_BOUNDS_EPSG6674.minY;
    expect(spanX).toBeGreaterThan(4900);
    expect(spanX).toBeLessThan(5200);
    expect(spanY).toBeGreaterThan(4900);
    expect(spanY).toBeLessThan(5200);
  });

  it("transform EPSG:6674 center matches the pyproj-verified baseline within ±3m", () => {
    const p = latLonToPlane(GUJO_CENTER_WGS84.lat, GUJO_CENTER_WGS84.lon, GUJO_EPSG);
    expect(Math.abs(p.x - GUJO_CENTER_EPSG6674.x)).toBeLessThan(3);
    expect(Math.abs(p.y - GUJO_CENTER_EPSG6674.y)).toBeLessThan(3);
  });

  it("committed fixture base64 decodes to a Heightfield with documented grid and 200-1200m range", () => {
    const hf = loadGujoSampleHeightfield();
    expect(hf.width).toBe(32);
    expect(hf.height).toBe(32);
    expect(hf.cellSize).toBe(5);
    expect(hf.originX).toBe(83996);
    expect(hf.originY).toBe(-29697);
    expect(elevationRangeFromHeightfield(hf)).toEqual({ minElevation: 200, maxElevation: 1200 });

    const built = buildGujoSampleHeightfield();
    expect(built.data).toEqual(hf.data);
    expect(built.width).toBe(hf.width);
    expect(built.originX).toBe(hf.originX);
  });

  it("fixture has a deterministic checksum (committed constant == recomputed)", async () => {
    const hf = loadGujoSampleHeightfield();
    const bytes = serializeHeightfieldBinary(hf);
    expect(GUJO_SAMPLE_ASSET_SIZE).toBe(bytes.length);
    expect(GUJO_SAMPLE_ASSET_CHECKSUM).toMatch(/^[a-f0-9]{64}$/);
    expect(GUJO_SAMPLE_ASSET_CHECKSUM).toBe(await sha256BytesHex(bytes));
    expect(GUJO_SAMPLE_SCT1_BASE64).toBe(heightfieldToBase64(hf));
    expect(GUJO_SAMPLE_SCT1_BASE64).toBe(heightfieldToBase64(buildGujoSampleHeightfield()));
  });

  it("terrainDocument / asset follow the terrain generation convention", () => {
    const doc = buildGujoSampleTerrainDocument();
    const asset = buildGujoSampleAsset();
    expect(doc.terrainId).toBe(GUJO_SAMPLE_TERRAIN_ID);
    expect(doc.surfaceReference).toBe(GUJO_SAMPLE_ASSET_PATH);
    expect(doc.assetReferences).toEqual([GUJO_SAMPLE_ASSET_PATH]);
    expect(doc.source).toEqual({
      sourceType: "dem",
      sourceName: "国土地理院 標高タイル",
      importedAt: "2026-08-16T00:00:00.000Z",
    });
    expect(doc.coordinateContext.projectOrigin).toEqual({ x: 0, y: 0, z: 0 });
    expect(asset.path).toBe(GUJO_SAMPLE_ASSET_PATH);
    expect(asset.checksum).toBe(GUJO_SAMPLE_ASSET_CHECKSUM);
    expect(asset.base64).toBe(GUJO_SAMPLE_SCT1_BASE64);
  });

  it("sample project passes parseProject and preserves terrain + metadata slots", async () => {
    const project = buildGujoSampleProject();
    const parsed = parseProject(project);
    expect(parsed.ok).toBe(true);

    const doc = extractTerrainDocument(project);
    expect(doc).toBeDefined();
    expect(doc?.terrainId).toBe(GUJO_SAMPLE_TERRAIN_ID);
    expect(doc?.surfaceReference).toBe(GUJO_SAMPLE_ASSET_PATH);
    expect(doc?.bounds).toEqual({
      minX: 83993.5,
      minY: -29699.5,
      maxX: 84153.5,
      maxY: -29539.5,
      minElevation: 200,
      maxElevation: 1200,
    });

    expect(project.metadata.siteContextProjectCoordinateContextId).toBe(GUJO_COORDINATE_CONTEXT_ID);
    expect(project.metadata.siteContextCoordinateContexts).toEqual([GUJO_COORDINATE_CONTEXT]);
    expect(project.metadata.siteContextSourceDatasets).toEqual([GUJO_SOURCE_DATASET]);

    const verify = await verifyTerrainAssetChecksum(project);
    expect(verify.ok).toBe(true);
  });
});