/**
 * Reference Business 001 — Gujo Hachiman road alignment sample (Lane S / S-3).
 *
 * A preliminary mountain road crossing the Nagara river in the Gujo Hachiman
 * basin (EPSG:6674). The horizontal alignment is chained via the core geometry
 * engine so C0/C1 continuity holds without hand-computed coordinates; the
 * vertical profile follows a plausible basin profile; the bridge candidate
 * section (river crossing) is fixed by station range.
 *
 * This is SAMPLE / FIXTURE data only — it feeds the existing road engine
 * (RoadReferenceSample-compatible shape) and is validated by a targeted test.
 * Values follow the documented Gujo Hachiman baseline (EPSG:6674, bounds
 * X 83,996-89,050 / Y -29,697 to -24,665, elevation ~200-400 m basin floor).
 */
import type { LinearAlignment } from "../../core/types";
import type { VerticalElement } from "../../core/geometry/vertical";
import type { CrossSectionTemplateDraft } from "../../schema/types";
import { evaluateElementEndState, totalAlignmentLength } from "../../core/geometry/horizontal";

export const REF_BUSINESS_001_ROAD_ID = "RB001-ROAD-1";
export const REF_BUSINESS_001_ROAD_NAME = "郡上市八幡 山岳道路 (長良川横断)";
export const REF_BUSINESS_001_ROAD_MODEL_ID = "MODEL-RB001";

/** Road start point (EPSG:6674, basin west side). */
export const RB001_ORIGIN = { x: 85000.0, y: -26900.0 };
/** Starting azimuth (radians, east). */
export const RB001_ORIGIN_AZIMUTH = 0.0;

/**
 * Horizontal element specs. Element lengths sum to 2450 m.
 * The road heads east from the basin west side, curves gently (right turns),
 * then returns to a straight alignment on the basin east side.
 */
export const RB001_HORIZONTAL_SPECS = [
  { type: "straight", id: "S1", length: 900.0 },
  { type: "clothoid", id: "C1", length: 100.0, clothoidParameter: 150.0, startRadius: null, endRadius: 400.0, turn: "right" },
  { type: "arc", id: "A1", length: 250.0, radius: 400.0, turn: "right" },
  { type: "clothoid", id: "C2", length: 100.0, clothoidParameter: 150.0, startRadius: 400.0, endRadius: null, turn: "right" },
  { type: "straight", id: "S2", length: 1100.0 },
] as const;

export type Rb001ElementSpec = (typeof RB001_HORIZONTAL_SPECS)[number];

/** Bridge candidate section: station range crossing the Nagara river. */
export const RB001_BRIDGE_CANDIDATE = {
  startStation: 1200.0,
  endStation: 1500.0,
  nominalSpanM: 50.0,
  note: "長良川横断部 (S-4で支間割・橋梁形式を確定。実測DEMとの照合要)",
} as const;

/**
 * Build a continuous LinearAlignment for the sample by chaining element
 * end-states through the core geometry engine (mirrors the mountain-sample
 * buildChainedAlignment pattern, using core evaluateElementEndState).
 */
export function buildRb001HorizontalAlignment(): LinearAlignment {
  const elements: LinearAlignment["elements"] = [];
  let cursor = { ...RB001_ORIGIN };
  let azimuth = RB001_ORIGIN_AZIMUTH;

  for (const spec of RB001_HORIZONTAL_SPECS) {
    if (spec.type === "straight") {
      const element = { id: spec.id, type: "straight" as const, length: spec.length, start: cursor, azimuth };
      elements.push(element);
      const end = evaluateElementEndState(element);
      cursor = { ...end.point };
      azimuth = end.azimuth;
    } else if (spec.type === "arc") {
      const element = {
        id: spec.id,
        type: "arc" as const,
        length: spec.length,
        start: cursor,
        azimuth,
        radius: spec.radius,
        turn: spec.turn,
      };
      elements.push(element);
      const end = evaluateElementEndState(element);
      cursor = { ...end.point };
      azimuth = end.azimuth;
    } else {
      const element = {
        id: spec.id,
        type: "clothoid" as const,
        length: spec.length,
        start: cursor,
        azimuth,
        clothoidParameter: spec.clothoidParameter,
        startRadius: spec.startRadius,
        endRadius: spec.endRadius,
        turn: spec.turn,
      };
      elements.push(element);
      const end = evaluateElementEndState(element);
      cursor = { ...end.point };
      azimuth = end.azimuth;
    }
  }

  return {
    id: REF_BUSINESS_001_ROAD_ID,
    linerModelId: REF_BUSINESS_001_ROAD_MODEL_ID,
    coordinatePolicyId: "COORD-JGD2011",
    elements,
  };
}

