// site-context-prototype Terrain 資産の選択 PORT 公開面（他 Lane 用）
// T-2: CRS / Coordinate Core / T-3: GSI DEM / T-4: Heightfield / SCT1 / checksum

export { NO_DATA, Heightfield, type ElevationResult } from "./heightfield";
export type { GridSpec, Bounds, Point3, Vec3, LocalOrigin } from "./types";

export {
  serializeHeightfieldBinary,
  deserializeHeightfieldBinary,
  heightfieldToBase64,
  base64ToHeightfield,
  SCT1_MAGIC,
  SCT1_HEADER_SIZE,
} from "./sct1";

export { canonicalize, sha256Hex, canonicalHash } from "./canonicalize";

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