/**
 * Deliverables module (Phase 11 P0-01 · SYS-03).
 *
 * The deliverables module is the single production entry for V1.0 required
 * deliverables. It does NOT store artifact bytes — it stores a manifest of
 * source references (canonical module + revision/checksum) and evaluates
 * STALE / INVALID against the current canonical sources. Artifacts are
 * regenerated deterministically from canonical data on demand.
 *
 * SoT boundary: deliverables owns the manifest + stale/invalid gate only.
 * Each artifact's builder is owned by its source module.
 */

import type { ProjectManager } from "../../project/projectManager";
import type { ModuleDataRecord } from "../contract";
import { readModuleFromManager, writeModuleToManager } from "../adapter";
import type { ProjectModuleKey } from "../../project/schema";

export const DELIVERABLES_MODULE_ID = "deliverables" as const;

export interface DeliverableEntry {
  readonly deliverableId: string;
  readonly label: string;
  readonly kind: "dxf" | "csv" | "html" | "glb" | "package" | "report";
  readonly sourceModule: ProjectModuleKey;
  readonly sourceRevision: string;
  readonly sourceChecksum: string;
  readonly fileName: string;
  /** stable fingerprint of the source canonical content at generation time */
  readonly fingerprint: string;
  readonly generatedAt: string;
  readonly stale: boolean;
  readonly invalid: boolean;
}

export interface DeliverablesManifest {
  readonly entries: readonly DeliverableEntry[];
}

export function createEmptyDeliverablesManifest(): DeliverablesManifest {
  return { entries: [] };
}

export function readDeliverablesManifest(
  manager: ProjectManager,
  projectId: string,
): DeliverablesManifest | undefined {
  const moduleData = readModuleFromManager(manager, projectId, DELIVERABLES_MODULE_ID);
  const raw = moduleData?.data?.manifest;
  return raw && typeof raw === "object" ? (raw as DeliverablesManifest) : undefined;
}

export function writeDeliverablesManifest(
  manager: ProjectManager,
  projectId: string,
  manifest: DeliverablesManifest,
): boolean {
  const existing = readModuleFromManager(manager, projectId, DELIVERABLES_MODULE_ID);
  if (!existing) {
    return false;
  }
  const nextData: Record<string, unknown> = {
    ...existing.data,
    manifest,
  };
  const nextRecord: ModuleDataRecord = {
    ...existing,
    data: nextData,
  };
  const result = writeModuleToManager(manager, projectId, DELIVERABLES_MODULE_ID, nextRecord);
  return result.ok === true;
}

export function isDeliverableStale(entry: DeliverableEntry, currentFingerprint: string): boolean {
  return entry.fingerprint !== currentFingerprint;
}
