/**
 * Lane V-5 — Real Bridge Adapter (RB001 bridge candidate -> superstructure /
 * bearings / substructure layers).
 *
 * Builds a realistic continuous bridge at the Reference Business 001 Gujo road
 * crossing. The bridge sits exactly on the RB001 road alignment centerline
 * (STA.1200..1400, 4 spans × nominal 50 m = A1 + P1..P3 + A2, inside the
 * STA.1200-1500 bridge candidate from the road sample). All positions are
 * canonical EPSG:6674 survey coordinates obtained from the Liner core geometry
 * engine + the vertical profile; no CRS conversion is re-implemented here.
 *
 * The bridge crosses the Nagara river corridor that the road sample documents.
 * Ground elevations come from the (representative) terrain heightfield so the
 * piers are sized from the real-ish valley floor.
 */

import type { LinearAlignment } from "../../liner/core/types";
import type { VerticalElement } from "../../liner/core/geometry/vertical";
import { evaluateAlignmentAtDistance } from "../../liner/core/geometry/horizontal";
import { elevationAt } from "./roadAdapter";
import { rightNormal } from "../../terrain/coordinate/renderAdapter";
import type {
  BearingLayerData,
  OrientedBox3D,
  Point3D,
  SubstructureLayerData,
  SubstructureSupport3D,
  SuperstructureLayerData,
} from "../layers/layerContract";

export interface RealBridgeCandidateInput {
  readonly roadAlignment: LinearAlignment;
  readonly vertical?: readonly VerticalElement[] | null;
  readonly candidate?: {
    readonly startStation: number;
    readonly endStation: number;
    readonly nominalSpanM: number;
  } | null;
  /** Deck slab width (m). Defaults to 12.0 (2 lanes + shoulders + overhang). */
  readonly deckWidth?: number;
  /** Full carriageway width used by the road surface strip (m). */
  readonly roadWidth?: number;
  /** Ground elevation sampler (canonical x/y -> z). Used to size the piers. */
  readonly terrainHeight?: ((x: number, y: number) => number) | null;
}

export interface BridgeLayerBundle {
  readonly bridgeId: string;
  readonly supports: readonly { readonly station: number; readonly point: Point3D; readonly supportId: string; readonly kind: "abutment" | "pier"; readonly deckElevation: number }[];
  readonly superstructure: SuperstructureLayerData;
  readonly bearings: BearingLayerData;
  readonly substructure: SubstructureLayerData;
}

export const RB001_BRIDGE_ID = "RB001-BRIDGE-1";
export const RB001_DECK_WIDTH = 12.0;
export const RB001_GIRDER_OFFSET = 4.5;

const GIRDER_CENTER_DROP = 0.7;
const GIRDER_HEIGHT = 1.6;
const DECK_HALF_THICKNESS = 0.25;
const DECK_HEIGHT = 0.5;
const BEARING_DROP = 1.6;
const COLUMN_TOP_DROP = 1.8;
const CAP_SIZE_Z = 2.0;
const FOUNDATION_SIZE_Z = 3.0;

/**
 * Derive the bridge supports for the RB001 bridge candidate: a 5-span
 * continuous girder (A1 + P1..P4 + A2) at nominal 50 m spans, placed inside
 * the STA.1200-1500 candidate (east 50 m = approach road).
 */
export function deriveBridgeSupports(
  candidate: { readonly startStation: number; readonly endStation: number; readonly nominalSpanM: number },
  options?: { readonly spanCount?: number },
): readonly { readonly station: number; readonly supportId: string; readonly kind: "abutment" | "pier" }[] {
  const nominalSpan = Math.max(candidate.nominalSpanM, 1);
  const requested = Math.max(1, options?.spanCount ?? 5);
  // keep the last support inside the candidate interval
  const spanCount = Math.min(
    requested,
    Math.max(1, Math.floor((candidate.endStation - candidate.startStation) / nominalSpan)),
  );
  const supports: { station: number; supportId: string; kind: "abutment" | "pier" }[] = [];
  for (let i = 0; i <= spanCount; i += 1) {
    const station = candidate.startStation + i * nominalSpan;
    const isAbutment = i === 0 || i === spanCount;
    supports.push({
      station,
      supportId: isAbutment ? (i === 0 ? "A1" : "A2") : `P${i}`,
      kind: isAbutment ? "abutment" : "pier",
    });
  }
  return supports;
}

