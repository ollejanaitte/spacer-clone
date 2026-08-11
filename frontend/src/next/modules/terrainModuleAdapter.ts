import type { ProjectManager } from "../project/projectManager";
import { readModuleFromManager, writeModuleToManager } from "./adapter";
import type { ModuleDataRecord } from "./contract";
import { TERRAIN_MODULE_ID, createTerrainModuleRecord, validateTerrainData } from "./terrainModule";
import type { TerrainDocument } from "./terrainModule";

export type TerrainModuleAdapterResult =
  | { ok: true; terrainDocument: TerrainDocument | undefined }
  | { ok: false; reason: "project-not-found" | "invalid-terrain-data" };

export function readTerrainDocument(
  manager: ProjectManager,
  projectId: string,
): TerrainDocument | undefined {
  const moduleData = readModuleFromManager(manager, projectId, TERRAIN_MODULE_ID);
  const doc = moduleData?.data?.terrainDocument;
  return doc && typeof doc === "object" ? (doc as TerrainDocument) : undefined;
}

export function writeTerrainDocument(
  manager: ProjectManager,
  projectId: string,
  document: TerrainDocument | undefined,
): TerrainModuleAdapterResult {
  const existing = readModuleFromManager(manager, projectId, TERRAIN_MODULE_ID);
  if (!existing) {
    return { ok: false, reason: "project-not-found" };
  }
  const base: ModuleDataRecord = existing ?? createTerrainModuleRecord();
  const nextData: Record<string, unknown> = {
    ...base.data,
    ...(document !== undefined ? { terrainDocument: document } : {}),
  };
  const issues = validateTerrainData(nextData);
  if (issues.length > 0) {
    return { ok: false, reason: "invalid-terrain-data" };
  }
  const nextRecord: ModuleDataRecord = {
    ...base,
    data: nextData,
  };
  const result = writeModuleToManager(manager, projectId, TERRAIN_MODULE_ID, nextRecord);
  if (!result.ok) {
    return { ok: false, reason: result.reason === "project-not-found" ? "project-not-found" : "invalid-terrain-data" };
  }
  return { ok: true, terrainDocument: document };
}

export function hasTerrainDocument(manager: ProjectManager, projectId: string): boolean {
  return readTerrainDocument(manager, projectId) !== undefined;
}
