import { z } from "zod";
import {
  FRAME_ANALYSIS_LOAD_CONTEXT_KINDS,
  FRAME_ANALYSIS_RESULT_KINDS,
  FRAME_ANALYSIS_RESULT_STATUSES,
} from "../../frameAnalysisResultResource";
import {
  FRAME_ANALYSIS_RESULT_RESOURCE_SCHEMA_ID,
  FRAME_ANALYSIS_RESULT_RESOURCE_SCHEMA_VERSION,
} from "../../contractVersionRegistry";
import { contractSchemaId, SHARED_CONTRACT_VERSION } from "../constants";
import { contentChecksumSchema } from "./contentChecksum";
import { provenanceSchema } from "./provenance";
import {
  finiteNumberSchema,
  iso8601UtcTimestampSchema,
  nonEmptyStringSchema,
  positiveIntegerSchema,
  semVerStringSchema,
  uuidStringSchema,
  validationSeveritySchema,
} from "./primitives";

export const frameAnalysisResultStatusSchema = z.enum(FRAME_ANALYSIS_RESULT_STATUSES);

export const frameAnalysisResultKindSchema = z.enum(FRAME_ANALYSIS_RESULT_KINDS);

export const frameAnalysisLoadContextKindSchema = z.enum(FRAME_ANALYSIS_LOAD_CONTEXT_KINDS);

export const frameAnalysisLoadContextEntrySchema = z.strictObject({
  kind: frameAnalysisLoadContextKindSchema,
  id: uuidStringSchema,
  label: nonEmptyStringSchema.optional(),
  checksum: contentChecksumSchema.optional(),
});

export const frameAnalysisLoadContextSchema = z.strictObject({
  entries: z.array(frameAnalysisLoadContextEntrySchema),
  requestChecksum: contentChecksumSchema.optional(),
});

export const frameAnalysisResultDiagnosticSchema = z.strictObject({
  code: nonEmptyStringSchema,
  severity: validationSeveritySchema,
  producer: nonEmptyStringSchema,
  message: nonEmptyStringSchema,
  path: z.string().regex(/^\//).optional(),
  entityKind: nonEmptyStringSchema.optional(),
  entityId: uuidStringSchema.optional(),
  resultKind: frameAnalysisResultKindSchema.optional(),
});

export const frameAnalysisResultRowSchema = z.strictObject({
  rowId: uuidStringSchema,
  entityKind: nonEmptyStringSchema,
  entityId: uuidStringSchema,
  loadContextId: uuidStringSchema.optional(),
  quantity: nonEmptyStringSchema,
  unit: nonEmptyStringSchema.optional(),
  values: z.record(nonEmptyStringSchema, finiteNumberSchema),
});

export const frameAnalysisResultPayloadEntrySchema = z.strictObject({
  schemaVersion: semVerStringSchema,
  rows: z.array(frameAnalysisResultRowSchema),
});

export const frameAnalysisResultPayloadCatalogSchema = z.strictObject({
  nodeDisplacement: frameAnalysisResultPayloadEntrySchema.optional(),
  supportReaction: frameAnalysisResultPayloadEntrySchema.optional(),
  memberForce: frameAnalysisResultPayloadEntrySchema.optional(),
  stress: frameAnalysisResultPayloadEntrySchema.optional(),
  modal: frameAnalysisResultPayloadEntrySchema.optional(),
  buckling: frameAnalysisResultPayloadEntrySchema.optional(),
  diagnostics: frameAnalysisResultPayloadEntrySchema.optional(),
  linearStatic: frameAnalysisResultPayloadEntrySchema.optional(),
  eigen: frameAnalysisResultPayloadEntrySchema.optional(),
  responseSpectrum: frameAnalysisResultPayloadEntrySchema.optional(),
  influenceLine: frameAnalysisResultPayloadEntrySchema.optional(),
  movingLoad: frameAnalysisResultPayloadEntrySchema.optional(),
  timeHistory: frameAnalysisResultPayloadEntrySchema.optional(),
});

export const frameAnalysisResultResourceSchema = z
  .strictObject({
    schemaId: z.literal(FRAME_ANALYSIS_RESULT_RESOURCE_SCHEMA_ID),
    schemaVersion: z.literal(FRAME_ANALYSIS_RESULT_RESOURCE_SCHEMA_VERSION),
    resultId: uuidStringSchema,
    analysisRunId: uuidStringSchema,
    sourceDocumentId: uuidStringSchema,
    sourceDocumentVersion: positiveIntegerSchema,
    sourceContentChecksum: contentChecksumSchema,
    status: frameAnalysisResultStatusSchema,
    generatedAt: iso8601UtcTimestampSchema,
    solverName: nonEmptyStringSchema,
    solverVersion: semVerStringSchema,
    analysisSettingsChecksum: contentChecksumSchema,
    loadContext: frameAnalysisLoadContextSchema,
    provenance: provenanceSchema,
    diagnostics: z.array(frameAnalysisResultDiagnosticSchema),
    payload: frameAnalysisResultPayloadCatalogSchema,
    transferPackageId: uuidStringSchema.optional(),
    transferRecordId: uuidStringSchema.optional(),
    modelRevision: nonEmptyStringSchema.optional(),
    resultChecksum: contentChecksumSchema.optional(),
    unitSystem: nonEmptyStringSchema.optional(),
    resultKinds: z.array(frameAnalysisResultKindSchema).optional(),
  })
  .meta({
    id: contractSchemaId("frame-analysis-result-resource"),
    title: "FrameAnalysisResultResource",
    contractVersion: SHARED_CONTRACT_VERSION,
  });

export type FrameAnalysisResultResourceValue = z.infer<typeof frameAnalysisResultResourceSchema>;
