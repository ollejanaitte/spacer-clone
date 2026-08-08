/**
 * Snapshot -> ApolloVisualizationModel (Phase 6-3, 3D Connector / CN-07).
 *
 * Builds a full `ApolloVisualizationModel` from a `GeometrySnapshot` so the
 * existing viewer renderer and STL/DXF export paths can consume snapshot-derived
 * geometry unchanged. No bridge geometry is recomputed here.
 */

import type { GeometrySnapshot } from "../geometry";
import {
  APOLLO_VISUALIZATION_CONTRACT_VERSION,
  APOLLO_VISUALIZATION_SCHEMA_VERSION,
  type ApolloVisualizationAssumption,
  type ApolloVisualizationModel,
  type ApolloVisualizationWarning,
} from "./types";
import {
  buildSnapshotSolidParameters,
  type Snapshot3dBuildOptions,
} from "./snapshot3d";

export type SnapshotVisualizationOptions = {
  bridgeName?: string;
  sourceRevision?: string | null;
  solidOptions?: Snapshot3dBuildOptions;
};

const ASSUMPTIONS: ApolloVisualizationAssumption[] = [
  {
    code: "snapshot-derived-geometry",
    message: "Solid positions and orientations come from GeometrySnapshot (LINER authority).",
  },
  {
    code: "declared-dimensions",
    message: "Section dimensions use golden-derived values where available; other values are declared display defaults.",
  },
];

/**
 * Build an `ApolloVisualizationModel` whose solids are derived from the snapshot.
 * Line elements are empty (solids-only model); display/export uses solids.
 */
export function buildSnapshotVisualizationModel(
  snapshot: GeometrySnapshot,
  options: SnapshotVisualizationOptions = {},
): ApolloVisualizationModel {
  const solidGeometryParameters = buildSnapshotSolidParameters(snapshot, options.solidOptions);
  const warnings: ApolloVisualizationWarning[] = solidGeometryParameters.length === 0
    ? [{ code: "empty-model", severity: "warning", message: "Snapshot produced no exportable solids." }]
    : [];

  return {
    schemaVersion: APOLLO_VISUALIZATION_SCHEMA_VERSION,
    contractVersion: APOLLO_VISUALIZATION_CONTRACT_VERSION,
    sourceRevision: options.sourceRevision ?? null,
    sourceProjectId: snapshot.bridgeId,
    sourceProjectName: options.bridgeName ?? snapshot.bridgeId,
    sourceSchemaVersion: snapshot.sourceModelVersion,
    units: { sourceLength: "m", displayLength: "m", exportLength: "mm" },
    coordinateSystem: {
      axisConvention: "x-longitudinal-y-transverse-z-up",
      originPolicy: "model-space",
    },
    warnings,
    assumptions: ASSUMPTIONS,
    elements: [],
    commonGeometryParameters: [],
    solidGeometryParameters,
  };
}
