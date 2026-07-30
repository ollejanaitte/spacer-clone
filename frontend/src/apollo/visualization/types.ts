import type { ApolloPhase1Unit2Draft, ProjectModel } from "../../types";

export const APOLLO_VISUALIZATION_SCHEMA_VERSION = "1.0.0" as const;
export const APOLLO_VISUALIZATION_CONTRACT_VERSION = "1.0.0" as const;

export type ApolloVisualizationLengthUnit = "m" | "mm";
export type ApolloVisualizationAxisConvention = "x-longitudinal-y-transverse-z-up";
export type ApolloVisualizationOriginPolicy = "model-space";
export type ApolloVisualizationWarningSeverity = "info" | "warning" | "error";
export type ApolloVisualizationWarningClassification =
  | "empty-model"
  | "duplicate-id"
  | "missing-node-reference"
  | "zero-length-member"
  | "non-finite-coordinate"
  | "invalid-support-reference"
  | "missing-bridge-geometry"
  | "invalid-solid-dimension";

export type ApolloVisualizationEntityKind = "node" | "member" | "support";
export type ApolloVisualizationElementKind =
  | "node"
  | "member"
  | "support"
  | "node-label"
  | "member-label";

export type ApolloVisualizationGeometryType = "point" | "line" | "label-anchor";
export type ApolloVisualizationVisibilityGroup =
  | "nodes"
  | "members"
  | "supports"
  | "labels"
  | "girders"
  | "cross-beams"
  | "bracings"
  | "deck"
  | "bearings"
  | "markers"
  | "bridge-solids"
  | "validation"
  | "export-only";

export type ApolloVisualizationValidationState = "none" | "warning" | "error";

export type ApolloVisualizationUnits = {
  readonly sourceLength: ApolloVisualizationLengthUnit;
  readonly displayLength: "m";
  readonly exportLength: "mm";
};

export type ApolloVisualizationCoordinateSystem = {
  readonly axisConvention: ApolloVisualizationAxisConvention;
  readonly originPolicy: ApolloVisualizationOriginPolicy;
};

export type ApolloVisualizationWarning = {
  readonly code: ApolloVisualizationWarningClassification;
  readonly severity: ApolloVisualizationWarningSeverity;
  readonly message: string;
  readonly sourceEntityKind?: ApolloVisualizationEntityKind;
  readonly sourceEntityId?: string;
};

export type ApolloVisualizationAssumption = {
  readonly code: string;
  readonly message: string;
};

export type ApolloVisualizationPointGeometry = {
  readonly type: "point";
  readonly position: readonly [number, number, number];
};

export type ApolloVisualizationLineGeometry = {
  readonly type: "line";
  readonly start: readonly [number, number, number];
  readonly end: readonly [number, number, number];
};

export type ApolloVisualizationLabelAnchorGeometry = {
  readonly type: "label-anchor";
  readonly position: readonly [number, number, number];
  readonly text: string;
};

export type ApolloVisualizationGeometry =
  | ApolloVisualizationPointGeometry
  | ApolloVisualizationLineGeometry
  | ApolloVisualizationLabelAnchorGeometry;

export type ApolloVisualizationCommonGeometryParameter = {
  readonly id: string;
  readonly sourceEntityKind: ApolloVisualizationEntityKind;
  readonly sourceEntityId: string;
  readonly geometryType: ApolloVisualizationGeometryType;
  readonly coordinatesM: Readonly<Record<string, readonly number[]>>;
  readonly exportable: boolean;
  readonly visibilityGroup: ApolloVisualizationVisibilityGroup;
};

export type ApolloVisualizationElement = {
  readonly id: string;
  readonly elementKind: ApolloVisualizationElementKind;
  readonly sourceEntityKind: ApolloVisualizationEntityKind;
  readonly sourceEntityId: string;
  readonly selectionKey: string;
  readonly validationTargetKey: string;
  readonly displayLabel: string;
  readonly visibilityGroup: ApolloVisualizationVisibilityGroup;
  readonly exportable: boolean;
  readonly geometry: ApolloVisualizationGeometry;
  readonly commonGeometryParameterId?: string;
  readonly validationState: ApolloVisualizationValidationState;
};

