/**
 * Substructure placement / local frame / bearing seat (Phase 6-01 D FROZEN / Phase 6-02 WP-D).
 *
 * Uses the existing SupportPlacementEngine (LINER authority, KEEP) to compute
 * real placement snapshots (positions + local frames) for the Phase 4-derived
 * supports, and attaches the Phase 5-derived bearing seats.
 *
 * Rules:
 *  - placement comes from LINER (single authority); no re-computation into a
 *    second source of truth
 *  - skew is applied once by the engine (base tangent frame -> skewed support frame)
 *  - identity local frames are never fabricated as canonical
 */

import { computeAllPlacements } from "../../../substructure/SupportPlacementEngine";
import type { Coordinate3dInput } from "../../../liner/core/coordinate3d";
import type { Support, SupportPlacementSnapshot } from "../../../substructure/model";
import type { BearingSeatReference, SubstructureDocument, SubstructureSupport } from "./substructureTypes";

export interface PlacementResult {
  readonly ok: boolean;
  readonly diagnostics: readonly string[];
  readonly supports: SubstructureSupport[];
  /** placement supports with real snapshots (for the existing engine/3D). */
  readonly placementSupports: Support[];
}

export type PlaceSupportError = { ok: false; diagnostics: readonly string[] };

/**
 * Compute real placement snapshots + build the document supports with bearing
 * seats attached. Fail-closed: LINER FATAL -> returns ok=false.
 */
export function buildSubstructurePlacement(
  document: SubstructureDocument,
  coordinateInput: Coordinate3dInput,
): PlacementResult | PlaceSupportError {
  // Start from the Phase 4-derived supports (placement source liner).
  const baseSupports: Support[] = document.supports.map((s) => ({
    supportId: s.supportId,
    supportType: s.supportType,
    placement: { ...s.placement },
    skewRad: s.skewRad,
    bearingSeats: [...s.bearingSeats],
    pier: s.pier,
    abutment: s.abutment,
  }));

  const placed = computeAllPlacements(baseSupports, coordinateInput);
  if (placed.fatalCount > 0) {
    return { ok: false, diagnostics: placed.results.flatMap((r) => r.diagnostics).map((d) => d.message) };
  }

  // Build placement snapshot map (results align with baseSupports by index).
  const snapshotBySupport = new Map<string, SupportPlacementSnapshot>();
  baseSupports.forEach((sup, i) => snapshotBySupport.set(sup.supportId, placed.results[i].snapshot));

  // Attach Phase 5 bearing seats (BRG-{support}-{girder}) to each support.
  const seatBySupport = new Map<string, BearingSeatReference[]>();
  for (const seat of document.bearingSeatReferences) {
    const list = seatBySupport.get(seat.supportId) ?? [];
    list.push(seat);
    seatBySupport.set(seat.supportId, list);
  }

  const supports: SubstructureSupport[] = document.supports.map((s) => {
    const snapshot = snapshotBySupport.get(s.supportId);
    const seats = (seatBySupport.get(s.supportId) ?? []).map((seat) => ({
      seatId: seat.seatId,
      position: { x: seat.position.x, y: seat.position.y, z: seat.position.z },
      dimensions: { w: 0.4, d: 0.4, h: 0.1 },
      bearing: { id: `${seat.seatId}-BEARING`, height: 0.1, type: seat.bearingType ?? "elastomeric" },
    }));
    return {
      ...s,
      // real local frame from LINER (skew applied by engine once)
      placementSnapshot: snapshot,
      bearingSeats: seats,
    };
  });

  const placementSupports: Support[] = supports.map((s) => ({
    supportId: s.supportId,
    supportType: s.supportType,
    placement: { ...s.placement },
    skewRad: s.skewRad,
    placementSnapshot: s.placementSnapshot,
    bearingSeats: s.bearingSeats,
    pier: s.pier,
    abutment: s.abutment,
  }));

  return { ok: true, diagnostics: [], supports, placementSupports };
}

/** Update the document with placement snapshots + bearing seats. */
export function applySubstructurePlacement(
  document: SubstructureDocument,
  placement: PlacementResult,
): SubstructureDocument {
  return {
    ...document,
    supports: placement.supports,
    geometryReference: {
      ...document.geometryReference,
      generatedAt: new Date().toISOString(),
    },
  };
}
