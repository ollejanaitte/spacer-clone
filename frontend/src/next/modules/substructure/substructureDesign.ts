/**
 * Substructure design framework (Phase 6-01 D FROZEN / Phase 6-02 WP-H).
 *
 * Reuses the existing KEEP assets (computeProjectQuantity / runDesign) to
 * produce quantity results and design status. All structural checks stay
 * HOLD_NOT_AVAILABLE / NOT_AUTHORIZED; NOT_AUTHORIZED reactions are never
 * promoted to PASS/FAIL. DEFER assets are not implemented here.
 */

import { computeProjectQuantity, computeSupportQuantity } from "../../../substructure/design/geometricQuantity";
import { runDesign } from "../../../substructure/design/designEngine";
import type { Support } from "../../../substructure/model";
import type { SubstructureDocument, QuantityResults, DesignResults, DesignInputs } from "./substructureTypes";

/** Compute project quantity (overall) via KEEP geometricQuantity. */
export function computeSubstructureQuantity(document: SubstructureDocument): QuantityResults {
  const supports = toModelSupports(document);
  if (supports.length === 0) {
    return { quantityStatus: "NOT_AVAILABLE", totalConcreteVolumeM3: null, totalPileLengthM: null, units: "m³ / m" };
  }
  const q = computeProjectQuantity(supports);
  return {
    quantityStatus: "DERIVED",
    totalConcreteVolumeM3: q.totalConcreteVolume,
    totalPileLengthM: q.totalPileLength,
    units: q.units,
  };
}

/** Compute per-support quantity (KEEP). */
export function computeSupportQuantityFor(document: SubstructureDocument, supportId: string): QuantityResults | null {
  const support = document.supports.find((s) => s.supportId === supportId);
  if (!support) return null;
  const model = toModelSupports({
    ...document,
    supports: [support],
  } as SubstructureDocument)[0];
  const q = computeSupportQuantity(model);
  return {
    quantityStatus: "DERIVED",
    totalConcreteVolumeM3: q.totalConcreteVolume,
    totalPileLengthM: q.totalPileLength,
    units: "m³ / m",
  };
}

/** Run the design framework (KEEP runDesign). Structural checks stay HOLD/NOT_AUTHORIZED. */
export function runSubstructureDesign(document: SubstructureDocument): DesignResults {
  const supports = toModelSupports(document);
  const results = supports.map((support) => runDesign({ projectId: document.projectId, support, reactions: null }));
  const anyFatal = results.some((r) => r.status === "hold_not_available");
  return {
    designStatus: anyFatal ? "NOT_AUTHORIZED" : "NOT_AUTHORIZED",
    checks: results.map((r, i) => ({
      checkId: `SUPPORT-${supports[i].supportId}`,
      status: r.status,
      message: `geometric quantity: concrete ${r.geometric.totalConcreteVolume.toFixed(2)} m³`,
    })),
    reactionStatus: "NOT_AVAILABLE",
  };
}

/** Convert document supports to model Support[] (for KEEP engines). */
export function toModelSupports(document: SubstructureDocument): Support[] {
  return document.supports.map((s) => ({
    supportId: s.supportId,
    supportType: s.supportType,
    placement: { ...s.placement },
    skewRad: s.skewRad,
    placementSnapshot: s.placementSnapshot,
    bearingSeats: s.bearingSeats,
    pier: s.pier,
    abutment: s.abutment,
  }));
}

/** Attach design/quantity results to the document (NOT_AUTHORIZED preserved). */
export function applySubstructureDesign(
  document: SubstructureDocument,
  quantity: QuantityResults,
  design: DesignResults,
): SubstructureDocument {
  return {
    ...document,
    quantityResults: quantity,
    designResults: design,
  };
}

/** Build design inputs (reactions as NOT_AUTHORIZED input data only). */
export function buildDesignInputs(document: SubstructureDocument): DesignInputs {
  return {
    superstructureReactions: document.designInputs.superstructureReactions,
  };
}
