/**
 * Geometry Core — engine contracts (Phase 6-1A).
 *
 * Defines the Geometry Engine interface (Single Source of Bridge Geometry),
 * the Geometry Engine input contract (output of the Geometry Input Adapter) and
 * the Alignment Connector interface (adapter over LINER; never reimplements
 * alignment math).
 */

import type {
  CrossGirderSpec,
  DeckSpec,
  GeometrySnapshot,
  GridPanelSpec,
  LocalFrame3,
  Vec3,
} from "./types";

/**
 * Input contract for the Geometry Engine. Produced by the Geometry Input Adapter
 * from the frozen Common Bridge Data Model. Contains NO computed coordinates —
 * the adapter performs no geometry calculation. Resolution states are carried.
 */
export type GeometryEngineInput = {
  sourceModelVersion: string;
  bridgeId: string;
  alignmentIds: string[];
  supports: { id: string; stationM?: number; skewRad?: number; state: string }[];
  girders: { id: string; offsetM?: number; state: string }[];
  gridPointIds: string[];
  deckIds: string[];
  sectionIds: string[];
  /** Declared span lengths (m) and bridge length (m); used for placement. */
  spanLengthsM?: number[];
  bridgeLengthM?: number;
  /** Declared girder line offsets (m). `{id}` start offset, `{id}:end` end offset. */
  girderOffsetsM?: Record<string, number>;
  /** Panel structure per girder line (Phase 6-2); enables full grid generation. */
  gridPanelSpecs?: GridPanelSpec[];
  /** Deck reference dimensions (Phase 6-2). */
  deckSpecs?: DeckSpec[];
  /** Cross girder placement (Phase 6-2). */
  crossGirderSpecs?: CrossGirderSpec[];
  /** HCR / conflict / HOLD / NOT_AVAILABLE propagated from the model. */
  unresolved: UnresolvedSummary[];
};

export type UnresolvedSummary = {
  id: string;
  kind: "HCR" | "CONFLICT" | "HOLD" | "NOT_AVAILABLE";
  affectedEntityIds: string[];
};

/** A single alignment sample from the Alignment Connector (LINER authority). */
export type AlignmentPointSample = {
  position: Vec3;
  azimuthRad: number;
  curvature: number;
  /** Present only when the LINER source exposes a vertical grade. */
  grade?: number;
  /** Present only when the LINER source exposes a crossfall value. */
  crossfallPercent?: number;
  tangent: Vec3;
  transverse: Vec3;
  vertical: Vec3;
  sourceStation: number;
  sourceOffset: number;
  localFrame: LocalFrame3;
};

/**
 * Alignment Connector — adapter over LINER road-alignment output.
 * The connector maps bridge-side station/offset requests to LINER evaluation and
 * carries LINER-provided XYZ / azimuth / frames / grade / crossfall into the
 * bridge contract. It never reimplements station->XY, clothoid, arc or vertical
 * math (Single Source of Alignment = LINER).
 */
export interface AlignmentConnector {
  /** Sample a point at station/offset; offset right-positive. */
  samplePoint(request: {
    alignmentId: string;
    stationM: number;
    offsetM: number;
  }): AlignmentPointSample;
  /** Sample a cross-section line at station for a set of offsets. */
  sampleSection(request: {
    alignmentId: string;
    stationM: number;
    offsetsM: number[];
  }): AlignmentPointSample[];
}

/** Geometry Input Adapter — Common Bridge Data Model -> GeometryEngineInput. */
export interface GeometryInputAdapter {
  adapt(commonModel: unknown): GeometryEngineInput;
}

/** Geometry Engine — Single Source of Bridge Geometry. */
export interface GeometryEngine {
  generateSnapshot(input: GeometryEngineInput): GeometrySnapshot;
}
