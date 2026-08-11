import {
  evaluateVerticalElement,
  type VerticalElement,
  type VerticalEvaluation,
} from "../../../liner/core/geometry/vertical";
import {
  validateVerticalAlignment,
} from "../../../liner/core/validateVerticalAlignment";
import {
  checkVerticalContinuity,
} from "../../../liner/core/verticalContinuity";
import {
  sampleVerticalAlignmentAtInterval,
} from "../../../liner/core/verticalSampling";
import type {
  VerticalAlignmentDraft,
  VerticalElementDraft,
} from "../../../liner/schema/types";
import { evaluateAlignmentAtDistance } from "../../../liner/core/geometry/horizontal";
import type { LinearAlignment, Vec3 } from "../../../liner/core/types";

/**
 * Phase 2-04: Vertical alignment core.
 * Reuses the proven LINER vertical geometry/validation (KEEP/ADAPT).
 */
export {
  evaluateVerticalElement,
  validateVerticalAlignment,
  checkVerticalContinuity,
  sampleVerticalAlignmentAtInterval,
};

export type {
  VerticalElement,
  VerticalEvaluation,
  VerticalAlignmentDraft,
  VerticalElementDraft,
};

export interface RoadVerticalAlignment {
  readonly elements: readonly VerticalElement[];
  readonly ok: boolean;
  readonly issues: readonly { path: string; message: string }[];
}

export function createRoadVerticalAlignment(
  elements: readonly VerticalElement[],
): RoadVerticalAlignment {
  const issues: { path: string; message: string }[] = [];
  for (const element of elements) {
    if (!Number.isFinite(element.startPhysicalDistance) || !Number.isFinite(element.length)) {
      issues.push({ path: `element:${element.id}`, message: "invalid element bounds" });
    }
    if (element.length <= 0) {
      issues.push({ path: `element:${element.id}`, message: "non-positive length" });
    }
  }
  return { elements, ok: issues.length === 0, issues };
}

export function evaluateRoadElevation(
  elements: readonly VerticalElement[],
  physicalDistance: number,
): VerticalEvaluation | undefined {
  for (const element of elements) {
    const start = element.startPhysicalDistance;
    const end = start + element.length;
    if (physicalDistance >= start - 1e-9 && physicalDistance <= end + 1e-9) {
      return evaluateVerticalElement(element, physicalDistance);
    }
  }
  return undefined;
}

export interface RoadCenterlinePoint3D {
  readonly physicalDistance: number;
  readonly point: Vec3;
  readonly azimuth: number;
  readonly curvature: number;
  readonly elevation: number;
  readonly grade: number;
}

export function evaluateRoadCenterline3D(
  horizontal: LinearAlignment,
  verticalElements: readonly VerticalElement[],
  physicalDistance: number,
): RoadCenterlinePoint3D | undefined {
  const horizontalEval = evaluateAlignmentAtDistance(horizontal, physicalDistance);
  const verticalEval = evaluateRoadElevation(verticalElements, physicalDistance);
  if (verticalEval === undefined) {
    return undefined;
  }
  return {
    physicalDistance: horizontalEval.physicalDistance,
    point: { x: horizontalEval.point.x, y: horizontalEval.point.y, z: verticalEval.elevation },
    azimuth: horizontalEval.azimuth,
    curvature: horizontalEval.curvature,
    elevation: verticalEval.elevation,
    grade: verticalEval.grade,
  };
}
