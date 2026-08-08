/**
 * Snapshot -> 3D Bridge Model (Phase 6-3, 3D Connector / CN-07).
 *
 * Builds renderer-agnostic `ApolloSolidGeometryParameter[]` (the existing 3D
 * payload contract) directly from a `GeometrySnapshot`. All positions and
 * orientations come from the snapshot (LINER authority); no bridge geometry is
 * recomputed here. Dimensions use declared/golden-derived values.
 *
 * The payload feeds the existing viewer renderer AND the STL/DXF export paths,
 * so 3D display and exports share the same snapshot-derived geometry.
 */

import type { GeometrySnapshot } from "../geometry";
import type {
  ApolloSolidGeometryParameter,
  ApolloVisualizationVisibilityGroup,
} from "./types";

export type Snapshot3dGirderSpec = {
  depthM: number;
  flangeWidthM: number;
  flangeThicknessM: number;
  webThicknessM: number;
};

export type Snapshot3dCrossBeamSpec = {
  depthM: number;
  widthM: number;
};

export type Snapshot3dBearingSpec = {
  widthM: number;
  lengthM: number;
  heightM: number;
};

export type Snapshot3dBuildOptions = {
  girder?: Partial<Snapshot3dGirderSpec>;
  crossBeam?: Partial<Snapshot3dCrossBeamSpec>;
  bearing?: Partial<Snapshot3dBearingSpec>;
};

/** RB-001 golden-derived defaults (girder depth G-GEO-0008, flange G-GEO-0020). */
export const SNAPSHOT_3D_DEFAULTS = {
  girder: {
    depthM: 2.7,
    flangeWidthM: 0.62,
    flangeThicknessM: 0.03,
    webThicknessM: 0.014,
  },
  crossBeam: { depthM: 1.2, widthM: 0.35 },
  bearing: { widthM: 0.6, lengthM: 0.6, heightM: 0.12 },
} as const;

function resolveOptions(options: Snapshot3dBuildOptions = {}) {
  return {
    girder: { ...SNAPSHOT_3D_DEFAULTS.girder, ...options.girder },
    crossBeam: { ...SNAPSHOT_3D_DEFAULTS.crossBeam, ...options.crossBeam },
    bearing: { ...SNAPSHOT_3D_DEFAULTS.bearing, ...options.bearing },
  };
}

/** Average of two vectors (solid midpoint between two snapshot points). */
function midpoint(a: readonly [number, number, number], b: readonly [number, number, number]) {
  return [a[0] + (b[0] - a[0]) / 2, a[1] + (b[1] - a[1]) / 2, a[2] + (b[2] - a[2]) / 2] as const;
}

/** Normalized direction between two points (along member / girder). */
function direction(a: readonly [number, number, number], b: readonly [number, number, number]) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const len = Math.hypot(dx, dy, dz) || 1;
  return [dx / len, dy / len, dz / len] as const;
}

function solid(
  id: string,
  kind: ApolloSolidGeometryParameter["kind"],
  visibilityGroup: ApolloVisualizationVisibilityGroup,
  sourceEntityId: string,
  selectionKey: string,
  dimensionsM: Record<string, number>,
  origin: readonly [number, number, number],
  xAxis: readonly [number, number, number],
  yAxis: readonly [number, number, number],
  zAxis: readonly [number, number, number],
  exportable = true,
): ApolloSolidGeometryParameter {
  return {
    id,
    sourceEntityKind: "member",
    sourceEntityId,
    selectionKey,
    validationTargetKey: selectionKey,
    displayLabel: `${kind}:${sourceEntityId}`,
    kind,
    visibilityGroup,
    exportable,
    dimensionsM,
    localFrame: { origin, xAxis, yAxis, zAxis },
  };
}

/**
 * Build 3D solid parameters for all superstructure members from a snapshot.
 * - girder lines -> I-section girders
 * - deck reference -> deck slab
 * - cross girder references -> cross beams
 * - bearing points -> bearings
 */
