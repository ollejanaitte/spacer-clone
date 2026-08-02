import type {
  ApolloVisualizationAssumption,
  ApolloVisualizationModel,
  ApolloVisualizationVisibilityGroup,
} from "../visualization";

export const APOLLO_STL_MANIFEST_SCHEMA_VERSION = "1.0.0" as const;

export type ApolloStlBoundingBoxMm = {
  readonly min: readonly [number, number, number];
  readonly max: readonly [number, number, number];
};

export type ApolloStlEntityCounts = {
  readonly total: number;
  readonly girders: number;
  readonly crossBeams: number;
  readonly bracings: number;
  readonly stiffeners: number;
  readonly deck: number;
  readonly bearings: number;
  readonly markers: number;
};

export type ApolloStlExportManifest = {
  readonly schemaVersion: typeof APOLLO_STL_MANIFEST_SCHEMA_VERSION;
  readonly exportKind: "apollo-3d-stl";
  readonly projectId: string;
  readonly projectName: string;
  readonly exportedAt: string;
  readonly sourceSchemaVersions: {
    readonly project: string;
    readonly visualizationContract: string;
  };
  readonly sourceRevision: string | null;
  readonly visualizationContractVersion: string;
  readonly axisConvention: ApolloVisualizationModel["coordinateSystem"]["axisConvention"];
  readonly sourceUnit: ApolloVisualizationModel["units"]["sourceLength"];
  readonly exportUnit: ApolloVisualizationModel["units"]["exportLength"];
  readonly originShiftMm: readonly [number, number, number];
  readonly includedGroups: readonly ApolloVisualizationVisibilityGroup[];
  readonly excludedGroups: readonly ApolloVisualizationVisibilityGroup[];
  readonly entityCounts: ApolloStlEntityCounts;
  readonly triangleCount: number;
  readonly boundingBoxMm: ApolloStlBoundingBoxMm;
  readonly assumptions: readonly ApolloVisualizationAssumption[];
  readonly warnings: readonly string[];
  readonly digest: string;
};
