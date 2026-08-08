/**
 * Geometry Engine — Single Source of Bridge Geometry (Phase 6-1E).
 *
 * Assembles a `GeometrySnapshot` from the `GeometryEngineInput` (output of the
 * Geometry Input Adapter) plus the LINER road-alignment input (via the Alignment
 * Connector). This engine owns support/girder placement, cross-section frames and
 * grid-point assembly; all alignment coordinates come from LINER.
 *
 * The snapshot is derived and immutable per generation and carries a deterministic
 * fingerprint for parity / reload checks.
 */

import { type Coordinate3dInput } from "../../liner/core/coordinate3d";
import { LinerAlignmentConnector } from "./alignmentConnector";
import {
  type AlignmentConnector,
  type GeometryEngine,
  type GeometryEngineInput,
} from "./contracts";
import { buildCrossSectionFrames } from "./crossSectionFrame";
import { buildDeckReference } from "./deck";
import { generateGridPanelPoints } from "./gridPoints";
import { buildCrossGirderReferences, buildMainGirderMembers } from "./members";
import { placeGirderLines, placeSupportLines, type SupportRole } from "./placement";
import { rb001PlaneGridTransform } from "./planeGridTransform";
import type {
  AlignmentReference,
  BearingPoint,
  CrossSectionFrame,
  DeckReference,
  GeometrySnapshot,
  GirderLine,
  GirderStationPoint,
  GridPanelPoint,
  SupportLine,
  SupportPoint,
  TraceabilityLink,
} from "./types";
import { GEOMETRY_SNAPSHOT_VERSION } from "./types";

const DEFAULT_SECTION_ID = "SECTION-DECK";

