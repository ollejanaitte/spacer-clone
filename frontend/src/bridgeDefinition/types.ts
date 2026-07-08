/**
 * BridgeDefinition — canonical intermediate structural design intent.
 *
 * This layer captures upstream design semantics (spans, supports, girders, loads)
 * before discrete FEM nodes/members. It is **not** a direct FEM model and must not
 * be confused with `ProjectModel` / `StructuralModel`.
 *
 * @see docs/liner/phase4.5/bridge_definition_design.md
 */

export const BRIDGE_DEFINITION_SCHEMA_VERSION_LITERAL = "1.0.0" as const;

export type BridgeDefinitionSchemaVersion =
  typeof BRIDGE_DEFINITION_SCHEMA_VERSION_LITERAL;

/** Provenance of a BridgeDefinition instance (entry-path agnostic). */
export type BridgeDefinitionSource =
  | {
      kind: "liner";
      linerModelId: string;
      importerBridgeId?: string;
    }
  | {
      kind: "bridgeProject";
      bridgeProjectId: string;
    }
  | { kind: "manual" }
  | {
      kind: "unknown";
      reason?: string;
    };

/** Coordinate frame policy for BridgeDefinition geometry (not FEM node coordinates). */
export type BridgeDefinitionCoordinatePolicy = {
  policyId: string;
  /** e.g. "global", "bridge-local", "span-local" */
  frame: "global" | "bridge-local" | "span-local";
  axisConvention?: "x-longitudinal-y-transverse-z-up";
  /** Optional sign overrides per axis, e.g. { x: 1, y: -1, z: 1 } */
  sign?: {
    x?: 1 | -1;
    y?: 1 | -1;
    z?: 1 | -1;
  };
  units?: {
    length: "m";
    angle?: "deg" | "rad";
  };
};

/** Reference to an upstream alignment used for stationing. */
export type BridgeDefinitionAlignmentRef = {
  alignmentId: string;
  originStation: number;
  totalLength: number;
};

/** Station along bridge axis — supports No.測点 labels and cumulative distance. */
export type BridgeDefinitionStation = {
  id: string;
  /** Bridge-axis station value (metres). */
  station: number;
  /** Human-readable station label, e.g. "No.1+250.00". */
  label?: string;
  /** Cumulative distance from bridge origin when distinct from `station`. */
  cumulativeDistance?: number;
  role?: "origin" | "pier" | "expansion" | "custom";
};

export type BridgeDefinitionSpan = {
  id: string;
  index: number;
  startStation: number;
  endStation: number;
  length: number;
  girderLineSetId?: string;
};

export type BridgeDefinitionSupport = {
  id: string;
  station: number;
  kind: "fixed" | "pinned" | "roller" | "custom";
  substructureKind?: "abutment" | "pier" | "virtual_pier";
  skewAngleDeg?: number;
  /** Transverse position hints for future multi-support rows. */
  transversePosition?: "centre" | "edge" | number;
};

export type BridgeDefinitionSuperstructureKind =
  | "slab_girder_grid"
  | "box_girder"
  | "plate_girder"
  | "pc_girder"
  | "custom";

/** Upper structure form — design intent, not discretized members. */
export type BridgeDefinitionSuperstructure = {
  kind: BridgeDefinitionSuperstructureKind;
  /** Extensible payload per superstructure kind. */
  params?: Record<string, unknown>;
};

export type BridgeDefinitionGirder = {
  id: string;
  label: string;
  role: "main" | "edge" | "barrier" | "custom";
  /** Transverse offset from alignment centre, metres. */
  offset: number;
  spanIds: string[];
  sectionRefId?: string;
  materialRefId?: string;
};

export type BridgeDefinitionCrossBeam = {
  id: string;
  station: number;
  girderIds?: string[];
  sectionRefId?: string;
};

export type BridgeDefinitionBearing = {
  id: string;
  supportId: string;
  type: "elastomeric" | "pot" | "fixed" | "custom";
};

export type BridgeDefinitionDeck = {
  id: string;
  width: number;
  thickness?: number;
  kind?: "steel_composite" | "rc" | "orthotropic";
};

export type BridgeDefinitionLoadTarget =
  | { kind: "girder"; refId: string }
  | { kind: "deck"; refId: string }
  | { kind: "node"; refId: string }
  | { kind: "line"; refId: string };

export type BridgeDefinitionLoad = {
  id: string;
  caseId: string;
  type: "self_weight" | "distributed" | "vehicle" | "temperature";
  magnitude: number;
  direction: "X" | "Y" | "Z" | "-X" | "-Y" | "-Z";
  target: BridgeDefinitionLoadTarget;
  impactFactor?: number;
};

export type BridgeDefinitionGenerationSettings = {
  meshDivision: number;
  meshDensity: "coarse" | "standard" | "fine";
  girderSpacingOverride?: number;
  defaultMaterialId?: string;
  defaultSectionId?: string;
  /** Feature flag: use legacy direct generator path when true. */
  useLegacyFemPath?: boolean;
};

export type BridgeDefinitionMetadata = {
  createdAt?: string;
  updatedAt?: string;
  notes?: string;
};

/**
 * Canonical intermediate structural design intent shared by LINER and Bridge Wizard paths.
 *
 * Upstream of FEM: describes what the designer intends (geometry references, spans,
 * members layout rules, loads). Downstream generators produce discrete StructuralModel /
 * project.json — this type must not embed nodes, members, or support constraints directly.
 */
export interface BridgeDefinition {
  schemaVersion: BridgeDefinitionSchemaVersion;
  id: string;
  name: string;
  source: BridgeDefinitionSource;
  coordinatePolicy: BridgeDefinitionCoordinatePolicy;
  alignmentRefs: BridgeDefinitionAlignmentRef[];
  stations: BridgeDefinitionStation[];
  spans: BridgeDefinitionSpan[];
  supports: BridgeDefinitionSupport[];
  superstructure: BridgeDefinitionSuperstructure;
  girders: BridgeDefinitionGirder[];
  crossBeams: BridgeDefinitionCrossBeam[];
  bearings: BridgeDefinitionBearing[];
  deck: BridgeDefinitionDeck;
  loads: BridgeDefinitionLoad[];
  generationSettings: BridgeDefinitionGenerationSettings;
  metadata: BridgeDefinitionMetadata;
}
