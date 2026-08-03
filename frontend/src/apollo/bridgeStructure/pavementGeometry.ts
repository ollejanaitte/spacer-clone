/** Pavement / marking placement geometry (Step 5-3 P3). */

import { PRESENCE_STATUS } from "./presence";
import type {
  ApolloPavementConfigurationDraft,
  ApolloRoadMarkingsConfigurationDraft,
  RoadMarkingKind,
} from "./pavementTypes";

export type PavementGeometry = {
  readonly sourceEntityId: string;
  readonly lengthM: number;
  readonly widthM: number;
  readonly thicknessM: number;
  readonly startStation: number;
  readonly endStation: number;
  readonly centerStation: number;
  readonly centerZ: number;
  readonly unitWeight: number | null;
};

export type RoadMarkingGeometry = {
  readonly sourceEntityId: string;
  readonly kind: RoadMarkingKind;
  readonly lengthM: number;
  readonly widthM: number;
  readonly thicknessM: number;
  readonly startStation: number;
  readonly endStation: number;
  readonly centerStation: number;
  readonly transverseOffset: number;
  readonly centerZ: number;
  readonly dashPattern: string;
};

const MARKING_EPSILON_M = 0.002;

export function derivePavementGeometry(
  configuration: ApolloPavementConfigurationDraft,
  bridgeLength: number,
  deckWidth: number,
  deckThickness: number,
): PavementGeometry | null {
  if (configuration.presence !== PRESENCE_STATUS.PROVIDED || !configuration.item) return null;
  const thickness = configuration.item.thickness;
  if (thickness === null || thickness <= 0) return null;
  const start = configuration.item.startStation ?? 0;
  const end = configuration.item.endStation ?? bridgeLength;
  if (!(end > start)) return null;
  return {
    sourceEntityId: "pavement-main",
    lengthM: end - start,
    widthM: deckWidth,
    thicknessM: thickness,
    startStation: start,
    endStation: end,
    centerStation: (start + end) / 2,
    centerZ: deckThickness + thickness / 2,
    unitWeight: configuration.item.unitWeight,
  };
}

export function deriveRoadMarkingGeometries(
  configuration: ApolloRoadMarkingsConfigurationDraft,
  bridgeLength: number,
  deckWidth: number,
  deckThickness: number,
  pavementThickness: number,
): readonly RoadMarkingGeometry[] {
  if (!configuration.enabled || bridgeLength <= 0 || deckWidth <= 0) return [];
  const topZ = deckThickness + Math.max(pavementThickness, 0) + MARKING_EPSILON_M;
  const edgeOffset = deckWidth / 2 - 0.2;
  const out: RoadMarkingGeometry[] = [];
  for (const marking of configuration.markings) {
    if (!marking.enabled) continue;
    const width = marking.width ?? 0.15;
    if (width <= 0) continue;
    let offset = marking.offsetFromCenter;
    if (offset === null) {
      if (marking.kind === "EDGE_LINE_LEFT") offset = -edgeOffset;
      else if (marking.kind === "EDGE_LINE_RIGHT") offset = edgeOffset;
      else offset = 0;
    }
    out.push({
      sourceEntityId: marking.markingId,
      kind: marking.kind,
      lengthM: bridgeLength,
      widthM: width,
      thicknessM: MARKING_EPSILON_M,
      startStation: 0,
      endStation: bridgeLength,
      centerStation: bridgeLength / 2,
      transverseOffset: offset,
      centerZ: topZ,
      dashPattern: marking.dashPattern,
    });
  }
  return out;
}
