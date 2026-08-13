import type { ProjectManager } from "../project/projectManager";
import type { RoadDesignDocument } from "../../contracts/roadDesignDocument";
import { readModuleFromManager, writeModuleToManager } from "./adapter";
import type { ModuleDataRecord } from "./contract";
import { ROAD_MODULE_ID, createRoadModuleRecord, validateRoadData } from "./roadModule";
import {
  finalizeCanonicalRoadData,
  validateCanonicalRoadData,
  type CanonicalRoadData,
} from "./road/roadDataSchema";
import {
  ensureCanonicalRoadData,
  type MigrationContext,
  type MigrationResult,
} from "./road/roadDataMigration";

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

// ---------------------------------------------------------------------------
// Canonical Road Data (Single Source of Truth, Phase 7.2 FROZEN / 7.3 WP-A)
// ---------------------------------------------------------------------------

export type RoadDataAdapterResult =
  | { ok: true; roadData: CanonicalRoadData }
  | { ok: false; reason: "project-not-found" | "invalid-road-data" };

/** Read the raw canonical roadData (without migration). */
export function readRoadDataRaw(manager: ProjectManager, projectId: string): unknown {
  const moduleData = readModuleFromManager(manager, projectId, ROAD_MODULE_ID);
  return moduleData?.data?.roadData;
}

/** Read the canonical roadData (validated; undefined when absent). */
export function readRoadData(
  manager: ProjectManager,
  projectId: string,
): CanonicalRoadData | undefined {
  const raw = readRoadDataRaw(manager, projectId);
  if (raw === undefined) {
    return undefined;
  }
  return finalizeCanonicalRoadData(raw) ?? undefined;
}

/** Write the canonical roadData (atomic: validate then commit). */
export function writeRoadData(
  manager: ProjectManager,
  projectId: string,
  roadData: CanonicalRoadData,
): RoadDataAdapterResult {
  const existing = readModuleFromManager(manager, projectId, ROAD_MODULE_ID);
  if (!existing) {
    return { ok: false, reason: "project-not-found" };
  }
  const issues = validateCanonicalRoadData(roadData);
  if (issues.length > 0) {
    return { ok: false, reason: "invalid-road-data" };
  }
  const nextRecord: ModuleDataRecord = {
    ...existing,
    data: {
      ...existing.data,
      roadData,
    },
  };
  const result = writeModuleToManager(manager, projectId, ROAD_MODULE_ID, nextRecord);
  if (!result.ok) {
    return { ok: false, reason: "project-not-found" };
  }
  return { ok: true, roadData };
}

/**
 * Single Source of Truth accessor. Returns the canonical roadData, migrating
 * legacy sources on first access (non-destructive / atomic / fail-closed).
 */
export function ensureRoadData(
  manager: ProjectManager,
  projectId: string,
  context: MigrationContext,
): RoadDataAdapterResult {
  const existing = readRoadDataRaw(manager, projectId);
  const result = ensureCanonicalRoadData(existing, context);
  if (!result.ok) {
    return { ok: false, reason: "invalid-road-data" };
  }
  if (result.migrated) {
    const write = writeRoadData(manager, projectId, result.roadData);
    if (!write.ok) {
      return write;
    }
  }
  return { ok: true, roadData: result.roadData };
}

export type { MigrationResult };

export interface RoadInputsData {
  readonly label?: string;
  readonly horizontal?: unknown;
  readonly vertical?: readonly unknown[];
  readonly crossSections?: readonly unknown[];
}

export function readRoadInputs(
  manager: ProjectManager,
  projectId: string,
): RoadInputsData {
  const moduleData = readModuleFromManager(manager, projectId, ROAD_MODULE_ID);
  const raw = moduleData?.data?.roadInput;
  if (raw && typeof raw === "object") {
    return raw as RoadInputsData;
  }
  return {};
}

export function writeRoadInputs(
  manager: ProjectManager,
  projectId: string,
  inputs: RoadInputsData,
): RoadModuleAdapterResult {
  const existing = readModuleFromManager(manager, projectId, ROAD_MODULE_ID);
  if (!existing) {
    return { ok: false, reason: "project-not-found" };
  }
  if (inputs.label !== undefined && typeof inputs.label !== "string") {
    return { ok: false, reason: "invalid-road-data" };
  }
  const current = typeof existing.data.roadInput === "object" && existing.data.roadInput !== null
    ? (existing.data.roadInput as Record<string, unknown>)
    : {};
  const merged: Record<string, unknown> = { ...current };
  if (inputs.label !== undefined) merged.label = inputs.label;
  if (inputs.horizontal !== undefined) merged.horizontal = inputs.horizontal;
  if (inputs.vertical !== undefined) merged.vertical = inputs.vertical;
  if (inputs.crossSections !== undefined) merged.crossSections = inputs.crossSections;
  const nextRecord: ModuleDataRecord = {
    ...existing,
    data: {
      ...existing.data,
      roadInput: merged,
    },
  };
  const result = writeModuleToManager(manager, projectId, ROAD_MODULE_ID, nextRecord);
  if (!result.ok) {
    return { ok: false, reason: "project-not-found" };
  }
  return { ok: true, roadDesignDocument: undefined };
}
