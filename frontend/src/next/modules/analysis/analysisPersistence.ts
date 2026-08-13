/**
 * AnalysisDocument persistence (Phase 7-01 D FROZEN / Phase 7-02 WP-A/WP-I).
 *
 * The AnalysisDocument is a derived canonical document stored in the Project
 * Data Core. Serialization keeps the full document (it is derived and
 * deterministic; regeneration is triggered by upstream fingerprint changes).
 * Malformed / unsupported data is rejected (fail-closed).
 */

import type { AnalysisDocument } from "./analysisDocumentTypes";
import { validateAnalysisDocument } from "./analysisValidation";
import { finalizeAnalysisDocument } from "./analysisDocument";

export type DeserializeAnalysisResult =
  | { ok: true; document: AnalysisDocument }
  | { ok: false; issues: readonly { path: string; message: string }[] };

/** Serialize for persistence (full document; checksums already stable). */
export function serializeAnalysisDocumentForPersistence(
  document: AnalysisDocument,
): Record<string, unknown> {
  return document as unknown as Record<string, unknown>;
}

/** Parse a persisted value into an AnalysisDocument (fail-closed). */
export function deserializeAnalysisDocumentFromPersistence(raw: unknown): DeserializeAnalysisResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, issues: [{ path: "analysisDocument", message: "not an object" }] };
  }
  const candidate = raw as AnalysisDocument;
  if (candidate.schemaVersion !== "1.0.0") {
    return {
      ok: false,
      issues: [
        {
          path: "analysisDocument.schemaVersion",
          message: `unsupported schemaVersion ${candidate.schemaVersion}`,
        },
      ],
    };
  }
  if (candidate.schemaId !== "spacer.contracts.analysis-document") {
    return {
      ok: false,
      issues: [{ path: "analysisDocument.schemaId", message: "schemaId mismatch." }],
    };
  }
  const issues = validateAnalysisDocument(candidate);
  if (issues.length > 0) {
    return { ok: false, issues };
  }
  // Re-finalize so checksums are guaranteed consistent with the stored content.
  const finalized = finalizeAnalysisDocument(candidate);
  const finalIssues = validateAnalysisDocument(finalized);
  if (finalIssues.length > 0) {
    return { ok: false, issues: finalIssues };
  }
  return { ok: true, document: finalized };
}
