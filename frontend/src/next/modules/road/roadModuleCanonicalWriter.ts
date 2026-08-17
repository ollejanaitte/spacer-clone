/**
 * G-6: Canonical Road → Project module writer.
 *
 * Writes CanonicalRoadData (modules.road.data.roadData, single source of truth)
 * directly onto a PDC Project object (no ProjectManager required) following the
 * unified module-record shape. Mirrors unifiedModuleWriter's super/sub/analysis
 * writers. Used by RB001's savedProject so the analysis page
 * (buildDerivedAnalysisDocument → readRoadData → loadRoadEditorDraft) reads the
 * same canonical Road from the module slot.
 */

import type { Project, ProjectModule } from "../../project/schema";
import type { ModuleDataRecord } from "../contract";
import { createInitialModuleData } from "../contract";
import { createRoadModuleRecord, validateRoadData } from "../roadModule";
import type { CanonicalRoadData } from "./roadDataSchema";

export function writeCanonicalRoadDataToProject(
  project: Project,
  roadData: CanonicalRoadData,
): Project {
  const existing = project.modules.road as Record<string, unknown> | undefined;
  const existingData = (existing?.data as Record<string, unknown> | undefined) ?? {};
  const data: Record<string, unknown> = {
    ...existingData,
    roadData,
  };
  const issues = validateRoadData(data);
  if (issues.length > 0) {
    throw new Error(
      `RB001-ROAD-PERSIST-FAILED: ${issues.map((i) => `${i.path}: ${i.message}`).join("; ")}`,
    );
  }
  const record: ModuleDataRecord = {
    ...createInitialModuleData(),
    ...(existing ?? {}),
    data,
  };
  return {
    ...project,
    updatedAt: new Date().toISOString(),
    modules: {
      ...project.modules,
      road: record as unknown as ProjectModule,
    },
  };
}