/** Total alignment length (m). */
export function rb001AlignmentLength(): number {
  return totalAlignmentLength(buildRb001HorizontalAlignment());
}

/** Vertical profile: basin descent to the river, gentle climb on the east side. */
export function buildRb001Vertical(): VerticalElement[] {
  return [
    { type: "grade", id: "G1", startPhysicalDistance: 0, startElevation: 330.0, grade: -0.02, length: 1000 },
    { type: "parabolic", id: "P1", startPhysicalDistance: 1000, startElevation: 310.0, gradeIn: -0.02, gradeOut: 0.015, length: 200 },
    { type: "grade", id: "G2", startPhysicalDistance: 1200, startElevation: 309.0, grade: 0.015, length: 1250 },
  ];
}

/** Cross-section: 2-lane mountain road with shoulders (9.0 m total width). */
export function buildRb001CrossSection(): CrossSectionTemplateDraft {
  return {
    id: "XS-RB001",
    name: "郡上市八幡 標準断面 (2車線)",
    offsetLines: [
      { id: "L-shoulder", offset: -4.5, elevation: 0.1, role: "shoulder", label: "左路肩" },
      { id: "L-lane", offset: -3.0, elevation: 0, role: "lane", label: "左車線" },
      { id: "C", offset: 0, elevation: 0, role: "lane", label: "中心" },
      { id: "R-lane", offset: 3.0, elevation: 0, role: "lane", label: "右車線" },
      { id: "R-shoulder", offset: 4.5, elevation: 0.1, role: "shoulder", label: "右路肩" },
    ],
    crossSlope: { signConvention: "right_down_positive", valuePercent: 2 },
    station: 0,
  };
}

export interface Rb001RoadSample {
  readonly id: string;
  readonly name: string;
  readonly horizontal: LinearAlignment;
  readonly vertical: readonly VerticalElement[];
  readonly crossSections: readonly CrossSectionTemplateDraft[];
  readonly widthChangePoints: readonly { id: string; physicalDistance: number; leftOffset: number; rightOffset: number }[];
  readonly crossSlopeIntervals: readonly unknown[];
  readonly stationDefinition: { originDisplayedStation: number; equations: readonly { id: string; physicalDistance: number; type: "add_constant" | "reset_to_value"; value: number; sortIndex?: number }[] };
  readonly bridgeCandidate: typeof RB001_BRIDGE_CANDIDATE;
}

/** Assemble the full road alignment sample. */
export function buildReferenceBusiness001RoadSample(): Rb001RoadSample {
  return {
    id: REF_BUSINESS_001_ROAD_ID,
    name: REF_BUSINESS_001_ROAD_NAME,
    horizontal: buildRb001HorizontalAlignment(),
    vertical: buildRb001Vertical(),
    crossSections: [buildRb001CrossSection()],
    widthChangePoints: [
      { id: "W1", physicalDistance: 0, leftOffset: 4.5, rightOffset: 4.5 },
      { id: "W2", physicalDistance: 1200, leftOffset: 4.5, rightOffset: 4.5 },
      { id: "W3", physicalDistance: 2450, leftOffset: 4.5, rightOffset: 4.5 },
    ],
    crossSlopeIntervals: [
      { id: "CS1", startPhysicalDistance: 0, endPhysicalDistance: 2450, mode: "crown", leftSlopePercent: 2, rightSlopePercent: 2 },
    ],
    stationDefinition: { originDisplayedStation: 0, equations: [] },
    bridgeCandidate: RB001_BRIDGE_CANDIDATE,
  };
}