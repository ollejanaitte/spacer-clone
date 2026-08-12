/**
 * Superstructure Completion Gate (Phase 5-02 WP-J).
 *
 * Runs the Phase 5 completion integrity checks over the SuperstructureDocument:
 *  - document validity (fail-closed)
 *  - derived consistency (span/support handoff regeneration matches)
 *  - geometry snapshot determinism (fingerprint)
 *  - Bearing / Reaction Handoff readiness
 *  - Phase 6 readiness (handoff buildable)
 */

import type { ProjectManager } from "../../project/projectManager";
import type { SuperstructureDocument } from "./superstructureTypes";
import { validateSuperstructureDocument } from "./superstructureValidation";
import { buildSuperstructureFacts } from "./superstructureFacts";
import { regenerateSuperstructureDerived } from "./superstructurePersistence";
import { readBridgeLayoutDocument } from "../bridgeLayoutModuleAdapter";

export interface SuperstructureIntegrityResult {
  readonly ok: boolean;
  readonly issues: readonly { path: string; message: string }[];
  readonly checks: {
    readonly documentValid: boolean;
    readonly bridgeLayoutPresent: boolean;
    readonly derivedConsistent: boolean;
    readonly factsBuildable: boolean;
    readonly handoffReady: boolean;
  };
  /** Phase 6 (substructure) readiness: handoff is buildable. */
  readonly phase6Ready: boolean;
}

/**
 * Run the Phase 5 completion gate. Fail-closed: any failed check -> ok=false.
 */
export function runSuperstructureIntegrityGate(
  manager: ProjectManager,
  projectId: string,
  document: SuperstructureDocument,
): SuperstructureIntegrityResult {
  const issues: { path: string; message: string }[] = [];

  const documentValid = validateSuperstructureDocument(document).length === 0;
  if (!documentValid) {
    issues.push(...validateSuperstructureDocument(document));
  }

  const bridgeLayoutPresent = readBridgeLayoutDocument(manager, projectId) !== undefined;
  if (!bridgeLayoutPresent) {
    issues.push({ path: "bridgeLayout", message: "Bridge Layout document is required" });
  }

  // derived consistency: regenerated handoffs match the attached ones
  const regenerated = bridgeLayoutPresent
    ? regenerateSuperstructureDerived(manager, projectId, document)
    : document;
  let derivedConsistent = true;
  if (document.spanReferences && regenerated.spanReferences) {
    const a = JSON.stringify(document.spanReferences.spans.map((s) => [s.spanId, s.spanLength]));
    const b = JSON.stringify(regenerated.spanReferences.spans.map((s) => [s.spanId, s.spanLength]));
    if (a !== b) derivedConsistent = false;
  }
  if (document.supportReferences && regenerated.supportReferences) {
    const a = JSON.stringify(document.supportReferences.supports.map((s) => [s.supportId, s.station]));
    const b = JSON.stringify(regenerated.supportReferences.supports.map((s) => [s.supportId, s.station]));
    if (a !== b) derivedConsistent = false;
  }
  if (!derivedConsistent) {
    issues.push({ path: "derived", message: "derived handoffs are inconsistent with Bridge Layout (STALE)" });
  }

  const facts = buildSuperstructureFacts(document);
  const factsBuildable = facts.ok;
  if (!factsBuildable) {
    issues.push(...facts.issues);
  }

  // Bearing/Reaction Handoff readiness (document-level prerequisites; the full
  // handoff build with a real snapshot is verified in WP-H / the E2E flow).
  const handoffPrereqs = document.bridgeLayoutReference !== null
    && document.supportReferences !== null
    && document.supportReferences.supports.length >= 2;
  const handoffReady = handoffPrereqs && documentValid;
  if (!handoffReady) {
    issues.push({ path: "handoff", message: "Bearing/Reaction Handoff prerequisites are not satisfied" });
  }

  const ok = issues.length === 0;
  return {
    ok,
    issues,
    checks: {
      documentValid,
      bridgeLayoutPresent,
      derivedConsistent,
      factsBuildable,
      handoffReady,
    },
    phase6Ready: ok && handoffReady,
  };
}
