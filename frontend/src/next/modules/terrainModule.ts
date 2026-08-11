import type { ModuleDataRecord } from "./contract";
import { createInitialModuleData } from "./contract";

export const TERRAIN_MODULE_ID = "terrain" as const;
export const TERRAIN_SCHEMA_VERSION = "0.1.0" as const;
export const TERRAIN_DATA_VERSION = "1.0.0" as const;

export interface TerrainBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly minElevation: number;
  readonly maxElevation: number;
}

export interface TerrainSourceMetadata {
  readonly sourceType: "none" | "csv" | "xyz" | "landxml" | "dem" | "geotiff" | "pointcloud";
  readonly sourceName: string;
  readonly importedAt: string | null;
}

export interface TerrainCoordinateContext {
  readonly coordinateSystem: string;
  readonly projectOrigin: { readonly x: number; readonly y: number; readonly z: number };
  readonly localOrigin: { readonly x: number; readonly y: number; readonly z: number } | null;
  readonly unitSystem: "metric";
  readonly axisConvention: "x-along/y-transverse/z-up";
}

export interface TerrainDocument {
  readonly terrainId: string;
  readonly schemaVersion: string;
  readonly source: TerrainSourceMetadata;
  readonly coordinateContext: TerrainCoordinateContext;
  readonly bounds: TerrainBounds | null;
  readonly surfaceReference: string | null;
  readonly assetReferences: readonly string[];
}

export interface TerrainModuleData {
  readonly terrainDocument?: TerrainDocument;
}

export function createEmptyTerrainDocument(): TerrainDocument {
  return {
    terrainId: "",
    schemaVersion: TERRAIN_SCHEMA_VERSION,
    source: { sourceType: "none", sourceName: "", importedAt: null },
    coordinateContext: {
      coordinateSystem: "project",
      projectOrigin: { x: 0, y: 0, z: 0 },
      localOrigin: null,
      unitSystem: "metric",
      axisConvention: "x-along/y-transverse/z-up",
    },
    bounds: null,
    surfaceReference: null,
    assetReferences: [],
  };
}

export function createTerrainData(): TerrainModuleData {
  return { terrainDocument: undefined };
}

export function isTerrainData(value: unknown): value is TerrainModuleData {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.terrainDocument === undefined || typeof record.terrainDocument === "object";
}

export function validateTerrainData(data: Record<string, unknown>): readonly { path: string; message: string }[] {
  const issues: { path: string; message: string }[] = [];
  const doc = (data as TerrainModuleData).terrainDocument;
  if (doc === undefined) {
    return [];
  }
  if (doc === null || typeof doc !== "object" || Array.isArray(doc)) {
    issues.push({ path: "terrainDocument", message: "terrainDocument must be an object" });
    return issues;
  }
  const record = doc as TerrainDocument;
  if (typeof record.terrainId !== "string") {
    issues.push({ path: "terrainDocument.terrainId", message: "terrainId must be a string" });
  }
  if (typeof record.schemaVersion !== "string" || record.schemaVersion.length === 0) {
    issues.push({ path: "terrainDocument.schemaVersion", message: "schemaVersion required" });
  }
  if (!record.coordinateContext || typeof record.coordinateContext !== "object") {
    issues.push({ path: "terrainDocument.coordinateContext", message: "coordinateContext required" });
  } else {
    const cc = record.coordinateContext;
    if (cc.unitSystem !== "metric") {
      issues.push({ path: "terrainDocument.coordinateContext.unitSystem", message: "unitSystem must be metric" });
    }
    if (cc.axisConvention !== "x-along/y-transverse/z-up") {
      issues.push({ path: "terrainDocument.coordinateContext.axisConvention", message: "axisConvention mismatch" });
    }
  }
  if (record.bounds !== null && typeof record.bounds !== "object") {
    issues.push({ path: "terrainDocument.bounds", message: "bounds must be an object or null" });
  }
  if (!Array.isArray(record.assetReferences)) {
    issues.push({ path: "terrainDocument.assetReferences", message: "assetReferences must be an array" });
  }
  return issues;
}

export function createTerrainModuleRecord(): ModuleDataRecord {
  return {
    ...createInitialModuleData(),
    data: { ...createTerrainData() },
  };
}
