import type { LinearAlignment } from "../../../liner/core/types";
import type { VerticalElement } from "../../../liner/core/geometry/vertical";
import type { CrossSectionTemplateDraft } from "../../../liner/schema/types";

/**
 * Phase 2-12: Mountain road reference sample.
 * Includes Straight, Arc, Clothoid, Composite alignment; grade + parabolic
 * vertical; cross-section; widening; cross-slope interval.
 */
export interface RoadReferenceSample {
  readonly id: string;
  readonly name: string;
  readonly horizontal: LinearAlignment;
  readonly vertical: readonly VerticalElement[];
  readonly crossSections: readonly CrossSectionTemplateDraft[];
  readonly widthChangePoints: readonly { id: string; physicalDistance: number; leftOffset: number; rightOffset: number }[];
  readonly crossSlopeIntervals: readonly unknown[];
  readonly stationDefinition: { originDisplayedStation: number; equations?: readonly { id: string; physicalDistance: number; type: "add_constant" | "reset_to_value"; value: number; sortIndex?: number }[] };
}

export function createMountainRoadSample(): RoadReferenceSample {
  const horizontal: LinearAlignment = {
    id: "REF-MTN-1",
    linerModelId: "MODEL-REF",
    coordinatePolicyId: "COORD-JGD2011",
    elements: [
      { id: "S1", type: "straight", start: { x: 0, y: 0 }, azimuth: 0, length: 200 },
      { id: "C1", type: "clothoid", start: { x: 200, y: 0 }, azimuth: 0, clothoidParameter: 80, startRadius: null, endRadius: 60, turn: "left", length: 60 },
      { id: "A1", type: "arc", start: { x: 258.5172612893466, y: 9.822842839666354 }, azimuth: 0.5, radius: 60, turn: "left", length: 80 },
      { id: "C2", type: "clothoid", start: { x: 287.6958081985444, y: 78.04968413021871 }, azimuth: 1.8333333333333333, clothoidParameter: 80, startRadius: 60, endRadius: null, turn: "left", length: 60 },
      { id: "S2", type: "straight", start: { x: 250.47247344329782, y: 123.15076445131749 }, azimuth: 2.614583333333333, length: 100 },
    ],
  };

  const vertical: VerticalElement[] = [
    { type: "grade", id: "G1", startPhysicalDistance: 0, startElevation: 120, grade: 0.04, length: 250 },
    { type: "parabolic", id: "P1", startPhysicalDistance: 250, startElevation: 130, gradeIn: 0.04, gradeOut: -0.03, length: 120 },
    { type: "grade", id: "G2", startPhysicalDistance: 370, startElevation: 128.4, grade: -0.03, length: 130 },
  ];

  const crossSections: CrossSectionTemplateDraft[] = [
    {
      id: "XS-MTN",
      name: "山岳標準",
      offsetLines: [
        { id: "L-shoulder", offset: -4.5, elevation: 0.1, role: "shoulder", label: "左路肩" },
        { id: "L-lane", offset: -3.0, elevation: 0, role: "lane", label: "左車線" },
        { id: "C", offset: 0, elevation: 0, role: "lane", label: "中心" },
        { id: "R-lane", offset: 3.0, elevation: 0, role: "lane", label: "右車線" },
        { id: "R-shoulder", offset: 4.5, elevation: 0.1, role: "shoulder", label: "右路肩" },
      ],
      crossSlope: { signConvention: "right_down_positive", valuePercent: 2 },
      station: 0,
    },
  ];

  const widthChangePoints = [
    { id: "W1", physicalDistance: 0, leftOffset: 4.5, rightOffset: 4.5 },
    { id: "W2", physicalDistance: 250, leftOffset: 5.5, rightOffset: 5.5 },
    { id: "W3", physicalDistance: 370, leftOffset: 5.0, rightOffset: 5.0 },
  ];

  const crossSlopeIntervals = [
    { id: "CS1", startPhysicalDistance: 0, endPhysicalDistance: 200, mode: "crown", leftSlopePercent: 2, rightSlopePercent: 2 },
    { id: "CS2", startPhysicalDistance: 200, endPhysicalDistance: 340, mode: "one_way_left", leftSlopePercent: 4, rightSlopePercent: 4, pivotDistance: 0 },
    { id: "CS3", startPhysicalDistance: 340, endPhysicalDistance: 500, mode: "crown", leftSlopePercent: 2, rightSlopePercent: 2 },
  ];

  return {
    id: "REF-MTN-1",
    name: "山岳道路Reference（直線・クロソイド・円弧・複合線形）",
    horizontal,
    vertical,
    crossSections,
    widthChangePoints,
    crossSlopeIntervals,
    stationDefinition: { originDisplayedStation: 0, equations: [] },
  };
}
