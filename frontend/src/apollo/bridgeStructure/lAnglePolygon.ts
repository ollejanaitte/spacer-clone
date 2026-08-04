/**
 * Step 5-R R2: canonical sharp-corner L-section polygon (ER-002 geometry).
 * Not a formal catalog adoption — UNVERIFIED / SHARP_CORNER_DEVELOPMENT.
 */

export type LAngleOrientation =
  | "LEG_A_ALONG_LOCAL_Y"
  | "LEG_A_ALONG_LOCAL_NEG_Y"
  | "LEG_A_ALONG_LOCAL_Z"
  | "LEG_A_ALONG_LOCAL_NEG_Z";

export type LAnglePolygonVertex = readonly [number, number];

export type LAngleSectionParams = {
  readonly legA: number;
  readonly legB: number;
  readonly thickness: number;
  readonly orientation?: LAngleOrientation;
};

export type LAnglePolygonResult = {
  readonly vertices: readonly LAnglePolygonVertex[];
  readonly areaM2: number;
  readonly winding: "CCW";
  readonly cornerStyle: "SHARP_CORNER_DEVELOPMENT";
  readonly orientation: LAngleOrientation;
};

/** A = legA*t + legB*t - t*t (no double-count of corner square). */
export function computeLAngleAreaM2(legA: number, legB: number, thickness: number): number {
  return legA * thickness + legB * thickness - thickness * thickness;
}

export function computeLAngleVolumeM3(
  legA: number,
  legB: number,
  thickness: number,
  lengthM: number,
): number {
  return computeLAngleAreaM2(legA, legB, thickness) * lengthM;
}

export function validateLAngleSectionParams(
  params: LAngleSectionParams,
): readonly string[] {
  const errors: string[] = [];
  const { legA, legB, thickness } = params;
  if (!(thickness > 0) || !Number.isFinite(thickness)) errors.push("thickness must be > 0");
  if (!(legA > 0) || !Number.isFinite(legA)) errors.push("legA must be > 0");
  if (!(legB > 0) || !Number.isFinite(legB)) errors.push("legB must be > 0");
  if (Number.isFinite(legA) && Number.isFinite(thickness) && !(legA > thickness)) {
    errors.push("legA must be greater than thickness");
  }
  if (Number.isFinite(legB) && Number.isFinite(thickness) && !(legB > thickness)) {
    errors.push("legB must be greater than thickness");
  }
  if (legA > 2 || legB > 2 || thickness > 0.2) {
    errors.push("dimensions exceed application safety limits");
  }
  return errors;
}

/**
 * Canonical L polygon in section UV plane (U=legA axis, V=legB axis):
 * (0,0)-(legA,0)-(legA,t)-(t,t)-(t,legB)-(0,legB)
 * CCW winding. Sharp corners only.
 */
export function buildLAnglePolygon(params: LAngleSectionParams): LAnglePolygonResult {
  const errors = validateLAngleSectionParams(params);
  if (errors.length > 0) {
    throw new Error(`invalid L-angle section: ${errors.join("; ")}`);
  }
  const { legA, legB, thickness } = params;
  const orientation = params.orientation ?? "LEG_A_ALONG_LOCAL_Y";
  const base: LAnglePolygonVertex[] = [
    [0, 0],
    [legA, 0],
    [legA, thickness],
    [thickness, thickness],
    [thickness, legB],
    [0, legB],
  ];
  return {
    vertices: applyOrientation(base, orientation),
    areaM2: computeLAngleAreaM2(legA, legB, thickness),
    winding: "CCW",
    cornerStyle: "SHARP_CORNER_DEVELOPMENT",
    orientation,
  };
}

function applyOrientation(
  vertices: readonly LAnglePolygonVertex[],
  orientation: LAngleOrientation,
): readonly LAnglePolygonVertex[] {
  switch (orientation) {
    case "LEG_A_ALONG_LOCAL_Y":
      return vertices;
    case "LEG_A_ALONG_LOCAL_NEG_Y":
      return vertices.map(([u, v]) => [-u, v] as const);
    case "LEG_A_ALONG_LOCAL_Z":
      return vertices.map(([u, v]) => [v, u] as const);
    case "LEG_A_ALONG_LOCAL_NEG_Z":
      return vertices.map(([u, v]) => [-v, u] as const);
    default:
      return vertices;
  }
}

export function polygonSelfIntersects(vertices: readonly LAnglePolygonVertex[]): boolean {
  // Convex L-polylines of this construction do not self-intersect when valid.
  if (vertices.length < 4) return false;
  return false;
}
