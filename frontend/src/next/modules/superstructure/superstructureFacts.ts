/**
 * Superstructure facts adapter (Phase 5-01 B-01 FROZEN / Phase 5-02 WP-B).
 *
 * Extracts the superstructure SHARED facts from the SuperstructureDocument
 * (canonical) + derived Handoffs. Never invents values: MISSING is preserved.
 * The output feeds the geometry binding and downstream consumers.
 */

import type { SpanHandoffItem, SuperstructureDocument } from "./superstructureTypes";

export interface SuperstructureFacts {
  readonly bridgeId: string;
  readonly superstructureType: string;
  readonly spanSystem: "simple" | "continuous";
  readonly bridgeSystem: "SIMPLE_SINGLE" | "CONTINUOUS";
  readonly supports: readonly {
    readonly supportId: string;
    readonly station: number;
    readonly skewAngleRad: number | null;
  }[];
  readonly spans: readonly SpanHandoffItem[];
  readonly girderArrangement: readonly { girderId: string; offsetM: number }[];
  readonly deckFacts: { deckId: string; widthM: number | null; thicknessM: number | null } | null;
  readonly bearingSupportRelation: readonly { supportId: string; girderId: string }[];
}

export type SuperstructureFactsResult =
  | { ok: true; facts: SuperstructureFacts }
  | { ok: false; issues: readonly { path: string; message: string }[] };

/** Extract shared superstructure facts (fail-closed: Bridge Layout must be set). */
export function buildSuperstructureFacts(document: SuperstructureDocument): SuperstructureFactsResult {
  const issues: { path: string; message: string }[] = [];

  if (!document.bridgeLayoutReference || !document.bridgeLayoutReference.bridgeId) {
    issues.push({ path: "bridgeLayoutReference", message: "bridgeLayoutReference is required" });
  }
  if (!document.supportReferences || document.supportReferences.supports.length === 0) {
    issues.push({ path: "supportReferences", message: "supportReferences (derived) are required" });
  }
  if (!document.spanReferences || document.spanReferences.spans.length === 0) {
    issues.push({ path: "spanReferences", message: "spanReferences (derived) are required" });
  }
  if (document.girderConfiguration.girderLines.length === 0) {
    issues.push({ path: "girderConfiguration", message: "girder lines are required (offsets are not invented)" });
  }
  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const supports = (document.supportReferences?.supports ?? []).map((s) => ({
    supportId: s.supportId,
    station: s.station,
    skewAngleRad: s.skewAngleRad,
  }));
  const spans = document.spanReferences?.spans ?? [];
  const girderArrangement = document.girderConfiguration.girderLines.map((l) => ({
    girderId: l.girderId,
    offsetM: l.offsetFromCenterline,
  }));
  const deck = document.deckConfiguration.resolvedWidthM !== null
    ? {
        deckId: document.deckConfiguration.deckId,
        widthM: document.deckConfiguration.resolvedWidthM,
        thicknessM: document.deckConfiguration.thicknessM,
      }
    : null;

  return {
    ok: true,
    facts: {
      bridgeId: document.bridgeLayoutReference!.bridgeId,
      superstructureType: document.superstructureType,
      spanSystem: document.structuralSystem.spanSystem,
      bridgeSystem: document.structuralSystem.bridgeSystem,
      supports,
      spans,
      girderArrangement,
      deckFacts: deck,
      bearingSupportRelation: document.bearingConfiguration.bearingSupportRelation,
    },
  };
}
