/**
 * Mountain Viaduct 500 — vertical profile / crossfall / cross section fixture
 * (MOUNTAIN-SAMPLE P03).
 *
 * Vertical: a mountain profile with a steep climb, crest, steep descent, sag,
 * and a second climb — the 400 m bridge section crosses a valley so pier
 * heights vary clearly.
 *
 * Crossfall: crown -> transition -> superelevation -> transition -> crown ->
 * transition -> opposite superelevation, linked to the horizontal curvature.
 *
 * All values flow through the existing vertical / crossfall solvers; Z is
 * never hand-adjusted in the 3D layer.
 */
import type { BuildIntermediateInput } from "../../core/pipeline/pipeline";
import type { VerticalAlignmentDraft } from "../../schema/types";
import type { CrossSlopeIntervalDraft } from "../../schema/types";

/** Mountain profile: grade elements + parabolic crest/sag. */
export function buildMountainVerticalProfile(): VerticalAlignmentDraft {
  return {
    id: "VA-mountain-viaduct-500",
    elements: [
      // 0–80: steep climb +6%
      { type: "grade", id: "VG-1", startStation: 0, endStation: 80, startElevation: 40, grade: 0.06, length: 80 },
      // 80–200: crest transition (parabolic) +6% -> -5%
      { type: "parabolic", id: "VP-1", startStation: 80, endStation: 200, startGrade: 0.06, endGrade: -0.05, startElevation: 44.8, length: 120, curveType: "crest" },
      // 200–360: steep descent -5% (bridge over valley)
      { type: "grade", id: "VG-2", startStation: 200, endStation: 360, startElevation: 41.8, grade: -0.05, length: 160 },
      // 360–440: sag transition (parabolic) -5% -> +4%
      { type: "parabolic", id: "VP-2", startStation: 360, endStation: 440, startGrade: -0.05, endGrade: 0.04, startElevation: 33.8, length: 80, curveType: "sag" },
      // 440–500: final climb +4%
      { type: "grade", id: "VG-3", startStation: 440, endStation: 500, startElevation: 37.8, grade: 0.04, length: 60 },
    ],
  };
}

export type MountainCrossfallZone = "crown" | "superelevation-right" | "crown2" | "superelevation-left";

export interface MountainCrossfallZoneSpec {
  id: string;
  start: number;
  end: number;
  mode: CrossSlopeIntervalDraft["mode"];
  leftSlopePercent: number;
  rightSlopePercent: number;
}

/** Crown -> right superelevation -> crown -> left superelevation sequence. */
export const MOUNTAIN_CROSSFALL_ZONES: MountainCrossfallZoneSpec[] = [
  // approach: crown
  { id: "CF-1", start: 0, end: 80, mode: "crown", leftSlopePercent: -2, rightSlopePercent: -2 },
  // transition + right superelevation (matches first right curve)
  { id: "CF-2", start: 80, end: 140, mode: "one_way_right", leftSlopePercent: -6, rightSlopePercent: -6 },
  // right superelevation held over right arc
  { id: "CF-3", start: 140, end: 220, mode: "one_way_right", leftSlopePercent: -6, rightSlopePercent: -6 },
  // transition back to crown
  { id: "CF-4", start: 220, end: 280, mode: "crown", leftSlopePercent: -2, rightSlopePercent: -2 },
  // crown over left-curve transition
  { id: "CF-5", start: 280, end: 360, mode: "crown", leftSlopePercent: -2, rightSlopePercent: -2 },
  // transition to left superelevation (matches left arc)
  { id: "CF-6", start: 360, end: 440, mode: "one_way_left", leftSlopePercent: 6, rightSlopePercent: 6 },
  // left superelevation to end
  { id: "CF-7", start: 440, end: 500, mode: "one_way_left", leftSlopePercent: 6, rightSlopePercent: 6 },
];

export function buildMountainCrossSlopeIntervals(): CrossSlopeIntervalDraft[] {
  return MOUNTAIN_CROSSFALL_ZONES.map((zone) => ({
    id: zone.id,
    startPhysicalDistance: zone.start,
    endPhysicalDistance: zone.end,
    mode: zone.mode,
    leftSlopePercent: zone.leftSlopePercent,
    rightSlopePercent: zone.rightSlopePercent,
    pivotDistance: 0,
  }));
}

/** Standard cross section: centerline + left/right lanes (shoulders). */
export function buildMountainCrossSectionTemplate(alignmentId: string) {
  return {
    id: "CS-mountain-viaduct-500",
    name: "山岳連続高架橋 標準断面",
    offsetLines: [
      { id: "OL-LEFT-EDGE", offset: -6, elevation: 0, role: "edge" },
      { id: "OL-LEFT-LANE", offset: -3.25, elevation: 0, role: "lane" },
      { id: "OL-CENTER", offset: 0, elevation: 0, role: "lane" },
      { id: "OL-RIGHT-LANE", offset: 3.25, elevation: 0, role: "lane" },
      { id: "OL-RIGHT-EDGE", offset: 6, elevation: 0, role: "edge" },
    ],
    station: 0,
  } as const;
}

/** Attach vertical + crossfall + cross section to a draft. */
export function applyMountainProfile(
  draft: BuildIntermediateInput,
): BuildIntermediateInput {
  return {
    ...draft,
    verticalAlignment: buildMountainVerticalProfile(),
    crossSlopeIntervals: buildMountainCrossSlopeIntervals(),
    crossSections: [
      buildMountainCrossSectionTemplate(draft.alignment.id) as unknown as NonNullable<
        BuildIntermediateInput["crossSections"]
      >[number],
    ],
  };
}
