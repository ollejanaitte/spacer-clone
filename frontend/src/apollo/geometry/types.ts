/**
 * Geometry Core — GeometrySnapshot contract types (Phase 6-1A).
 *
 * Frozen boundary: Common Bridge Data Model (Phase 5) -> Geometry Input Adapter ->
 * Apollo Geometry Engine -> GeometrySnapshot. Downstream systems (Structural / 3D /
 * Drawing / Substructure / Export) read GeometrySnapshot only and never recompute
 * station->XYZ, offset->XYZ, skew, crossfall, or elevation.
 *
 * Conventions (Phase 5 coordinate_axis_contract.md + Phase 6-0 coordinates/*):
 *  - right-handed Cartesian; bridge-local x = longitudinal (station direction),
 *    y = transverse (right-positive looking down-station), z = vertical up
 *  - global XYZ right-handed, +Z up
 *  - lengths in metres (m); angles in radians (rad), source deg preserved
 *  - offset positive to the right; crossfall right-down-positive
 *  - all coordinate values are finite numbers (no NaN / Infinity)
 */

/** Right-handed axis triple; units metres. */
export type Vec3 = { x: number; y: number; z: number };

/** Local right-handed frame at a point (LINER LocalFrame convention). */
export type LocalFrame3 = {
  tangent: Vec3;
  normal: Vec3;
  binormal: Vec3;
};

/** Value resolution state carried from the Common Bridge Data Model. */
export type GeometryValueState =
  | "CONFIRMED"
  | "HUMAN_CONFIRMATION_REQUIRED"
  | "CONFLICT"
  | "HOLD_INSUFFICIENT_SOURCE"
  | "NOT_AVAILABLE";

/** A value plus its resolution state and traceability. */
export type ResolvedValue<T> = {
  state: GeometryValueState;
  value?: T;
  unit?: string;
  goldenId?: string;
  sourceRefs?: string[];
  humanConfirmationId?: string;
  conflictId?: string;
  candidates?: T[];
  stateReason?: string;
};

/** Frozen coordinate-system context recorded in every snapshot. */
export type CoordinateSystem = {
  handedness: "right";
  lengthUnit: "m";
  angleUnit: "rad";
  verticalAxis: "z";
  globalOrigin: Vec3;
  axisOrder: ["x", "y", "z"];
  axisDirections: Vec3;
  source: string;
};

export type AlignmentReference = {
  id: string;
  alignmentId: string;
  bridgeLengthM: ResolvedValue<number>;
  spanLengthsM: ResolvedValue<number[]>;
  azimuth0Rad?: ResolvedValue<number>;
  refs?: ResolvedValue<unknown>;
};

export type SupportLine = {
  id: string;
  supportId: string;
  stationM: ResolvedValue<number>;
  skewRad: ResolvedValue<number>;
  transverseAxis: Vec3;
  elevationM: ResolvedValue<number>;
};

export type SupportPoint = {
  id: string;
  supportId: string;
  girderId: string;
  stationM: number;
  offsetM: number;
  position: Vec3;
  localFrame: LocalFrame3;
};

export type GirderStationPoint = {
  id: string;
  girderId: string;
  stationM: number;
  offsetM: number;
  position: Vec3;
  azimuthRad: number;
  localFrame: LocalFrame3;
};

export type GirderLine = {
  id: string;
  girderId: string;
  offsetM: ResolvedValue<number>;
  stationStartM: number;
  stationEndM: number;
  points: GirderStationPoint[];
};

export type GridPoint = {
  id: string;
  gridPointId: string;
  stationM: number;
  offsetM: number;
  position: Vec3;
  localFrame: LocalFrame3;
  state: GeometryValueState;
  stateReason?: string;
};

/**
 * Panel point on a girder line (Phase 6-2). Extends GridPoint with panel
 * structure. Endpoint panel points carry CONFIRMED station/offset/position;
 * intermediate panel points whose coordinates were not extracted (RB-001
 * GRID-1002..1026 / 2002..2026) are `HOLD_INSUFFICIENT_SOURCE` and carry no
 * position (no interpolation, no fabrication).
 */
