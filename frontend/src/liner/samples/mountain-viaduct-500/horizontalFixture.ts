/**
 * Mountain Viaduct 500 — horizontal alignment fixture (MOUNTAIN-SAMPLE P02).
 *
 * A 500 m alignment that snakes left/right with LINE / ARC / CLOTHOID so the
 * 3D road is clearly curved, including multiple curvature changes within the
 * bridge section (STA.50–450). Designed with continuity (C0/C1) via
 * buildChainedAlignment; values are validated against the existing solver.
 */
import type { LinearAlignment } from "../../core/types";
import { buildChainedAlignment, alignmentLength } from "./horizontal";

export const MOUNTAIN_ORIGIN = { x: 0, y: 0 };
export const MOUNTAIN_ORIGIN_AZIMUTH = 0;

/** Element specs: 500 m total, symmetric snake with clothoid transitions. */
export const MOUNTAIN_HORIZONTAL_SPECS = [
  { type: "straight", id: "S0", length: 30.0 },
  { type: "clothoid", id: "C1", length: 40.0, clothoidParameter: 69.28, startRadius: null, endRadius: 120.0, turn: "right" },
  { type: "arc", id: "R1", length: 70.0, radius: 120.0, turn: "right" },
  { type: "clothoid", id: "C2", length: 40.0, clothoidParameter: 69.28, startRadius: 120.0, endRadius: null, turn: "right" },
  { type: "clothoid", id: "C3", length: 40.0, clothoidParameter: 77.46, startRadius: null, endRadius: 150.0, turn: "left" },
  { type: "arc", id: "L1", length: 80.0, radius: 150.0, turn: "left" },
  { type: "clothoid", id: "C4", length: 40.0, clothoidParameter: 77.46, startRadius: 150.0, endRadius: null, turn: "left" },
  { type: "clothoid", id: "C5", length: 50.0, clothoidParameter: 100.0, startRadius: null, endRadius: 200.0, turn: "right" },
  { type: "arc", id: "R2", length: 60.0, radius: 200.0, turn: "right" },
  { type: "clothoid", id: "C6", length: 50.0, clothoidParameter: 100.0, startRadius: 200.0, endRadius: null, turn: "right" },
] as const;

/** Element lengths must sum to 500. */
export function mountainHorizontalLength(): number {
  return MOUNTAIN_HORIZONTAL_SPECS.reduce((sum, e) => sum + e.length, 0);
}

export function buildMountainHorizontalAlignment(): LinearAlignment {
  return buildChainedAlignment({
    id: "mountain-viaduct-500",
    linerModelId: "mountain-viaduct-500",
    coordinatePolicyId: "global",
    elements: MOUNTAIN_HORIZONTAL_SPECS as unknown as import("./horizontal").ElementSpec[],
    origin: MOUNTAIN_ORIGIN,
    originAzimuth: MOUNTAIN_ORIGIN_AZIMUTH,
  });
}

export { alignmentLength };
