/**
 * Substructure persistence (Phase 6-01 D FROZEN / Phase 6-02 WP-A).
 *
 * Persisted DTO excludes DERIVED arrays (supportReferences /
 * bearingReactionReferences / bearingSeatReferences) and stores only canonical
 * inputs + references (+ geometry fingerprint). On restore, derived data is
 * regenerated from Bridge Layout / Superstructure and validated.
 */

import type { ProjectManager } from "../../project/projectManager";
import { buildSupportHandoff } from "../bridgeLayout/bridgeLayoutSupportHandoff";
import { readBridgeLayoutDocument } from "../bridgeLayoutModuleAdapter";
import type { SubstructureDocument } from "./substructureTypes";
import { validateSubstructureDocument } from "./substructureValidation";
import { attachSubstructureHandoffs } from "./substructureDocumentDomain";

/** Serialize for persistence: remove transient derived arrays (keep fingerprint). */
export function serializeSubstructureDocumentForPersistence(
  document: SubstructureDocument,
): Record<string, unknown> {
  const {
    supportReferences: _support,
    bearingReactionReferences: _bearing,
    bearingSeatReferences: _seats,
    ...rest
  } = document;
  return {
    ...rest,
    supportReferences: null,
    bearingReactionReferences: null,
    bearingSeatReferences: [],
  } as unknown as Record<string, unknown>;
}

export type DeserializeResult =
  | { ok: true; document: SubstructureDocument }
  | { ok: false; issues: readonly { path: string; message: string }[] };

/** Parse a persisted value into a SubstructureDocument (fail-closed). */
export function deserializeSubstructureDocumentFromPersistence(raw: unknown): DeserializeResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, issues: [{ path: "substructureDocument", message: "not an object" }] };
  }
  const candidate = raw as SubstructureDocument;
  if (candidate.schemaVersion !== "0.1.0") {
    return { ok: false, issues: [{ path: "substructureDocument.schemaVersion", message: `unsupported schemaVersion ${candidate.schemaVersion}` }] };
  }
  const issues = validateSubstructureDocument(candidate);
  if (issues.length > 0) {
    return { ok: false, issues };
  }
  return { ok: true, document: candidate };
}

/**
 * Regenerate the derived Support Handoff snapshot from Bridge Layout after
 * restore and attach it. Bearing/Reaction references (Phase 5) are attached by
 * the WP-C adapter (not regenerated here).
 */
export function regenerateSubstructureDerived(
  manager: ProjectManager,
  projectId: string,
  document: SubstructureDocument,
  now: string = new Date().toISOString(),
): SubstructureDocument {
  const layout = readBridgeLayoutDocument(manager, projectId);
  if (!layout) {
    return document;
  }
  const supportResult = buildSupportHandoff(manager, projectId, layout);
  const supportReferences = supportResult.ok ? supportResult.handoff : null;
  return attachSubstructureHandoffs(document, supportReferences, document.bearingReactionReferences, now);
}
