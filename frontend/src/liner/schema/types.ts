import type { LinerTraceEntry } from "../mapper/frameModelMapper";
import type { BuildIntermediateInput } from "../core/pipeline/pipeline";

export const PROJECT_LINER_METADATA_SCHEMA_VERSION = "0.1.0" as const;

export type PersistedLinerTraceEntry = LinerTraceEntry;

export type ProjectLinerSourceRef = {
  alignmentId?: string;
  gridDefinitionId?: string;
};

export type ProjectLinerMetadata = {
  schemaVersion: typeof PROJECT_LINER_METADATA_SCHEMA_VERSION;
  sourceRevision: string;
  linerModelId: string;
  coordinatePolicyId: string;
  intermediateSchemaVersion: "0.2.0";
  generatedAt?: string;
  source?: ProjectLinerSourceRef;
  draft?: BuildIntermediateInput;
};

export type ProjectLinerExtension = {
  liner?: ProjectLinerMetadata;
  linerTrace?: PersistedLinerTraceEntry[];
};

export type ProjectLinerValidationDiagnostic = {
  level: "error";
  code: "LINER_SCHEMA_INVALID";
  path: string;
  message: string;
};
