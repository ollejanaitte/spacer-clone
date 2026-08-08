/**
 * plane-grid -> global coordinate transform (Phase 6-2).
 *
 * Reference Bridge 001 structural-model panel points are stored in a local
 * "plane grid" coordinate system (G-GEO-0009..0016). This module declares the
 * affine translation from plane-grid coordinates to the bridge global
 * (station / offset) system, following STEP1_P04_BRIDGE_GEOMETRY.md §5:
 *
 *   globalStation = planeX + translationX
 *   globalOffset  = planeY
 *   translationX  = bridgeLengthM - planeEndX   (reference girder-line end)
 *
 * The transform is derived purely from Golden values (bridge length G-GEO-0001,
 * plane endpoint X G-GEO-0011) and is declared once per bridge (single global
 * transform; no hidden per-consumer transforms).
 */

export type PlaneGridTransform = {
  /** globalStation = planeX + translationX */
  translationX: number;
  /** provenance: which reference values produced the translation. */
  reference: string;
};

export const RB001_PLANE_END_X_AG1 = 132.76045; // G-GEO-0011 (GRID-1027.X)
export const RB001_BRIDGE_LENGTH_M = 134.001; // G-GEO-0001

/**
 * translationX = bridgeLengthM - planeEndX, so the girder-line end plane
 * coordinate maps to the bridge-end station (support station).
 */
export function derivePlaneGridTranslation(
  bridgeLengthM: number,
  planeEndX: number,
  reference: string,
): PlaneGridTransform {
  if (!Number.isFinite(bridgeLengthM) || !Number.isFinite(planeEndX)) {
    throw new Error("plane-grid translation requires finite bridgeLengthM and planeEndX");
  }
  return {
    translationX: bridgeLengthM - planeEndX,
    reference,
  };
}

/** plane-grid X -> bridge station (m). */
export function planeGridToStation(planeX: number, transform: PlaneGridTransform): number {
  return planeX + transform.translationX;
}

/** plane-grid Y -> bridge offset (m, right-positive). */
export function planeGridToOffset(planeY: number): number {
  return planeY;
}

/** RB-001 reference transform (declared once; AG1 girder-line end as reference). */
export function rb001PlaneGridTransform(): PlaneGridTransform {
  return derivePlaneGridTranslation(
    RB001_BRIDGE_LENGTH_M,
    RB001_PLANE_END_X_AG1,
    "RB-001 AG1 end (G-GEO-0011) + bridge length (G-GEO-0001)",
  );
}