export type ApolloBridgeGeometryDefaultsProvider = {
  readonly girder: {
    readonly shape: "simple_i" | "simple_box";
    readonly depthM: number;
    readonly flangeWidthM: number;
    readonly flangeThicknessM: number;
    readonly webThicknessM: number;
    readonly transverseOffsetsM?: readonly number[];
  };
  readonly crossBeam: {
    readonly depthM: number;
    readonly widthM: number;
    readonly stationFractions?: readonly number[];
  };
  readonly bracing: {
    readonly pattern: "x_single" | "single_diagonal" | "none";
    readonly diameterM: number;
  };
  readonly deck: {
    readonly thicknessM: number;
    readonly overhangM: number;
    readonly widthM?: number;
  };
  readonly bearing: {
    readonly widthM: number;
    readonly lengthM: number;
    readonly heightM: number;
  };
  readonly marker: {
    readonly widthM: number;
    readonly lengthM: number;
    readonly heightM: number;
  };
};

export type ApolloSolidGeometryParameter = {
  readonly id: string;
  readonly sourceEntityKind: ApolloVisualizationEntityKind;
  readonly sourceEntityId: string;
  readonly selectionKey: string;
  readonly validationTargetKey: string;
  readonly displayLabel: string;
  readonly kind:
    | "girder"
    | "cross_beam"
    | "bracing"
    | "deck"
    | "bearing"
    | "pier_marker"
    | "abutment_marker";
  readonly visibilityGroup: ApolloVisualizationVisibilityGroup;
  readonly exportable: boolean;
  readonly dimensionsM: Readonly<Record<string, number>>;
  readonly localFrame: {
    readonly origin: readonly [number, number, number];
    readonly xAxis: readonly [number, number, number];
    readonly yAxis: readonly [number, number, number];
    readonly zAxis: readonly [number, number, number];
  };
  readonly path?: readonly (readonly [number, number, number])[];
};

export type ApolloVisualizationModel = {
  readonly schemaVersion: typeof APOLLO_VISUALIZATION_SCHEMA_VERSION;
  readonly contractVersion: typeof APOLLO_VISUALIZATION_CONTRACT_VERSION;
  readonly sourceRevision: string | null;
  readonly sourceProjectId: string;
  readonly sourceProjectName: string;
  readonly sourceSchemaVersion: string;
  readonly units: ApolloVisualizationUnits;
  readonly coordinateSystem: ApolloVisualizationCoordinateSystem;
  readonly warnings: readonly ApolloVisualizationWarning[];
  readonly assumptions: readonly ApolloVisualizationAssumption[];
  readonly elements: readonly ApolloVisualizationElement[];
  readonly commonGeometryParameters: readonly ApolloVisualizationCommonGeometryParameter[];
  readonly solidGeometryParameters: readonly ApolloSolidGeometryParameter[];
};

export type ApolloVisualizationBuildInput = {
  readonly project: ProjectModel;
  readonly draft?: ApolloPhase1Unit2Draft | null;
  readonly defaultsProvider?: ApolloBridgeGeometryDefaultsProvider;
};

export type ApolloVisualizationBuildResult =
  | { readonly ok: true; readonly model: ApolloVisualizationModel }
  | {
      readonly ok: false;
      readonly diagnostics: readonly ApolloVisualizationWarning[];
    };

export const DEFAULT_APOLLO_BRIDGE_GEOMETRY_DEFAULTS: ApolloBridgeGeometryDefaultsProvider = {
  girder: {
    shape: "simple_i",
    depthM: 2.0,
    flangeWidthM: 0.55,
    flangeThicknessM: 0.03,
    webThicknessM: 0.02,
    transverseOffsetsM: [-4.5, -1.5, 1.5, 4.5],
  },
  crossBeam: {
    depthM: 0.8,
    widthM: 0.35,
    stationFractions: [0.25, 0.5, 0.75],
  },
  bracing: {
    pattern: "x_single",
    diameterM: 0.08,
  },
  deck: {
    thicknessM: 0.24,
    overhangM: 0.5,
    widthM: 10.0,
  },
  bearing: {
    widthM: 0.6,
    lengthM: 0.6,
    heightM: 0.12,
  },
  marker: {
    widthM: 1.5,
    lengthM: 1.5,
    heightM: 2.0,
  },
};
