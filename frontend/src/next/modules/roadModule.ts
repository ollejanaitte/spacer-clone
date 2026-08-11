import type { ModuleDataRecord } from "./contract";
import { createInitialModuleData } from "./contract";
import {
  validateRoadDesignDocument,
  type RoadDesignDocument,
} from "../../contracts/roadDesignDocument";

export const ROAD_MODULE_ID = "road" as const;

export interface RoadModuleData {
  readonly roadDesignDocument?: RoadDesignDocument;
}

export function createRoadData(): RoadModuleData {
  return {};
}

export function isRoadData(value: unknown): value is RoadModuleData {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.roadDesignDocument === undefined || typeof record.roadDesignDocument === "object";
}

/**
 * Phase 2-07: Road data validation boundary with full RoadDesignDocument
 * schema validation (Phase 2-A deferred item). Empty data is valid (road not
 * started); a present document must pass the strict contract validator.
 */
export function validateRoadData(data: Record<string, unknown>): readonly { path: string; message: string }[] {
  const issues: { path: string; message: string }[] = [];
  const doc = (data as RoadModuleData).roadDesignDocument;
  if (doc === undefined) {
    return [];
  }
  if (doc === null || typeof doc !== "object" || Array.isArray(doc)) {
    issues.push({ path: "roadDesignDocument", message: "roadDesignDocument must be an object" });
    return issues;
  }
  const result = validateRoadDesignDocument(doc as Partial<RoadDesignDocument>, "roadDesignDocument");
  for (const issue of result.issues) {
    issues.push({ path: issue.path, message: issue.message });
  }
  return issues;
}

export function createRoadModuleRecord(): ModuleDataRecord {
  return {
    ...createInitialModuleData(),
    data: { ...createRoadData() },
  };
}