export type GridPanelPoint = {
  id: string;
  gridPointId: string;
  girderId: string;
  /** 1-based panel index along the girder line. */
  panelIndex: number;
  role: "endpoint" | "intermediate";
  stationM?: number;
  offsetM?: number;
  position?: Vec3;
  localFrame?: LocalFrame3;
  state: GeometryValueState;
  stateReason?: string;
};

/** Declared panel structure for one girder line (plane-grid coordinates). */
export type GridPanelSpec = {
  girderId: string;
  /** Number of panel points along the girder line (RB-001: 27). */
  panelCount: number;
  startGridId: string;
  endGridId: string;
  /** Golden plane-grid coordinates of the endpoint panel points. */
  planeStart?: { x: number; y: number };
  planeEnd?: { x: number; y: number };
};

export type CrossSectionFrame = {
  id: string;
  sectionId: string;
  stationM: number;
  position: Vec3;
  localFrame: LocalFrame3;
  skewRad: number;
  transverseAxis: Vec3;
  elevationM: number;
};

export type DeckReference = {
  id: string;
  deckId: string;
  widthM: ResolvedValue<number>;
  thicknessM: ResolvedValue<number>;
  /** Deck edge offsets from the alignment centerline (m; right-positive). */
  edgeOffsetM?: { left: number; right: number };
  /** Deck reference elevation (m). */
  elevationM?: ResolvedValue<number>;
  /** Plan boundary corners in snapshot global coordinates (m). */
  boundary?: Vec3[];
};

/** Declared deck reference input (golden-derived dimensions). */
export type DeckSpec = {
  deckId: string;
  widthM: number;
  /** Optional deck thickness (m); absent when not declared in the shared model. */
  thicknessM?: number;
  /** Optional deck reference elevation (m). */
  elevationM?: number;
  /** Override centered deck edge offsets. */
  edgeOffsetM?: { left: number; right: number };
};

export type BearingPoint = {
  id: string;
  supportId: string;
  girderId: string;
  position: Vec3;
  /** Bearing local frame (from the support point at the girder offset). */
  localFrame?: LocalFrame3;
};

export type MemberKind =
  | "mainGirder"
  | "crossBeam"
  | "swayBracing"
  | "lateralBracing"
  | "stiffener";

export type MemberPlacementReference = {
  id: string;
  memberId: string;
  kind: MemberKind;
  fromPointId: string;
  toPointId: string;
  localFrame: LocalFrame3;
};

export type CrossGirderReference = {
  id: string;
  crossGirderId: string;
  stationM: number;
  connectedGirderIds: string[];
};

/** Declared cross girder placement (station + connected girder ids). */
export type CrossGirderSpec = {
  crossGirderId: string;
  stationM: number;
  connectedGirderIds?: string[];
};

export type GeometryIssue = {
  id: string;
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
};

export type UnresolvedGeometry = {
  id: string;
  kind: "HCR" | "CONFLICT" | "HOLD" | "NOT_AVAILABLE";
  affectedEntityIds: string[];
  humanConfirmationId?: string;
  conflictId?: string;
  candidates?: unknown[];
  stateReason?: string;
};

export type TraceabilityLink = {
  entityId: string;
  goldenId?: string;
  sourceRefs?: string[];
  mappingId?: string;
};

/** The immutable, generated bridge-geometry authority (Phase 6-0 §5). */
export type GeometrySnapshot = {
  snapshotVersion: string;
  bridgeId: string;
  sourceModelVersion: string;
  coordinateSystem: CoordinateSystem;
  alignmentReferences: AlignmentReference[];
  supportLines: SupportLine[];
  supportPoints: SupportPoint[];
  girderLines: GirderLine[];
  gridPoints: GridPanelPoint[];
  crossSectionFrames: CrossSectionFrame[];
  deckReferences: DeckReference[];
  bearingPoints: BearingPoint[];
  memberPlacementReferences: MemberPlacementReference[];
  crossGirderReferences: CrossGirderReference[];
  geometryIssues: GeometryIssue[];
  unresolvedGeometry: UnresolvedGeometry[];
  traceability: TraceabilityLink[];
  fingerprint: string;
};

export const GEOMETRY_SNAPSHOT_VERSION = "6.1.0";
