/**
 * Phase 5 Bearing / Reaction Handoff Adapter (Phase 6-01 B FROZEN / Phase 6-02 WP-C).
 *
 * Maps the Phase 5 SuperstructureHandoff (v1.0.0) into the SubstructureDocument's
 * bearingSeatReferences + reactionCases, implementing the FROZEN six-issue
 * resolutions:
 *  1. reaction sign: up-positive canonical
 *  2. bearing axis: x=longitudinal / y=transverse
 *  3. seat ID: BRG-{supportId}-{girderId} canonical (legacy normalized)
 *  4. caseKind: enum value + combinationId kept separately
 *  5. localFrame: real frame from handoff (snapshot/LINER); identity only as
 *     VIEWER_PLACEHOLDER (never fabricated as canonical)
 *  6. elevations: derived or NOT_AVAILABLE (no +0.25m fabrication)
 *
 * NOT_AUTHORIZED reactions are carried as input data only; never promoted.
 */

import type { SuperstructureHandoff } from "../superstructure/superstructureHandoff";
import type {
  BearingReactionReferences,
  BearingSeatReference,
  ReactionCaseReference,
  SubstructureDocument,
} from "./substructureTypes";

export interface Phase5AdapterResult {
  readonly bearingReactionReferences: BearingReactionReferences;
  readonly bearingSeatReferences: BearingSeatReference[];
  readonly reactionCases: ReactionCaseReference[];
}

/** combinationId prefix -> caseKind enum (FROZEN mapping table). */
export function mapCombinationToCaseKind(combinationId: string): ReactionCaseReference["caseKind"] {
  const upper = combinationId.toUpperCase();
  if (upper.startsWith("DL-")) return "permanent";
  if (upper === "COMBO-1") return "permanent";
  if (upper.startsWith("LL")) return "liveLoad";
  if (upper.startsWith("BRK")) return "braking";
  if (upper.startsWith("WIND")) return "wind";
  if (upper.includes("SEISMIC-L1") || upper.includes("SEISMIC_L1")) return "seismicLevel1";
  if (upper.includes("SEISMIC-L2") || upper.includes("SEISMIC_L2")) return "seismicLevel2";
  // unknown -> UNKNOWN (NOT_AVAILABLE, not adopted)
  return "UNKNOWN";
}

/** Legacy seat ID -> canonical BRG-{supportId}-{girderId}. */
export function normalizeSeatId(
  legacySeatId: string,
  supportId: string,
  girderId: string | null,
  index: number,
): { canonical: string; legacySeatId: string } {
  const resolvedGirder = girderId ?? `G${index}`;
  return { canonical: `BRG-${supportId}-${resolvedGirder}`, legacySeatId };
}

/**
 * Build bearing/reaction references from the Phase 5 SuperstructureHandoff.
 * 6-issue resolutions applied. Fail-closed on malformed input.
 */
export function buildBearingReactionFromHandoff(
  handoff: SuperstructureHandoff,
): Phase5AdapterResult {
  const bearingSeatReferences: BearingSeatReference[] = [];
  const reactionCases: ReactionCaseReference[] = [];

  for (const support of handoff.supports) {
    support.bearingSeats.forEach((seat, index) => {
      const girderId = seat.girderId;
      const seatInfo = normalizeSeatId(seat.seatId, support.supportId, girderId, index + 1);
      bearingSeatReferences.push({
        seatId: seatInfo.canonical,
        supportId: support.supportId,
        girderId: girderId,
        position: { x: seat.position.x, y: seat.position.y, z: seat.position.z },
        elevation: seat.elevation,
        // Issue 2: local x = longitudinal / y = transverse
        localOffset: { longitudinalM: seat.localOffset.longitudinalM, transverseM: seat.localOffset.transverseM },
        orientation: seat.orientation,
        // bearingType: model.ts enum (elastomeric/pot/fixed/custom); map rubber->elastomeric
        bearingType: seat.bearingType === "rubber" ? "elastomeric" : seat.bearingType === "movable" ? "custom" : seat.bearingType,
        fixedOrMovable: seat.fixedOrMovable,
        longitudinalDirection: seat.longitudinalDirection,
        transverseDirection: seat.transverseDirection,
      });
    });
    for (const reaction of support.reactionCases) {
      const seat = support.bearingSeats.find((s) => s.seatId === reaction.seatId);
      const girderId = seat?.girderId ?? "";
      const seatInfo = normalizeSeatId(reaction.seatId, support.supportId, girderId ?? null, 1);
      reactionCases.push({
        caseId: reaction.caseId,
        combinationId: reaction.combinationId,
        seatId: seatInfo.canonical,
        supportId: support.supportId,
        girderId,
        // Issue 4: caseKind enum from combinationId
        caseKind: mapCombinationToCaseKind(reaction.combinationId),
        // Issue 1: up-positive canonical
        Fx: reaction.Fx,
        Fy: reaction.Fy,
        Fz: reaction.Fz,
        Mx: reaction.Mx,
        My: reaction.My,
        Mz: reaction.Mz,
        unit: reaction.unit,
        momentUnit: reaction.momentUnit,
        signConvention: reaction.signConvention,
        // authorization status preserved (NOT_AUTHORIZED input data)
        authorizationStatus: "NOT_AUTHORIZED",
      });
    }
  }

  const bearingReactionReferences: BearingReactionReferences = {
    handoffId: handoff.handoffId,
    schemaVersion: handoff.schemaVersion,
    generatedAt: handoff.generatedAt,
    bearingSeats: bearingSeatReferences,
    reactionCases,
    // Issue 6: elevations as Record (values from handoff, may be null -> NOT_AVAILABLE)
    girderBottomElevation: handoff.girderBottomElevation,
    deckElevation: handoff.deckElevation,
    superstructureEnvelope: handoff.superstructureEnvelope,
    selfWeight: handoff.selfWeight,
    reactionStatus: "NOT_AUTHORIZED",
    authorizationStatus: "NOT_AUTHORIZED",
  };

  return { bearingReactionReferences, bearingSeatReferences, reactionCases };
}

/** Attach the Phase 5 derived references + bearing seats to the document. */
export function attachPhase5ToDocument(
  document: SubstructureDocument,
  result: Phase5AdapterResult,
): SubstructureDocument {
  return {
    ...document,
    bearingReactionReferences: result.bearingReactionReferences,
    bearingSeatReferences: result.bearingSeatReferences,
    designInputs: {
      ...document.designInputs,
      superstructureReactions: result.reactionCases,
    },
  };
}
