/**
 * Deliverables module (Phase 11 P0-01 · SYS-03).
 *
 * Registers the deliverables module record + validator. The deliverables
 * module stores only a manifest (source references + fingerprint), never
 * artifact bytes. Artifacts are regenerated from canonical module data.
 */

import type { ModuleDataRecord, ModuleValidationIssue } from "./contract";
import { createInitialModuleData } from "./contract";
import { registerModuleValidator } from "./validation";
import { createEmptyDeliverablesManifest, type DeliverablesManifest } from "./deliverables/deliverablesManifest";

export const DELIVERABLES_MODULE_ID = "deliverables" as const;
export const DELIVERABLES_SCHEMA_VERSION = "0.1.0";
export const DELIVERABLES_DATA_VERSION = "1.0.0";

export interface DeliverablesModuleData {
  readonly manifest?: DeliverablesManifest;
  readonly importProvenance?: {
    readonly fixtureId: string;
    readonly fixtureVersion: string;
    readonly importedAt: string;
    readonly moduleChecksums: Readonly<Record<string, string | null>>;
    readonly existingChecksum: string | null;
    readonly operator: string;
  } | null;
}

export function createDeliverablesData(): DeliverablesModuleData {
  return { manifest: createEmptyDeliverablesManifest(), importProvenance: null };
}

export function createDeliverablesModuleRecord(): ModuleDataRecord {
  return {
    ...createInitialModuleData(),
    data: { ...createDeliverablesData() } as unknown as Record<string, unknown>,
  };
}

export function validateDeliverablesData(data: Record<string, unknown>): readonly ModuleValidationIssue[] {
  const issues: ModuleValidationIssue[] = [];
  if (data.manifest !== undefined && typeof data.manifest !== "object") {
    issues.push({ path: "deliverables.manifest", message: "manifest must be an object." });
  }
  if (data.importProvenance !== undefined && data.importProvenance !== null && typeof data.importProvenance !== "object") {
    issues.push({ path: "deliverables.importProvenance", message: "importProvenance must be an object or null." });
  }
  return issues;
}

registerModuleValidator(DELIVERABLES_MODULE_ID, validateDeliverablesData);

export { DELIVERABLES_MODULE_ID as DELIVERABLES_MODULE_KEY };
