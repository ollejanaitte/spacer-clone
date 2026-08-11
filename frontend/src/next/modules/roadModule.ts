import type { ModuleDataRecord } from "./contract";
import { createInitialModuleData } from "./contract";
import type { RoadDesignDocument } from "../../contracts/roadDesignDocument";

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
 * Phase 2-A road data validation boundary.
 * - No document: valid (road not started).
 * - Document present: must be a non-null object carrying a document label.
 * Full RoadDesignDocument schema validation is deferred to Phase 2-02 when real
 * road design documents are produced; the strict contract validator lives in
 * frontend/src/contracts/roadDesignDocument.ts and is reused there.
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
  const label = (doc as { label?: unknown }).label;
  if (label !== undefined && typeof label !== "string") {
    issues.push({ path: "roadDesignDocument.label", message: "label must be a string" });
  }
  return issues;
}

export function createRoadModuleRecord(): ModuleDataRecord {
  return {
    ...createInitialModuleData(),
    data: { ...createRoadData() },
  };
}
