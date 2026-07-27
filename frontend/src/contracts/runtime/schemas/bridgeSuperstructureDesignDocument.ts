import { z } from "zod";
import {
  BRIDGE_SUPERSTRUCTURE_DESIGN_DOCUMENT_SCHEMA_ID,
} from "../../contractVersionRegistry";
import { BRIDGE_SUPERSTRUCTURE_DESIGN_DOCUMENT_KIND } from "../../bridgeSuperstructureDesignDocument";
import { contractSchemaId, SHARED_CONTRACT_VERSION } from "../constants";
import { createCommonEnvelopeSchema } from "./commonEnvelope";
import { coordinateContextSchema } from "./coordinateContext";
import { documentReferenceSchema } from "./documentReference";
import { extensionsSchema } from "./extensions";
import { governedQuantitySchema } from "./governedQuantity";
import { nonEmptyStringSchema, uuidStringSchema } from "./primitives";
import { unitContextSchema } from "./unitContext";

const projectContextSchema = z.strictObject({
  projectId: uuidStringSchema,
  name: nonEmptyStringSchema,
  clientName: z.string().nullable().optional(),
  phaseTag: z.string().nullable().optional(),
});

const spanSchema = z.strictObject({
  spanId: uuidStringSchema,
  index: z.number().int().min(0),
  startSupportId: uuidStringSchema,
  endSupportId: uuidStringSchema,
  length: governedQuantitySchema,
});

const girderLineSchema = z.strictObject({
  girderLineId: uuidStringSchema,
  index: z.number().int().min(0),
  label: nonEmptyStringSchema,
  offsetFromCenterline: governedQuantitySchema,
  depthProfile: nonEmptyStringSchema,
  materialRefId: uuidStringSchema.nullable(),
  sectionIntentRefId: uuidStringSchema.nullable(),
});

const deckSchema = z.strictObject({
  deckId: uuidStringSchema,
  deckKind: z.literal("rc_non_composite"),
  width: governedQuantitySchema,
  thickness: governedQuantitySchema,
  unitWeight: governedQuantitySchema,
});

const supportSchema = z.strictObject({
  supportId: uuidStringSchema,
  station: governedQuantitySchema,
  fixity: nonEmptyStringSchema,
  role: nonEmptyStringSchema,
});

const bridgeSchema = z.strictObject({
  bridgeId: uuidStringSchema,
  name: nonEmptyStringSchema,
  spans: z.array(spanSchema).min(1),
  girderLines: z.array(girderLineSchema).min(1),
  deck: deckSchema,
  supports: z.array(supportSchema).min(1),
});

const materialDefinitionSchema = z.strictObject({
  materialId: uuidStringSchema,
  designation: nonEmptyStringSchema,
  yieldStrength: governedQuantitySchema,
  elasticModulus: governedQuantitySchema,
  unitWeight: governedQuantitySchema,
});

const loadTargetRefSchema = z.strictObject({
  kind: z.enum(["girderLine", "deck", "supportRegion"]),
  refId: uuidStringSchema,
});

const loadSchema = z.strictObject({
  loadId: uuidStringSchema,
  pattern: z.enum(["uniform", "point", "line", "unknown"]),
  magnitude: governedQuantitySchema,
  direction: z
    .enum(["+Z", "-Z", "+Y", "-Y", "+X", "-X"])
    .nullable()
    .optional(),
  targetRef: loadTargetRefSchema,
});

const loadCaseSchema = z.strictObject({
  loadCaseId: uuidStringSchema,
  name: nonEmptyStringSchema,
  kind: z.enum(["dead", "slab", "live", "other"]),
  loads: z.array(loadSchema),
});

const if3MetadataSchema = z.record(z.string(), z.unknown()).nullable();

const analysisBindingSchema = z.strictObject({
  bindingId: uuidStringSchema,
  analysisType: z.literal("static_linear"),
  bindingStatus: z.enum(["pending", "exported", "analyzed", "stale"]),
  sourceBsdDocumentRef: documentReferenceSchema,
  targetBfadDocumentRef: documentReferenceSchema.nullable(),
  resultResourceRef: documentReferenceSchema.nullable(),
  if3Metadata: if3MetadataSchema,
  exportAuthorityRef: documentReferenceSchema.nullable().optional(),
});

const phase1ScopeAssertionSchema = z.strictObject({
  alignmentClass: z.literal("straight"),
  skewAngleDeg: governedQuantitySchema,
  spanSystem: z.literal("simple"),
  superstructureKind: z.literal("plate_girder_rc_slab_non_composite"),
  analysisType: z.literal("static_linear"),
});

export const bridgeSuperstructureDesignDocumentSchema = createCommonEnvelopeSchema({
  fixedSchemaId: BRIDGE_SUPERSTRUCTURE_DESIGN_DOCUMENT_SCHEMA_ID,
  fixedDocumentKind: BRIDGE_SUPERSTRUCTURE_DESIGN_DOCUMENT_KIND,
})
  .extend({
    lifecycleStatus: z.enum([
      "DRAFT",
      "VALIDATED",
      "APPROVED",
      "SUPERSEDED",
      "STALE",
      "ARCHIVED",
    ]),
    coordinateContexts: z.array(coordinateContextSchema).min(1),
    unitContext: unitContextSchema,
    projectContext: projectContextSchema,
    bridge: bridgeSchema,
    materialDefinitions: z.array(materialDefinitionSchema),
    loadCases: z.array(loadCaseSchema),
    analysisBindings: z.array(analysisBindingSchema),
    roadImportProvenance: documentReferenceSchema.nullable().optional(),
    phase1ScopeAssertion: phase1ScopeAssertionSchema,
    validationStatus: z
      .enum(["unvalidated", "structurally_valid", "structurally_invalid", "blocked"])
      .optional(),
    exportAuthorityRef: documentReferenceSchema.nullable().optional(),
    extensions: extensionsSchema.optional(),
  })
  .meta({
    id: contractSchemaId("bridge-superstructure-design-document"),
    title: "BridgeSuperstructureDesignDocument",
    contractVersion: SHARED_CONTRACT_VERSION,
  });

export type BridgeSuperstructureDesignDocumentValue = z.infer<
  typeof bridgeSuperstructureDesignDocumentSchema
>;
