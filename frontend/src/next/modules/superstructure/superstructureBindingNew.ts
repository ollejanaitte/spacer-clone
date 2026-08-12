/**
 * Superstructure geometry binding (Phase 5-01 B-01 FROZEN / Phase 5-02 WP-B).
 *
 * Produces a fully numeric `GeometryEngineInput` from the SuperstructureDocument
 * (canonical) + derived Handoffs. Fail-closed (throws `BridgeProjectAdapterError`
 * like the existing binding layer) with the SAME invariants as the old
 * `buildBoundGeometryInput`:
 *  - Bridge Layout set
 *  - supports present / all stations declared
 *  - bridge length declared
 *  - spans == supports - 1
 *  - girder offsets present (never invented)
 */

import { BridgeProjectAdapterError } from "../../../bridgeProject/validation";
import type { GeometryEngineInput } from "../../../apollo/geometry/contracts";
import type { CrossGirderSpec, DeckSpec } from "../../../apollo/geometry/types";
import type { SuperstructureDocument } from "./superstructureTypes";

const SUPER_MISSING_BRIDGE_LAYOUT = "SUPER_BINDING_MISSING_BRIDGE_LAYOUT";
const SUPER_MISSING_SUPPORT = "SUPER_BINDING_MISSING_SUPPORT";
const SUPER_MISSING_STATION = "SUPER_BINDING_MISSING_STATION";
const SUPER_MISSING_BRIDGE_LENGTH = "SUPER_BINDING_MISSING_BRIDGE_LENGTH";
const SUPER_MISSING_SPAN = "SUPER_BINDING_MISSING_SPAN";
const SUPER_MISSING_GIRDER = "SUPER_BINDING_MISSING_GIRDER";

export const SUPER_BINDING_CODES = {
  MISSING_BRIDGE_LAYOUT: SUPER_MISSING_BRIDGE_LAYOUT,
  MISSING_SUPPORT: SUPER_MISSING_SUPPORT,
  MISSING_STATION: SUPER_MISSING_STATION,
  MISSING_BRIDGE_LENGTH: SUPER_MISSING_BRIDGE_LENGTH,
  MISSING_SPAN: SUPER_MISSING_SPAN,
  MISSING_GIRDER: SUPER_MISSING_GIRDER,
} as const;

export interface SuperstructureGeometryInputOptions {
  readonly crossGirderSpecs?: readonly CrossGirderSpec[];
  readonly deckSpecs?: readonly DeckSpec[];
}

/**
 * Build a numeric GeometryEngineInput from the SuperstructureDocument.
 * Fail-closed: throws BridgeProjectAdapterError on missing required facts.
 */
export function buildSuperstructureGeometryInput(
  document: SuperstructureDocument,
  options: SuperstructureGeometryInputOptions = {},
): GeometryEngineInput {
  if (!document.bridgeLayoutReference || !document.bridgeLayoutReference.bridgeId) {
    throw new BridgeProjectAdapterError(
      SUPER_MISSING_BRIDGE_LAYOUT,
      "Superstructure binding requires a Bridge Layout reference; Bridge Layout must be set.",
    );
  }
  const supports = document.supportReferences?.supports;
  if (!supports || supports.length === 0) {
    throw new BridgeProjectAdapterError(
      SUPER_MISSING_SUPPORT,
      "Superstructure binding requires at least one support (Support Handoff derived).",
    );
  }
  const hasAnyStation = supports.some((s) => Number.isFinite(s.station));
  const hasAllStations = supports.every((s) => Number.isFinite(s.station));
  if (!hasAllStations) {
    throw new BridgeProjectAdapterError(
      SUPER_MISSING_STATION,
      hasAnyStation
        ? "Superstructure binding requires a station on EVERY support (mixed presence is not allowed)."
        : "Superstructure binding requires declared support stations; Support Handoff carries none.",
    );
  }

  const spans = document.spanReferences?.spans ?? [];
  const spanLengthsM = spans
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((s) => s.spanLength);
  const bridgeLengthFromStations = supports.length > 0
    ? supports[supports.length - 1].station - supports[0].station
    : undefined;
  const bridgeLengthFromSpans = spanLengthsM.length > 0
    ? spanLengthsM.reduce((sum, len) => sum + len, 0)
    : undefined;
  const bridgeLengthM = bridgeLengthFromSpans ?? bridgeLengthFromStations;
  if (bridgeLengthM === undefined || !Number.isFinite(bridgeLengthM)) {
    throw new BridgeProjectAdapterError(
      SUPER_MISSING_BRIDGE_LENGTH,
      "Superstructure binding requires a numeric bridge length from the Span/Support Handoff.",
    );
  }
  if (spanLengthsM.length !== supports.length - 1) {
    throw new BridgeProjectAdapterError(
      SUPER_MISSING_SPAN,
      `Superstructure binding requires spans == supports - 1 (got ${spanLengthsM.length} spans for ${supports.length} supports).`,
    );
  }

  const girderOffsetsM: Record<string, number> = {};
  const girders = document.girderConfiguration.girderLines.map((line) => {
    if (!Number.isFinite(line.offsetFromCenterline)) {
      throw new BridgeProjectAdapterError(
        SUPER_MISSING_GIRDER,
        `Superstructure binding requires a finite girder offset for ${line.girderId}; offsets are not invented.`,
      );
    }
    girderOffsetsM[line.girderId] = line.offsetFromCenterline;
    return { id: line.girderId, offsetM: line.offsetFromCenterline, state: "CONFIRMED" };
  });
  if (girders.length === 0) {
    throw new BridgeProjectAdapterError(
      SUPER_MISSING_GIRDER,
      "Superstructure binding requires at least one girder with an offset (superstructure-owned input).",
    );
  }

  const deckSpecs: DeckSpec[] | undefined = options.deckSpecs
    ? [...options.deckSpecs]
    : document.deckConfiguration.resolvedWidthM !== null
      ? [{
          deckId: document.deckConfiguration.deckId,
          widthM: document.deckConfiguration.resolvedWidthM,
          ...(document.deckConfiguration.thicknessM !== null ? { thicknessM: document.deckConfiguration.thicknessM } : {}),
          ...(document.deckConfiguration.overhangLeftM !== null || document.deckConfiguration.overhangRightM !== null
            ? { edgeOffsetM: {
                left: document.deckConfiguration.overhangLeftM ?? 0,
                right: document.deckConfiguration.overhangRightM ?? 0,
              } }
            : {}),
        }]
      : undefined;

  return {
    sourceModelVersion: document.schemaVersion,
    bridgeId: document.bridgeLayoutReference.bridgeId,
    alignmentIds: document.roadReference?.alignmentId ? [document.roadReference.alignmentId] : [],
    supports: supports.map((s) => ({
      id: s.supportId,
      stationM: s.station,
      ...(s.skewAngleRad !== null && Number.isFinite(s.skewAngleRad) ? { skewRad: s.skewAngleRad } : {}),
      state: "CONFIRMED",
    })),
    girders,
    girderOffsetsM,
    gridPointIds: [],
    deckIds: document.deckConfiguration.resolvedWidthM !== null ? [document.deckConfiguration.deckId] : [],
    sectionIds: [],
    spanLengthsM,
    bridgeLengthM,
    deckSpecs,
    crossGirderSpecs: options.crossGirderSpecs as CrossGirderSpec[] | undefined,
    unresolved: [],
  };
}
