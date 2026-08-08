/**
 * Deck reference / boundary (Phase 6-2).
 *
 * Builds the deck reference line + plan boundary from declared (golden-derived)
 * deck dimensions (width G-GEO-0017, thickness G-GEO-0018). The boundary is a
 * rectangle spanning the bridge length at the deck edge offsets, sampled from
 * the Alignment Connector (LINER authority) — no road-alignment math here.
 *
 * Declared assumption: the deck is centred on the alignment centerline unless an
 * explicit edgeOffsetM is provided (RB-001 total width 8.01 m -> +/- 4.005 m).
 */

import { type AlignmentConnector } from "./contracts";
import type { DeckReference, DeckSpec, Vec3 } from "./types";

/** Default: deck centred on the alignment. */
export function deckEdgeOffsetsFromWidth(widthM: number): { left: number; right: number } {
  const half = widthM / 2;
  return { left: -half, right: half };
}

/**
 * Plan boundary corners: start-left, start-right, end-right, end-left
 * (stationStart/stationEnd x edge offsets), sampled from the Alignment Connector.
 */
export function buildDeckBoundary(
  stationStartM: number,
  stationEndM: number,
  edgeOffsetM: { left: number; right: number },
  connector: AlignmentConnector,
  alignmentId: string,
): Vec3[] {
  const corners: Array<[number, number]> = [
    [stationStartM, edgeOffsetM.left],
    [stationStartM, edgeOffsetM.right],
    [stationEndM, edgeOffsetM.right],
    [stationEndM, edgeOffsetM.left],
  ];
  return corners.map(([stationM, offsetM]) =>
    connector.samplePoint({ alignmentId, stationM, offsetM }).position,
  );
}

export type DeckReferenceRequest = {
  spec: DeckSpec;
  stationStartM: number;
  stationEndM: number;
  alignmentId: string;
};

/** Build one deck reference. */
export function buildDeckReference(
  request: DeckReferenceRequest,
  connector: AlignmentConnector,
): DeckReference {
  const { spec } = request;
  const edgeOffsetM = spec.edgeOffsetM ?? deckEdgeOffsetsFromWidth(spec.widthM);
  const boundary = buildDeckBoundary(
    request.stationStartM,
    request.stationEndM,
    edgeOffsetM,
    connector,
    request.alignmentId,
  );
  return {
    id: `DECK-REF-${spec.deckId}`,
    deckId: spec.deckId,
    widthM: { state: "CONFIRMED", value: spec.widthM, unit: "m" },
    thicknessM: { state: "CONFIRMED", value: spec.thicknessM, unit: "m" },
    edgeOffsetM,
    ...(spec.elevationM !== undefined
      ? { elevationM: { state: "CONFIRMED" as const, value: spec.elevationM, unit: "m" } }
      : {}),
    boundary,
  };
}

/** Reference Bridge 001 deck spec (G-GEO-0017 width 8.01, G-GEO-0018 thickness 0.23). */
export const RB001_DECK_SPEC: DeckSpec = {
  deckId: "DECK-01",
  widthM: 8.01,
  thicknessM: 0.23,
  elevationM: 10.0, // G-GEO-0032 deck elevation DL
};
