/**
 * Horizontal alignment chaining (MOUNTAIN-SAMPLE P02).
 *
 * Builds a continuous LinearAlignment from element specs by propagating each
 * element's end state (point + azimuth + curvature) into the next element's
 * start. This keeps C0/C1 continuity across LINE / ARC / CLOTHOID without
 * hand-computing start coordinates.
 *
 * Specs intentionally use the same fields as the frontend core element types
 * (core/types.ts) so the built alignment flows through the existing
 * buildIntermediateResult pipeline unchanged.
 */
import type {
  AlignmentElement,
  ClothoidElement,
  LinearAlignment,
  Vec2,
} from "../../core/types";
import {
  evaluateElementEndState,
  totalAlignmentLength,
} from "../../core/geometry/horizontal";

export type ElementSpec =
  | { type: "straight"; id: string; length: number }
  | { type: "arc"; id: string; length: number; radius: number; turn: "left" | "right" }
  | {
      type: "clothoid";
      id: string;
      length: number;
      clothoidParameter: number;
      startRadius: number | null;
      endRadius: number | null;
      turn: "left" | "right";
    };

export interface BuildChainedAlignmentOptions {
  id: string;
  linerModelId: string;
  coordinatePolicyId: string;
  elements: ElementSpec[];
  origin: Vec2;
  originAzimuth: number;
}

function toElement(spec: ElementSpec, start: Vec2, azimuth: number): AlignmentElement {
  if (spec.type === "straight") {
    return { id: spec.id, type: "straight", length: spec.length, start, azimuth };
  }
  if (spec.type === "arc") {
    return {
      id: spec.id,
      type: "arc",
      length: spec.length,
      start,
      azimuth,
      radius: spec.radius,
      turn: spec.turn,
    };
  }
  const clothoid: ClothoidElement = {
    id: spec.id,
    type: "clothoid",
    length: spec.length,
    start,
    azimuth,
    clothoidParameter: spec.clothoidParameter,
    startRadius: spec.startRadius,
    endRadius: spec.endRadius,
    turn: spec.turn,
  };
  return clothoid;
}

/** Build a continuous alignment chain from specs. */
export function buildChainedAlignment(
  options: BuildChainedAlignmentOptions,
): LinearAlignment {
  const elements: AlignmentElement[] = [];
  let cursor: Vec2 = { ...options.origin };
  let azimuth = options.originAzimuth;

  for (const spec of options.elements) {
    const element = toElement(spec, cursor, azimuth);
    elements.push(element);
    const endState = evaluateElementEndState(element);
    cursor = { ...endState.point };
    azimuth = endState.azimuth;
  }

  return {
    id: options.id,
    linerModelId: options.linerModelId,
    coordinatePolicyId: options.coordinatePolicyId,
    elements,
  };
}

export function alignmentLength(alignment: LinearAlignment): number {
  return totalAlignmentLength(alignment);
}