function chordAzimuthDeg(a: Point3D, b: Point3D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

function chordLength(a: Point3D, b: Point3D): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Build the bridge layers from a real RB001 bridge candidate input. */
export function bridgeCandidateToLayers(input: RealBridgeCandidateInput): BridgeLayerBundle {
  const candidate = input.candidate ?? {
    startStation: 1200,
    endStation: 1500,
    nominalSpanM: 50,
  };
  const vertical = input.vertical ?? [];
  const deckWidth = input.deckWidth ?? RB001_DECK_WIDTH;
  const supportSpecs = deriveBridgeSupports(candidate);

  const points: Point3D[] = supportSpecs.map((spec) => {
    const evaluation = evaluateAlignmentAtDistance(input.roadAlignment, spec.station);
    return { x: evaluation.point.x, y: evaluation.point.y, z: elevationAt(spec.station, vertical) };
  });

  const supports = supportSpecs.map((spec, i) => ({
    station: spec.station,
    supportId: spec.supportId,
    kind: spec.kind,
    deckElevation: points[i].z,
    point: points[i],
  }));

  const a1 = points[0];
  const a2 = points[points.length - 1];
  const azimuthDeg = chordAzimuthDeg(a1, a2);
  const spanLength = chordLength(a1, a2);
  const center = { x: (a1.x + a2.x) / 2, y: (a1.y + a2.y) / 2, z: (a1.z + a2.z) / 2 };

  // Perpendicular offset direction (local transverse, canonical X/Y).
  const normal = rightNormal(azimuthDeg);

  const girders: OrientedBox3D[] = [RB001_GIRDER_OFFSET, -RB001_GIRDER_OFFSET].map((offset) => ({
    id: `girder-${offset >= 0 ? "r" : "l"}`,
    center: {
      x: center.x + normal.x * offset,
      y: center.y + normal.y * offset,
      z: center.z - GIRDER_CENTER_DROP,
    },
    size: { x: spanLength, y: 0.9, z: GIRDER_HEIGHT },
    yawDeg: azimuthDeg,
    color: "#6d7680",
  }));

  const deck: OrientedBox3D = {
    id: "deck",
    center: { x: center.x, y: center.y, z: center.z - DECK_HALF_THICKNESS },
    size: { x: spanLength, y: deckWidth, z: DECK_HEIGHT },
    yawDeg: azimuthDeg,
    color: "#9aa0a6",
  };

  const crossBeams: OrientedBox3D[] = [];
  const beamSpacing = 25;
  const beamCount = Math.max(1, Math.floor(spanLength / beamSpacing));
  for (let i = 0; i <= beamCount; i += 1) {
    const fraction = beamCount === 0 ? 0 : i / beamCount;
    const bx = a1.x + (a2.x - a1.x) * fraction;
    const by = a1.y + (a2.y - a1.y) * fraction;
    const bz = a1.z + (a2.z - a1.z) * fraction;
    crossBeams.push({
      id: `crossbeam-${i}`,
      center: { x: bx, y: by, z: bz - 1.1 },
      size: { x: 0.6, y: deckWidth - 1.4, z: 1.2 },
      yawDeg: azimuthDeg,
      color: "#7b8590",
    });
  }

  const superstructure: SuperstructureLayerData = { kind: "superstructure", girders, deck, crossBeams };

  const bearings: BearingLayerData = {
    kind: "bearing",
    bearings: supports.flatMap((s) =>
      [RB001_GIRDER_OFFSET, -RB001_GIRDER_OFFSET].map((offset) => ({
        id: `bearing-${s.supportId}-${offset >= 0 ? "r" : "l"}`,
        center: {
          x: s.point.x + normal.x * offset,
          y: s.point.y + normal.y * offset,
          z: s.deckElevation - BEARING_DROP,
        },
        size: { x: 0.8, y: 1.0, z: 0.5 },
        yawDeg: azimuthDeg,
        color: "#4a4a4a",
      })),
    ),
  };

  const substructure: SubstructureLayerData = {
    kind: "substructure",
    supports: supports.map((s): SubstructureSupport3D => {
      const ground = input.terrainHeight
        ? input.terrainHeight(s.point.x, s.point.y)
        : s.deckElevation - 12;
      const columnTop = s.deckElevation - COLUMN_TOP_DROP;
      const columnHeight = Math.max(columnTop - ground, 1);
      const isAbutment = s.kind === "abutment";

      const column: OrientedBox3D = {
        id: `${s.supportId}-column`,
        center: { x: s.point.x, y: s.point.y, z: (ground + columnTop) / 2 },
        size: { x: isAbutment ? 2.6 : 2.4, y: isAbutment ? 8.6 : 6.0, z: columnHeight },
        color: isAbutment ? "#a89f93" : "#b8b1a5",
      };
      const cap: OrientedBox3D = {
        id: `${s.supportId}-cap`,
        center: { x: s.point.x, y: s.point.y, z: columnTop - CAP_SIZE_Z / 2 },
        size: { x: 2.6, y: isAbutment ? 8.6 : 6.4, z: CAP_SIZE_Z },
        color: "#b8b1a5",
      };
      const foundation: OrientedBox3D = {
        id: `${s.supportId}-foundation`,
        center: { x: s.point.x, y: s.point.y, z: ground - FOUNDATION_SIZE_Z / 2 },
        size: { x: 6.5, y: isAbutment ? 9 : 7, z: FOUNDATION_SIZE_Z },
        color: "#8d8578",
      };

      return {
        id: `sub-${s.supportId}`,
        supportId: s.supportId,
        kind: s.kind,
        column,
        cap,
        foundation,
      };
    }),
  };

  return {
    bridgeId: RB001_BRIDGE_ID,
    supports,
    superstructure,
    bearings,
    substructure,
  };
}