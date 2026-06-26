import type { CanonicalLinerIntermediateResult } from "../core/types";
import type { FrameMappingResult } from "../mapper/frameModelMapper";
import {
  PROJECT_LINER_METADATA_SCHEMA_VERSION,
  type PersistedLinerTraceEntry,
  type ProjectLinerMetadata,
  type ProjectLinerExtension,
} from "./types";

type ProjectLike = Record<string, unknown>;

function resolveLinerSource(
  intermediate: CanonicalLinerIntermediateResult,
): ProjectLinerMetadata["source"] | undefined {
  const firstPoint = intermediate.grid.points[0];
  if (!firstPoint) {
    return undefined;
  }

  const alignmentId = firstPoint.source.alignmentId;
  const gridDefinitionId = firstPoint.gridDefinitionId;
  if (!alignmentId && !gridDefinitionId) {
    return undefined;
  }

  return {
    ...(alignmentId ? { alignmentId } : {}),
    ...(gridDefinitionId ? { gridDefinitionId } : {}),
  };
}

export function createLinerProjectExtension(
  intermediate: CanonicalLinerIntermediateResult,
  mappingResult: Pick<FrameMappingResult, "linerTrace">,
  options?: { generatedAt?: string },
): Required<ProjectLinerExtension> {
  const source = resolveLinerSource(intermediate);

  return {
    liner: {
      schemaVersion: PROJECT_LINER_METADATA_SCHEMA_VERSION,
      sourceRevision: intermediate.sourceRevision,
      linerModelId: intermediate.linerModelId,
      coordinatePolicyId: intermediate.coordinatePolicyId,
      intermediateSchemaVersion: intermediate.schemaVersion,
      generatedAt: options?.generatedAt ?? intermediate.computedAt,
      ...(source ? { source } : {}),
    },
    linerTrace: mappingResult.linerTrace.map(
      (entry): PersistedLinerTraceEntry => ({ ...entry }),
    ),
  };
}

export function attachLinerMappingToProject<T extends ProjectLike>(
  project: T,
  intermediate: CanonicalLinerIntermediateResult,
  mappingResult: FrameMappingResult,
  options?: { generatedAt?: string },
): T & Required<ProjectLinerExtension> {
  return {
    ...project,
    ...createLinerProjectExtension(intermediate, mappingResult, options),
  };
}
