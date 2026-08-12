/**
 * Superstructure load model (Phase 5-01 D-01 FROZEN / Phase 5-02 WP-E).
 *
 * Dead-load model with an explicit partition (no double counting):
 *  - DL-STRUCTURAL = steel main girders (structuralGirder) + secondary
 *    members (structuralSecondary: cross beams / frames / bearings)
 *  - DL-DECK = RC deck self-weight
 *  - DL-PAVEMENT / DL-APPURTENANCE = input boundary (MISSING, not implemented)
 *  - LL = input boundary (liveLoadReference stays null)
 *
 * Values are never invented: declared girder section / deck thickness drive the
 * DERIVED loads; otherwise the entry stays MISSING (fail-closed).
 */

import type { DeadLoads, LoadModel, SuperstructureDocument } from "./superstructureTypes";
import { computeSuperstructureSectionProperties } from "./superstructureComponents";

/** Steel unit weight (kN/m^3) used to derive girder self-weight from area. */
export const STEEL_UNIT_WEIGHT_KN_M3 = 77.0;

/** Bridge length (m) from the derived Span Handoff (sum of spans). */
export function bridgeLengthMFromSpans(document: SuperstructureDocument): number | null {
  const spans = document.spanReferences?.spans;
  if (!spans || spans.length === 0) return null;
  const total = spans.reduce((sum, s) => sum + s.spanLength, 0);
  return Number.isFinite(total) && total > 0 ? total : null;
}

/** Build the dead-load model from the SuperstructureDocument (fail-closed). */
export function buildDeadLoads(document: SuperstructureDocument): DeadLoads {
  const lengthM = bridgeLengthMFromSpans(document);
  const section = document.girderConfiguration.girderSectionModel;
  const girderCount = document.girderConfiguration.girderCount;

  // DL-STRUCTURAL part 1: steel main girders
  let structuralGirder: DeadLoads["structuralGirder"] = { state: "MISSING", valueKN: null };
  if (lengthM !== null && girderCount >= 1) {
    const perM = section.unitWeightPerM;
    if (perM !== null && Number.isFinite(perM) && perM > 0) {
      structuralGirder = { state: "CONFIRMED", valueKN: perM * lengthM * girderCount };
    } else {
      const props = computeSuperstructureSectionProperties(section, lengthM);
      if (props !== null) {
        const unitWeightPerM = props.totalArea * STEEL_UNIT_WEIGHT_KN_M3;
        structuralGirder = { state: "DERIVED", valueKN: unitWeightPerM * lengthM * girderCount };
      }
    }
  }

  // DL-STRUCTURAL part 2: secondary members (cross beams / frames / bearings).
  // Member dimensions are DEFER in Phase 5-02 -> never invented -> MISSING.
  const structuralSecondary: DeadLoads["structuralSecondary"] = { state: "MISSING", valueKN: null };

  // DL-DECK: RC deck self-weight
  const deck = document.deckConfiguration;
  let deckLoad: DeadLoads["deck"] = { state: "MISSING", valueKN: null };
  if (
    deck.thicknessM !== null
    && deck.unitWeight !== null
    && deck.resolvedWidthM !== null
    && lengthM !== null
    && Number.isFinite(deck.thicknessM)
    && Number.isFinite(deck.unitWeight)
    && Number.isFinite(deck.resolvedWidthM)
  ) {
    deckLoad = { state: "DERIVED", valueKN: deck.thicknessM * deck.unitWeight * deck.resolvedWidthM * lengthM };
  }

  // DL-PAVEMENT / DL-APPURTENANCE / LL: input boundary -> MISSING / null
  return {
    structuralGirder,
    structuralSecondary,
    deck: deckLoad,
    pavement: { state: "MISSING", valueKN: null },
    appurtenances: { state: "MISSING", valueKN: null },
  };
}

/** Build the LoadModel container for the SuperstructureDocument. */
export function buildLoadModel(document: SuperstructureDocument): LoadModel {
  return {
    deadLoads: buildDeadLoads(document),
    liveLoadReference: null,
  };
}

/** COMBO-1 total (DL-STRUCTURAL + DL-DECK) with factor 1.0. */
export function comboOneTotalKN(deadLoads: DeadLoads): number | null {
  const values: number[] = [];
  if (deadLoads.structuralGirder.valueKN !== null) values.push(deadLoads.structuralGirder.valueKN);
  if (deadLoads.structuralSecondary.valueKN !== null) values.push(deadLoads.structuralSecondary.valueKN);
  if (deadLoads.deck.valueKN !== null) values.push(deadLoads.deck.valueKN);
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0);
}
