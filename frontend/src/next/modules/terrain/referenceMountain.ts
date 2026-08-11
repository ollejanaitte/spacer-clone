import type { LinearAlignment } from "../../../liner/core/types";
import type { VerticalElement } from "../../../liner/core/geometry/vertical";
import type { CrossSectionTemplateDraft } from "../../../liner/schema/types";
import type { ExistingConditionEntity } from "../existingConditions";
import { createTerrainGrid } from "../terrain/terrainSurface";
import type { TerrainGrid } from "../terrain/terrainSurface";

export interface ReferenceMountain {
  readonly id: string;
  readonly name: string;
  readonly terrainGrid: TerrainGrid;
  readonly existing: readonly ExistingConditionEntity[];
  readonly roadHorizontal: LinearAlignment;
  readonly roadVertical: readonly VerticalElement[];
  readonly roadCrossSection: CrossSectionTemplateDraft;
}

/**
 * Reference Mountain: two peaks with a deep valley + river, existing road,
 * railway, and an underground pipe. A planned road crosses the valley.
 */
export function createReferenceMountain(): ReferenceMountain {
  // 41x41 grid over 1000m x 1000m
  const terrainGrid = createTerrainGrid(41, 41, 25, 0, 0, (x, y) => {
    const peak1 = 280 * Math.exp(-(((x - 200) ** 2 + (y - 200) ** 2) / 25000));
    const peak2 = 320 * Math.exp(-(((x - 800) ** 2 + (y - 800) ** 2) / 25000));
    const valley = -40 * Math.exp(-(((x - 500) ** 2) / 9000));
    const base = 60;
    return base + peak1 + peak2 + valley;
  });

  const existing: ExistingConditionEntity[] = [
    {
      entityId: "RIVER-1",
      type: "river",
      label: "山岳河川",
      geometry: { kind: "line", points: [{ x: 400, y: 0, z: 40 }, { x: 600, y: 1000, z: 40 }] },
      coordinateContextId: "COORD-1",
      metadata: { width: 25 },
      visibility: true,
      layer: "water",
      styleReference: null,
      sourceReference: "survey",
    },
    {
      entityId: "EXIST-ROAD-1",
      type: "road",
      label: "既設林道",
      geometry: { kind: "line", points: [{ x: 0, y: 700, z: 120 }, { x: 1000, y: 700, z: 120 }] },
      coordinateContextId: "COORD-1",
      metadata: {},
      visibility: true,
      layer: "surface",
      styleReference: null,
      sourceReference: "survey",
    },
    {
      entityId: "RAIL-1",
      type: "railway",
      label: "既設鉄道",
      geometry: { kind: "line", points: [{ x: 0, y: 300, z: 100 }, { x: 1000, y: 300, z: 100 }] },
      coordinateContextId: "COORD-1",
      metadata: {},
      visibility: true,
      layer: "surface",
      styleReference: null,
      sourceReference: "survey",
    },
    {
      entityId: "UNDER-PIPE-1",
      type: "pipe",
      label: "地下水管",
      geometry: { kind: "pipe", points: [{ x: 200, y: 200, z: -5 }, { x: 700, y: 700, z: -5 }], diameter: 2 },
      coordinateContextId: "COORD-1",
      metadata: { material: "steel" },
      visibility: true,
      layer: "underground",
      styleReference: null,
      sourceReference: "utility",
    },
  ];

  const roadHorizontal: LinearAlignment = {
    id: "ROAD-MTN-1",
    linerModelId: "MODEL-REF",
    coordinatePolicyId: "COORD-JGD2011",
    elements: [
      { id: "S1", type: "straight", start: { x: 100, y: 500 }, azimuth: 0, length: 300 },
      { id: "C1", type: "clothoid", start: { x: 400, y: 500 }, azimuth: 0, clothoidParameter: 90, startRadius: null, endRadius: 70, turn: "left", length: 60 },
      { id: "A1", type: "arc", start: { x: 458.9072906558478, y: 508.45963051537916 }, azimuth: 0.42857142857142855, radius: 70, turn: "left", length: 90 },
      { id: "C2", type: "clothoid", start: { x: 499.0978742265217, y: 582.1386805117938 }, azimuth: 1.7142857142857144, clothoidParameter: 90, startRadius: 70, endRadius: null, turn: "left", length: 60 },
      { id: "S2", type: "straight", start: { x: 470.6585296973547, y: 633.7633929893109 }, azimuth: 2.365079365079365, length: 250 },
    ],
  };

  const roadVertical: VerticalElement[] = [
    { type: "grade", id: "G1", startPhysicalDistance: 0, startElevation: 100, grade: 0.03, length: 250 },
    { type: "parabolic", id: "P1", startPhysicalDistance: 250, startElevation: 107.5, gradeIn: 0.03, gradeOut: -0.02, length: 120 },
    { type: "grade", id: "G2", startPhysicalDistance: 370, startElevation: 106.5, grade: -0.02, length: 390 },
  ];

  const roadCrossSection: CrossSectionTemplateDraft = {
    id: "XS-MTN",
    name: "山岳道路",
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

  return {
    id: "REF-MOUNTAIN-1",
    name: "Reference Mountain（山・谷・河川・既設道路・鉄道・地下管路・計画道路）",
    terrainGrid,
    existing,
    roadHorizontal,
    roadVertical,
    roadCrossSection,
  };
}
