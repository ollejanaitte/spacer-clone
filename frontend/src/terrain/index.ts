// site-context-prototype Terrain 資産の選択 PORT 公開面（他 Lane 用）
// T-2: CRS / Coordinate Core / T-3: GSI DEM / T-4: Heightfield / SCT1 / checksum

export { NO_DATA, Heightfield, type ElevationResult } from "./heightfield";
export type { GridSpec, Bounds, Point3, Vec3, LocalOrigin } from "./types";

export {
  serializeHeightfieldBinary,
  deserializeHeightfieldBinary,
  heightfieldToBase64,
  base64ToHeightfield,
  bytesToBase64,
  base64ToBytes,
  SCT1_MAGIC,
  SCT1_HEADER_SIZE,
} from "./sct1";

export {
  gridBoundsFromHeightfield,
  elevationRangeFromHeightfield,
  buildTerrainAsset,
  buildTerrainDocument,
  buildTerrainAssetManifest,
  generateTerrain,
  type TerrainAsset,
  type TerrainAssetManifest,
  type TerrainAssetManifestEntry,
  type TerrainGenerationInput,
  type TerrainGenerationResult,
} from "./generation";
export {
  TERRAIN_ASSET_MANIFEST_KEY,
  persistTerrain,
  extractTerrainDocument,
  extractTerrainAssetManifest,
  extractTerrainAsset,
  verifyTerrainAssetChecksum,
  saveTerrainElevation,
  loadTerrainElevation,
  verifyReopenedTerrain,
  type TerrainPersistenceError,
} from "./terrainPersistence";
export {
  createMemoryTerrainElevationStore,
  heightfieldToAsset,
  makeHeightfield,
  type TerrainBinaryAsset,
  type TerrainElevationRecord,
  type TerrainElevationStore,
} from "./terrainAssetStore";
export {
  buildTerrainProject,
  terrainDocumentsEqual,
  roundtrip,
  storeRoundtrip,
  type TerrainRoundtripResult,
  type StoreRoundtripResult,
} from "./terrainRoundtrip";
export {
  GUJO_CENTER_WGS84,
  GUJO_EPSG,
  GUJO_CENTER_EPSG6674,
  GUJO_BOUNDS_WGS84,
  GUJO_BOUNDS_EPSG6674,
  GUJO_DEM5A,
  GUJO_FIXTURE_TIMESTAMP,
  GUJO_COORDINATE_CONTEXT_ID,
  GUJO_COORDINATE_CONTEXT,
  GUJO_SOURCE_DATASET,
  GUJO_SAMPLE_TERRAIN_ID,
  GUJO_SAMPLE_ASSET_PATH,
  GUJO_FIXTURE_GRID,
  GUJO_SAMPLE_ASSET_SIZE,
  GUJO_SAMPLE_ASSET_CHECKSUM,
  GUJO_SAMPLE_SCT1_BASE64,
  buildGujoSampleHeightfield,
  loadGujoSampleHeightfield,
  buildGujoSampleTerrainDocument,
  buildGujoSampleAsset,
  buildGujoSampleProject,
} from "./gujoSample";

export { canonicalize, sha256Hex, sha256BytesHex, canonicalHash } from "./canonicalize";

export { JGD2011_ZONES, ZONE_BY_EPSG, latLonToPlane, planeToLatLon, type Zone } from "./coordinate/transform";
export {
  EPSG_CLASSIFIER_VERSION,
  isPlaneRectangular,
  classifyCrs,
  classifyEpsg,
  type CrsProjection,
  type ClassifiedCrs,
} from "./coordinate/epsgClassifier";
export { RenderCoordinateAdapter, azimuthToDir, rightNormal } from "./coordinate/renderAdapter";

export {
  tileXY,
  tileRangeForBBox,
  GSI_DATASETS,
  DEM_FALLBACK_CHAIN,
  tileResolutionMeters,
  fetchDemTiles,
  type TileFetcher,
  type TileRange,
  type DemDataset,
  type GsiFetchOptions,
  type GsiTileMeta,
  type GsiDemResult,
} from "./gsi/gsi";
export { decodePng, decodeDemTile, type PngImage } from "./gsi/png";
export { DEM_TILE_SIZE, dem10bChildToParentPixel } from "./gsi/dem10bMapping";