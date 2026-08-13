/**
 * Analysis module data integration (Phase 7-02 WP-I).
 *
 * Serializes the AnalysisDocument into the Project Data Core module-data shape
 * and restores it, tying into the project autosave / .spacerproj round-trip.
 */

import type { AnalysisDocument, AnalysisModuleData } from "./analysisDocumentTypes";
import {
  deserializeAnalysisDocumentFromPersistence,
  serializeAnalysisDocumentForPersistence,
} from "./analysisPersistence";

export type AnalysisModuleDataResult =
  | { ok: true; data: AnalysisModuleData }
  | { ok: false; issues: readonly { path: string; message: string }[] };

/** Build the PDC module-data payload for the project autosave. */
export function buildAnalysisModuleData(document: AnalysisDocument | null): AnalysisModuleData {
  if (document === null) {
    return {};
  }
  return { analysisDocument: document };
}

/** Serialize the module data for persistence (deterministic). */
export function serializeAnalysisModuleDataForPersistence(
  data: AnalysisModuleData,
): Record<string, unknown> {
  if (!data.analysisDocument) {
    return {};
  }
  return {
    analysisDocument: serializeAnalysisDocumentForPersistence(data.analysisDocument),
  };
}

/** Restore the module data from persistence (fail-closed). */
export function deserializeAnalysisModuleDataFromPersistence(
  raw: unknown,
): AnalysisModuleDataResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, issues: [{ path: "analysis", message: "not an object" }] };
  }
  const candidate = raw as { analysisDocument?: unknown };
  if (candidate.analysisDocument === undefined) {
    return { ok: true, data: {} };
  }
  const result = deserializeAnalysisDocumentFromPersistence(candidate.analysisDocument);
  if (!result.ok) {
    return { ok: false, issues: result.issues };
  }
  return { ok: true, data: { analysisDocument: result.document } };
}
