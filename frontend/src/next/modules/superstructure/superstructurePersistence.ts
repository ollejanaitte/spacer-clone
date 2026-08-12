/**
 * Superstructure persistence (Phase 5-01 E-01 FROZEN / Phase 5-02 WP-I).
 *
 * Persisted DTO excludes the DERIVED arrays (spanReferences / supportReferences)
 * and stores only the canonical inputs + references (+ geometry fingerprint).
 * On restore, derived data is regenerated from Bridge Layout and validated
 * (derived-consistency). Malformed / unsupported data is rejected (fail-closed).
 */

import type { ProjectManager } from "../../project/projectManager";
import { buildSpanHandoff } from "../bridgeLayout/bridgeLayoutSpanHandoff";
import { buildSupportHandoff } from "../bridgeLayout/bridgeLayoutSupportHandoff";
import { readBridgeLayoutDocument } from "../bridgeLayoutModuleAdapter";
import type { SuperstructureDocument } from "./superstructureTypes";
import { validateSuperstructureDocument } from "./superstructureValidation";
import { attachSuperstructureHandoffs } from "./superstructureDocumentDomain";

/** Serialize for persistence: remove transient derived arrays (keep fingerprint). */
export function serializeSuperstructureDocumentForPersistence(
  document: SuperstructureDocument,
): Record<string, unknown> {
  const { spanReferences: _span, supportReferences: _support, ...rest } = document;
  return {
    ...rest,
    spanReferences: null,
    supportReferences: null,
  } as unknown as Record<string, unknown>;
}

export type DeserializeResult =
  | { ok: true; document: SuperstructureDocument }
  | { ok: false; issues: readonly { path: string; message: string }[] };

/** Parse a persisted value into a SuperstructureDocument (fail-closed). */
export function deserializeSuperstructureDocumentFromPersistence(raw: unknown): DeserializeResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, issues: [{ path: "superstructureDocument", message: "not an object" }] };
  }
  const candidate = raw as SuperstructureDocument;
  if (candidate.schemaVersion !== "0.1.0") {
    return { ok: false, issues: [{ path: "superstructureDocument.schemaVersion", message: `unsupported schemaVersion ${candidate.schemaVersion}` }] };
  }
  const issues = validateSuperstructureDocument(candidate);
  if (issues.length > 0) {
    return { ok: false, issues };
  }
  return { ok: true, document: candidate };
}

/**
 * Regenerate the derived Handoff snapshots from Bridge Layout after restore and
 * attach them to the document. Fails-closed: if Bridge Layout is missing, the
 * document's derived fields stay null (the project is incomplete).
 */
export function regenerateSuperstructureDerived(
  manager: ProjectManager,
  projectId: string,
  document: SuperstructureDocument,
  now: string = new Date().toISOString(),
): SuperstructureDocument {
  const layout = readBridgeLayoutDocument(manager, projectId);
  if (!layout) {
    return document;
  }
  const spanResult = buildSpanHandoff(manager, projectId, layout);
  const supportResult = buildSupportHandoff(manager, projectId, layout);
  const spanReferences = spanResult.ok ? spanResult.handoff : null;
  const supportReferences = supportResult.ok ? supportResult.handoff : null;
  return attachSuperstructureHandoffs(document, spanReferences, supportReferences, now);
}