/** Deterministic FNV-1a 32-bit hash over the canonical snapshot body. */
function fnv1a32(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function sortedJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(sortedJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${sortedJson(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export class DefaultGeometryEngine implements GeometryEngine {
  private readonly connector: AlignmentConnector;

  constructor(
    alignmentInput: Coordinate3dInput,
    private readonly alignmentId = "ALN-ACL",
  ) {
    this.connector = new LinerAlignmentConnector(alignmentInput);
  }

  generateSnapshot(input: GeometryEngineInput): GeometrySnapshot {
    const bridgeLengthM = input.bridgeLengthM ?? 0;
    const spanLengthsM = input.spanLengthsM ?? [];
    const girderOffsetsM = input.girderOffsetsM ?? {};

    const roles: SupportRole[] = input.supports.map((_, i) =>
      i === 0 || i === input.supports.length - 1 ? "abutment" : "pier",
    );
    const { supportLines, supportPoints } = placeSupportLines(
      {
        supports: input.supports.map((s, i) => ({ id: s.id, role: roles[i] })),
        spanLengthsM,
        bridgeLengthM,
        girderIds: input.girders.map((g) => g.id),
        alignmentId: this.alignmentId,
      },
      this.connector,
      girderOffsetsM,
    );

    const girderLines = placeGirderLines(
      {
        girders: input.girders.map((g) => ({
          id: g.id,
          offsetStartM: girderOffsetsM[g.id],
          offsetEndM: girderOffsetsM[`${g.id}:end`],
        })),
        stationStartM: 0,
        stationEndM: bridgeLengthM,
        alignmentId: this.alignmentId,
      },
      this.connector,
    );

    const gridPoints = assembleGridPoints(
      girderLines,
      input.gridPointIds,
      input.gridPanelSpecs,
      this.connector,
      this.alignmentId,
    );
    const sectionId = input.sectionIds[0] ?? DEFAULT_SECTION_ID;
    const frameStations = [
      ...supportLines.map((line) => line.stationM.value ?? 0),
      ...(input.sectionStations ?? []),
    ].filter((s, i, arr) => Number.isFinite(s) && arr.indexOf(s) === i);
    frameStations.sort((a, b) => a - b);
    const crossSectionFrames = buildCrossSectionFrames(
      frameStations.map((stationM) => ({ sectionId, stationM })),
      this.connector,
      this.alignmentId,
    );
    const deckReferences = buildDeckReferences(
      input.deckSpecs,
      input.deckIds,
      bridgeLengthM,
      this.connector,
      this.alignmentId,
    );
    const bearingPoints = supportPoints.map<BearingPoint>((p) => ({
      id: `BRG-${p.supportId}-${p.girderId}`,
      supportId: p.supportId,
      girderId: p.girderId,
      position: p.position,
      localFrame: p.localFrame,
    }));
    const supportStationsM = supportLines.map((line) => line.stationM.value ?? 0);
    const memberPlacementReferences = buildMainGirderMembers({
      girderLines,
      supportStationsM,
      connector: this.connector,
      alignmentId: this.alignmentId,
    });
    const crossGirderReferences = input.crossGirderSpecs
      ? buildCrossGirderReferences(input.crossGirderSpecs, input.girders.map((g) => g.id))
      : [];
    const alignmentReferences = buildAlignmentReferences(input, bridgeLengthM, spanLengthsM);
    const unresolvedGeometry = input.unresolved.map((u) => ({
      id: u.id,
      kind: u.kind,
      affectedEntityIds: u.affectedEntityIds,
    }));
    const traceability = buildTraceability({
      input,
      supportLines,
      girderLines,
      gridPoints,
    });

    const snapshot: GeometrySnapshot = {
      snapshotVersion: GEOMETRY_SNAPSHOT_VERSION,
      bridgeId: input.bridgeId,
      sourceModelVersion: input.sourceModelVersion,
      coordinateSystem: {
        handedness: "right",
        lengthUnit: "m",
        angleUnit: "rad",
        verticalAxis: "z",
        globalOrigin: { x: 0, y: 0, z: 0 },
        axisOrder: ["x", "y", "z"],
        axisDirections: { x: 1, y: 1, z: 1 },
        source: "LINER via Alignment Connector; bridge-local x-longitudinal y-transverse z-up",
      },
      alignmentReferences,
      supportLines,
      supportPoints,
      girderLines,
      gridPoints,
      crossSectionFrames,
      deckReferences,
      bearingPoints,
      memberPlacementReferences,
      crossGirderReferences,
      geometryIssues: [],
      unresolvedGeometry,
      traceability,
      fingerprint: "",
    };
    snapshot.fingerprint = computeFingerprint(snapshot);
    return snapshot;
  }
}

function assembleGridPoints(
  girderLines: GirderLine[],
  gridPointIds: string[],
  gridPanelSpecs: GeometryEngineInput["gridPanelSpecs"],
  connector: AlignmentConnector,
  alignmentId: string,
): GridPanelPoint[] {
  // Phase 6-2: full panel structure when declared.
  if (gridPanelSpecs && gridPanelSpecs.length > 0) {
    const transform = rb001PlaneGridTransform();
    const out: GridPanelPoint[] = [];
    for (const spec of gridPanelSpecs) {
      out.push(...generateGridPanelPoints(spec, connector, alignmentId, transform));
    }
    return out;
  }
  // Phase 6-1 fallback: girder-line endpoint grid points.
  const out: GridPanelPoint[] = [];
  const endpoints: { girderId: string; point: GirderStationPoint }[] = [];
  for (const line of girderLines) {
    for (const point of line.points) {
      endpoints.push({ girderId: line.girderId, point });
    }
  }
  endpoints.forEach(({ girderId, point }, index) => {
    out.push({
      id: `GP-${point.stationM}-${point.offsetM}`,
      gridPointId: gridPointIds[index] ?? `GRID-${index + 1}`,
      girderId,
      panelIndex: index + 1,
      role: "endpoint",
      stationM: point.stationM,
      offsetM: point.offsetM,
      position: point.position,
      localFrame: point.localFrame,
      state: "CONFIRMED",
    });
  });
  return out;
}

function buildDeckReferences(
  deckSpecs: GeometryEngineInput["deckSpecs"],
  deckIds: string[],
  bridgeLengthM: number,
  connector: AlignmentConnector,
  alignmentId: string,
): DeckReference[] {
  if (deckSpecs && deckSpecs.length > 0) {
    return deckSpecs.map((spec) =>
      buildDeckReference(
        {
          spec,
          stationStartM: 0,
          stationEndM: bridgeLengthM,
          alignmentId,
        },
        connector,
      ),
    );
  }
  return deckIds.map((deckId) => ({
    id: `DECK-REF-${deckId}`,
    deckId,
    widthM: { state: "CONFIRMED" as const },
    thicknessM: { state: "CONFIRMED" as const },
  }));
}

function buildAlignmentReferences(
  input: GeometryEngineInput,
  bridgeLengthM: number,
  spanLengthsM: number[],
): AlignmentReference[] {
  return input.alignmentIds.map((alignmentId) => ({
    id: `ALN-REF-${alignmentId}`,
    alignmentId,
    bridgeLengthM: { state: "CONFIRMED", value: bridgeLengthM, unit: "m" },
    spanLengthsM: { state: "CONFIRMED", value: spanLengthsM, unit: "m" },
  }));
}

function buildTraceability(args: {
  input: GeometryEngineInput;
  supportLines: SupportLine[];
  girderLines: GirderLine[];
  gridPoints: GridPanelPoint[];
}): TraceabilityLink[] {
  const links: TraceabilityLink[] = [];
  for (const a of args.input.alignmentIds) {
    links.push({ entityId: a, mappingId: "GM-001" });
  }
  for (const line of args.supportLines) {
    links.push({ entityId: line.supportId, mappingId: "GM-002" });
  }
  for (const line of args.girderLines) {
    links.push({ entityId: line.girderId, mappingId: "GM-006" });
  }
  for (const gp of args.gridPoints) {
    links.push({ entityId: gp.gridPointId, mappingId: "GM-008" });
  }
  for (const d of args.input.deckIds) {
    links.push({ entityId: d, mappingId: "GM-014" });
  }
  return links;
}

/** Deterministic fingerprint over the canonical snapshot body. */
export function computeFingerprint(snapshot: GeometrySnapshot): string {
  const body = {
    bridgeId: snapshot.bridgeId,
    sourceModelVersion: snapshot.sourceModelVersion,
    supportLines: snapshot.supportLines.map((l) => ({
      supportId: l.supportId,
      stationM: l.stationM.value,
      skewRad: l.skewRad.value,
    })),
    girderLines: snapshot.girderLines.map((l) => ({
      girderId: l.girderId,
      offsetM: l.offsetM.value,
      points: l.points.map((p) => [p.stationM, p.offsetM, p.position.x, p.position.y, p.position.z]),
    })),
    gridPoints: snapshot.gridPoints.map((g) => [
      g.gridPointId,
      g.role,
      g.state,
      g.stationM,
      g.offsetM,
    ]),
    crossSectionFrames: snapshot.crossSectionFrames.map((f) => [
      f.stationM,
      f.skewRad,
      f.elevationM,
    ]),
    unresolvedGeometry: snapshot.unresolvedGeometry.map((u) => [u.id, u.kind]),
  };
  return fnv1a32(sortedJson(body));
}

export type { CrossSectionFrame, DeckReference };
