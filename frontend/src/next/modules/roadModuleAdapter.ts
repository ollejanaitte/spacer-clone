import type { ProjectManager } from "../project/projectManager";
import type { RoadDesignDocument } from "../../contracts/roadDesignDocument";
import { readModuleFromManager, writeModuleToManager } from "./adapter";
import type { ModuleDataRecord } from "./contract";
import { ROAD_MODULE_ID, createRoadModuleRecord, validateRoadData } from "./roadModule";

export type RoadModuleAdapterResult =
  | { ok: true; roadDesignDocument: RoadDesignDocument | undefined }
  | { ok: false; reason: "project-not-found" | "invalid-road-data" };

export function readRoadDesignDocument(
  manager: ProjectManager,
  projectId: string,
): RoadDesignDocument | undefined {
  const moduleData = readModuleFromManager(manager, projectId, ROAD_MODULE_ID);
  const doc = moduleData?.data?.roadDesignDocument;
  return doc && typeof doc === "object" ? (doc as RoadDesignDocument) : undefined;
}

export function writeRoadDesignDocument(
  manager: ProjectManager,
  projectId: string,
  document: RoadDesignDocument | undefined,
): RoadModuleAdapterResult {
  const existing = readModuleFromManager(manager, projectId, ROAD_MODULE_ID);
  if (!existing) {
    return { ok: false, reason: "project-not-found" };
  }
  const base: ModuleDataRecord = existing ?? createRoadModuleRecord();
  const nextData: Record<string, unknown> = {
    ...base.data,
    ...(document !== undefined ? { roadDesignDocument: document } : {}),
  };
  const issues = validateRoadData(nextData);
  if (issues.length > 0) {
    return { ok: false, reason: "invalid-road-data" };
  }
  const nextRecord: ModuleDataRecord = {
    ...base,
    data: nextData,
  };
  const result = writeModuleToManager(manager, projectId, ROAD_MODULE_ID, nextRecord);
  if (!result.ok) {
    return { ok: false, reason: result.reason === "project-not-found" ? "project-not-found" : "invalid-road-data" };
  }
  return { ok: true, roadDesignDocument: document };
}

export function hasRoadDesignDocument(manager: ProjectManager, projectId: string): boolean {
  return readRoadDesignDocument(manager, projectId) !== undefined;
}
