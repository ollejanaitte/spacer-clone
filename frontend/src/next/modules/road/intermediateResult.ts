import {
  createRoadHorizontal,
} from "./horizontal";
import {
  createRoadStationing,
  evaluatePointAtStation,
  createDefaultStationDefinition,
} from "./stationing";
import {
  createRoadVerticalAlignment,
  evaluateRoadCenterline3D,
} from "./vertical";
import {
  buildRoadCrossSection,
} from "./crossSection";
import {
  evaluateRoadWidth,
  evaluateRoadCrossfall,
} from "./width";
import type { LinearAlignment } from "../../../liner/core/types";
import type { VerticalElement } from "../../../liner/core/geometry/vertical";
import type { CrossSectionTemplateDraft } from "../../../liner/schema/types";

export interface RoadInputs {
  readonly horizontal: LinearAlignment | undefined;
  readonly vertical: readonly VerticalElement[];
  readonly crossSections: readonly CrossSectionTemplateDraft[];
  readonly widthChangePoints: readonly { id: string; physicalDistance: number; leftOffset: number; rightOffset: number }[];
  readonly crossSlopeIntervals: readonly unknown[];
  readonly stationDefinition: { originDisplayedStation: number; equations?: readonly { id: string; physicalDistance: number; type: "add_constant" | "reset_to_value"; value: number; sortIndex?: number }[] };
}

export interface RoadSampledPoint {
  readonly physicalDistance: number;
  readonly displayedStation: number;
  readonly display: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly azimuth: number;
  readonly curvature: number;
  readonly grade: number;
  readonly leftWidth: number;
  readonly rightWidth: number;
  readonly leftSlopePercent: number;
  readonly rightSlopePercent: number;
}

export interface RoadIntermediateResult {
  readonly ok: boolean;
  readonly issues: readonly { path: string; message: string }[];
  readonly totalLength: number;
  readonly samplePoints: readonly RoadSampledPoint[];
  readonly sample: (physicalDistance: number) => RoadSampledPoint | undefined;
}

export interface BuildIntermediateOptions {
  readonly sampleInterval?: number;
}

export function buildRoadIntermediate(input: RoadInputs, options: BuildIntermediateOptions = {}): RoadIntermediateResult {
  const issues: { path: string; message: string }[] = [];

  if (!input.horizontal) {
    issues.push({ path: "horizontal", message: "horizontal alignment is required" });
  }

  const horizontal = input.horizontal ? createRoadHorizontal(input.horizontal) : undefined;
  if (horizontal && !horizontal.ok) {
    issues.push(...horizontal.issues.map((i) => ({
      path: `horizontal.${i.entityPath ?? i.field ?? i.code}`,
      message: i.detail ?? i.code,
    })));
  }
  if (horizontal) {
    for (const e of input.vertical) {
      if (!Number.isFinite(e.startPhysicalDistance) || e.length <= 0) {
        issues.push({ path: `vertical.${e.id}`, message: "invalid vertical element" });
      }
    }
  }
  for (const xs of input.crossSections) {
    if (!xs.id || xs.name === undefined) {
      issues.push({ path: `crossSection.${xs.id ?? "?"}`, message: "invalid cross section" });
    }
  }

  const sampleInterval = options.sampleInterval ?? 20;
  const totalLength = horizontal?.totalLength ?? 0;
  const samplePoints: RoadSampledPoint[] = [];

  const sample = (physicalDistance: number): RoadSampledPoint | undefined => {
    if (!input.horizontal || !horizontal) return undefined;
    const center = evaluateRoadCenterline3D(input.horizontal, input.vertical, physicalDistance);
    if (!center) return undefined;
    const stationDef = {
      originDisplayedStation: input.stationDefinition.originDisplayedStation,
      equations: [...(input.stationDefinition.equations ?? [])],
    };
    const stationPoint = evaluatePointAtStation(input.horizontal, stationDef, physicalDistance);
    const width = evaluateRoadWidth(input.crossSections[0], input.widthChangePoints, physicalDistance);
    const crossfall = evaluateRoadCrossfall(input.crossSections[0], input.crossSlopeIntervals as never, physicalDistance, stationPoint.displayedStation);
    return {
      physicalDistance: center.physicalDistance,
      displayedStation: stationPoint.displayedStation,
      display: stationPoint.display,
      x: center.point.x,
      y: center.point.y,
      z: center.point.z,
      azimuth: center.azimuth,
      curvature: center.curvature,
      grade: center.grade,
      leftWidth: width.leftOffset,
      rightWidth: width.rightOffset,
      leftSlopePercent: crossfall.leftSlopePercent,
      rightSlopePercent: crossfall.rightSlopePercent,
    };
  };

  if (horizontal && horizontal.ok) {
    for (let d = 0; d <= totalLength + 1e-9; d += sampleInterval) {
      const p = sample(d);
      if (p) samplePoints.push(p);
    }
    if (samplePoints.length === 0 || Math.abs(samplePoints[samplePoints.length - 1].physicalDistance - totalLength) > 1e-6) {
      const last = sample(totalLength);
      if (last) samplePoints.push(last);
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    totalLength,
    samplePoints,
    sample,
  };
}
