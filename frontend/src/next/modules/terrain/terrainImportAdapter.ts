import type { ProjectManager } from "../../project/projectManager";
import { readTerrainDocument, writeTerrainDocument } from "../terrainModuleAdapter";
import type { TerrainDocument } from "../terrainModule";
import { TERRAIN_SCHEMA_VERSION } from "../terrainModule";
import type { TerrainImportResult } from "./terrainImport";

export interface RegisterTerrainImportInput {
  readonly sourceType: "csv" | "xyz" | "landxml" | "dem" | "geotiff" | "pointcloud";
  readonly sourceName: string;
  readonly importResult: TerrainImportResult;
  readonly projectOrigin?: { readonly x: number; readonly y: number; readonly z: number };
  readonly surfaceAssetRef?: string;
}

export type RegisterTerrainImportResult =
  | { ok: true; terrainDocument: TerrainDocument }
  | { ok: false; reason: "project-not-found" | "invalid-terrain-data" | "empty-import" };

export function registerTerrainImport(
  manager: ProjectManager,
  projectId: string,
  input: RegisterTerrainImportInput,
): RegisterTerrainImportResult {
  if (!input.importResult.ok || input.importResult.points.length === 0) {
    return { ok: false, reason: "empty-import" };
  }
  const existing = readTerrainDocument(manager, projectId) ?? undefined;
  const b = input.importResult.bounds;
  const terrainId = existing?.terrainId ?? `terrain-${input.sourceName}`;
  const doc: TerrainDocument = {
    terrainId,
    schemaVersion: existing?.schemaVersion ?? TERRAIN_SCHEMA_VERSION,
    source: {
      sourceType: input.sourceType,
      sourceName: input.sourceName,
      importedAt: new Date().toISOString(),
    },
    coordinateContext: {
      coordinateSystem: "project",
      projectOrigin: input.projectOrigin ?? { x: 0, y: 0, z: 0 },
      localOrigin: null,
      unitSystem: "metric",
      axisConvention: "x-along/y-transverse/z-up",
    },
    bounds: {
      minX: b.minX,
      minY: b.minY,
      maxX: b.maxX,
      maxY: b.maxY,
      minElevation: b.minZ,
      maxElevation: b.maxZ,
    },
    surfaceReference: input.surfaceAssetRef ?? existing?.surfaceReference ?? null,
    assetReferences: [
      ...(existing?.assetReferences ?? []),
      ...(input.surfaceAssetRef ? [input.surfaceAssetRef] : []),
    ],
  };
  const write = writeTerrainDocument(manager, projectId, doc);
  if (!write.ok) {
    return { ok: false, reason: write.reason === "project-not-found" ? "project-not-found" : "invalid-terrain-data" };
  }
  return { ok: true, terrainDocument: doc };
}