export function buildSnapshotSolidParameters(
  snapshot: GeometrySnapshot,
  options: Snapshot3dBuildOptions = {},
): ApolloSolidGeometryParameter[] {
  const opts = resolveOptions(options);
  const solids: ApolloSolidGeometryParameter[] = [];
  const up = [0, 0, 1] as const;

  // Main girders (I-section along each girder line)
  for (const line of snapshot.girderLines) {
    if (line.points.length < 2) continue;
    const start = line.points[0];
    const end = line.points[line.points.length - 1];
    const a: readonly [number, number, number] = [start.position.x, start.position.y, start.position.z];
    const b: readonly [number, number, number] = [end.position.x, end.position.y, end.position.z];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const xAxis = direction(a, b);
    const frame = start.localFrame;
    const yAxis: readonly [number, number, number] =
      frame === undefined
        ? ([-xAxis[1], xAxis[0], 0] as const)
        : [frame.normal.x, frame.normal.y, frame.normal.z];
    const zAxis = up;
    const mid = midpoint(a, b);
    // girder centre sits half-depth below the deck reference plane
    const origin: readonly [number, number, number] = [mid[0], mid[1], mid[2] - opts.girder.depthM / 2];
    solids.push(
      solid(
        `solid:snapshot:girder:${line.girderId}`,
        "girder",
        "girders",
        line.girderId,
        `girder:${line.girderId}`,
        {
          length,
          offset: line.offsetM.value ?? 0,
          depth: opts.girder.depthM,
          flangeWidth: opts.girder.flangeWidthM,
          flangeThickness: opts.girder.flangeThicknessM,
          webThickness: opts.girder.webThicknessM,
          shape: 1,
        },
        origin,
        xAxis,
        yAxis,
        zAxis,
      ),
    );
  }

  // Deck slab
  const bridgeLength =
    snapshot.alignmentReferences[0]?.bridgeLengthM.value ??
    (snapshot.crossSectionFrames.length
      ? snapshot.crossSectionFrames[snapshot.crossSectionFrames.length - 1].stationM
      : 0);
  for (const deck of snapshot.deckReferences) {
    const width = deck.edgeOffsetM ? deck.edgeOffsetM.right - deck.edgeOffsetM.left : deck.widthM.value;
    if (width === undefined || deck.thicknessM.value === undefined) continue;
    const origin: readonly [number, number, number] = [
      bridgeLength / 2,
      deck.edgeOffsetM ? (deck.edgeOffsetM.left + deck.edgeOffsetM.right) / 2 : 0,
      deck.elevationM?.value ?? 0,
    ];
    solids.push(
      solid(
        `solid:snapshot:deck:${deck.deckId}`,
        "deck",
        "deck",
        deck.deckId,
        `deck:${deck.deckId}`,
        { length: bridgeLength, width, thickness: deck.thicknessM.value },
        origin,
        [1, 0, 0],
        [0, 1, 0],
        up,
      ),
    );
  }

  // Cross beams
  for (const xg of snapshot.crossGirderReferences) {
    const frame = snapshot.crossSectionFrames.find((f) => f.stationM === xg.stationM);
    const z = frame?.elevationM ?? 0;
    solids.push(
      solid(
        `solid:snapshot:crossbeam:${xg.crossGirderId}`,
        "cross_beam",
        "cross-beams",
        xg.crossGirderId,
        `crossbeam:${xg.crossGirderId}`,
        { length: 8.01, width: opts.crossBeam.widthM, depth: opts.crossBeam.depthM },
        [xg.stationM, 0, z - opts.crossBeam.depthM / 2],
        [0, 1, 0],
        [1, 0, 0],
        up,
      ),
    );
  }

  // Bearings
  for (const brg of snapshot.bearingPoints) {
    solids.push(
      solid(
        `solid:snapshot:bearing:${brg.id}`,
        "bearing",
        "bearings",
        brg.id,
        `bearing:${brg.id}`,
        { length: opts.bearing.lengthM, width: opts.bearing.widthM, height: opts.bearing.heightM },
        [brg.position.x, brg.position.y, brg.position.z],
        [1, 0, 0],
        [0, 1, 0],
        up,
      ),
    );
  }

  return solids;
}
