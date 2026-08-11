import { buildRoadIntermediate, type RoadSampledPoint } from "./intermediateResult";
import { buildRoadMesh, type Road3DMesh } from "./roadMesh";
import type { LinearAlignment } from "../../../liner/core/types";
import type { VerticalElement } from "../../../liner/core/geometry/vertical";
import type { CrossSectionTemplateDraft } from "../../../liner/schema/types";

export const ROAD_CIM_GEOMETRY_VERSION = "1.0.0" as const;

export interface RoadCimMetadata {
  readonly alignmentId: string;
  readonly stationCount: number;
  readonly sectionCount: number;
  readonly profileCount: number;
  readonly coordinateContextId: string;
  readonly unitSystem: "metric";
  readonly geometryVersion: string;
  readonly generatedAt: string;
}

export interface RoadCimStationMetadata {
  readonly physicalDistance: number;
  readonly displayedStation: number;
  readonly display: string;
}

export interface RoadCimSectionMetadata {
  readonly templateId: string;
  readonly name: string;
  readonly offsetCount: number;
}

export interface RoadCimProfileMetadata {
  readonly elementId: string;
  readonly elementType: "grade" | "parabolic";
  readonly startPhysicalDistance: number;
  readonly length: number;
}

export interface RoadPavementEnvelope {
  readonly topSurface: Road3DMesh;
  readonly bottomSurface: Road3DMesh;
  readonly thickness: number;
}

export interface RoadCimGeometry {
  readonly version: string;
  readonly metadata: RoadCimMetadata;
  readonly stations: readonly RoadCimStationMetadata[];
  readonly sections: readonly RoadCimSectionMetadata[];
  readonly profiles: readonly RoadCimProfileMetadata[];
  readonly centerline: readonly RoadSampledPoint[];
  readonly surface: Road3DMesh;
  readonly pavementEnvelope: RoadPavementEnvelope;
}

export interface BuildRoadCimInput {
  readonly horizontal: LinearAlignment;
  readonly vertical: readonly VerticalElement[];
  readonly crossSection: CrossSectionTemplateDraft;
  readonly widthChangePoints?: readonly { id: string; physicalDistance: number; leftOffset: number; rightOffset: number }[];
  readonly crossSlopeIntervals?: readonly unknown[];
  readonly coordinateContextId?: string;
  readonly pavementThickness?: number;
  readonly stationInterval?: number;
}

export function buildRoadCimGeometry(input: BuildRoadCimInput): RoadCimGeometry {
  const intermediate = buildRoadIntermediate({
    horizontal: input.horizontal,
    vertical: input.vertical,
    crossSections: [input.crossSection],
    widthChangePoints: input.widthChangePoints ?? [],
    crossSlopeIntervals: input.crossSlopeIntervals ?? [],
    stationDefinition: { originDisplayedStation: 0, equations: [] },
  }, { sampleInterval: input.stationInterval ?? 10 });

  const surface = buildRoadMesh({
    horizontal: input.horizontal,
    vertical: input.vertical,
    crossSection: input.crossSection,
    widthChangePoints: input.widthChangePoints,
    crossSlopeIntervals: input.crossSlopeIntervals,
    stationInterval: input.stationInterval ?? 10,
  });

  const thickness = input.pavementThickness ?? 0.2;

  // Bottom surface = top surface lowered by pavement thickness.
  const bottomSurface: Road3DMesh = {
    vertices: surface.vertices.map((v) => ({ ...v, z: v.z - thickness })),
    triangles: surface.triangles,
    stationCount: surface.stationCount,
    offsetCount: surface.offsetCount,
  };

  const stations: RoadCimStationMetadata[] = intermediate.samplePoints.map((p) => ({
    physicalDistance: p.physicalDistance,
    displayedStation: p.displayedStation,
    display: p.display,
  }));

  const sections: RoadCimSectionMetadata[] = [
    {
      templateId: input.crossSection.id,
      name: input.crossSection.name,
      offsetCount: input.crossSection.offsetLines.length,
    },
  ];

  const profiles: RoadCimProfileMetadata[] = input.vertical.map((element) => ({
    elementId: element.id,
    elementType: element.type,
    startPhysicalDistance: element.startPhysicalDistance,
    length: element.length,
  }));

  return {
    version: ROAD_CIM_GEOMETRY_VERSION,
    metadata: {
      alignmentId: input.horizontal.id,
      stationCount: stations.length,
      sectionCount: sections.length,
      profileCount: profiles.length,
      coordinateContextId: input.coordinateContextId ?? input.horizontal.coordinatePolicyId,
      unitSystem: "metric",
      geometryVersion: ROAD_CIM_GEOMETRY_VERSION,
      generatedAt: new Date().toISOString(),
    },
    stations,
    sections,
    profiles,
    centerline: intermediate.samplePoints,
    surface,
    pavementEnvelope: { topSurface: surface, bottomSurface, thickness },
  };
}
