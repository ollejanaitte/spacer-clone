import { z } from "zod";
import {
  BRIDGE_SUPERSTRUCTURE_DESIGN_DOCUMENT_SCHEMA_ID,
} from "../../contractVersionRegistry";
import {
  BRIDGE_SUPERSTRUCTURE_DESIGN_DOCUMENT_KIND,
  DECK_ANCHORAGE_ROLES,
  DESIGN_ENTITY_DESIGN_STATUSES,
} from "../../bridgeSuperstructureDesignDocument";
import { contractSchemaId, SHARED_CONTRACT_VERSION } from "../constants";
import { createCommonEnvelopeSchema } from "./commonEnvelope";
import { coordinateContextSchema } from "./coordinateContext";
import { documentReferenceSchema } from "./documentReference";
import { extensionsSchema } from "./extensions";
import {
  governedQuantityAdoptionStatusSchema,
  governedQuantitySchema,
} from "./governedQuantity";
import { nonEmptyStringSchema, positiveIntegerSchema, uuidStringSchema } from "./primitives";
import { provenanceSchema } from "./provenance";
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

const designEntityDesignStatusSchema = z.enum(DESIGN_ENTITY_DESIGN_STATUSES);

const designBindingStatusSchema = z.enum(["unbound", "bound", "stale"]);

const designGeometryReferenceSchema = z.strictObject({
  geometryRefId: uuidStringSchema.nullable(),
  bindingStatus: designBindingStatusSchema,
});

const designAnalysisMemberMappingSchema = z.strictObject({
  analysisMemberRefId: uuidStringSchema.nullable(),
  bindingStatus: designBindingStatusSchema,
  analysisBindingId: uuidStringSchema.nullable().optional(),
});

const designEntityMetadataSchema = z.strictObject({
  entityRevisionId: positiveIntegerSchema,
  provenance: provenanceSchema,
  sourceRef: documentReferenceSchema.nullable().optional(),
  geometryRef: designGeometryReferenceSchema,
  analysisMapping: designAnalysisMemberMappingSchema,
  designStatus: designEntityDesignStatusSchema,
  adoptionStatus: governedQuantityAdoptionStatusSchema,
  extensions: extensionsSchema.optional(),
});

const mainGirderSchema = designEntityMetadataSchema.extend({
  entityKind: z.literal("MainGirder"),
  mainGirderId: uuidStringSchema,
  girderLineRefId: uuidStringSchema.nullable(),
  materialRefId: uuidStringSchema.nullable().optional(),
  compositeAction: z.literal(false).optional(),
});

const girderSectionSegmentSchema = designEntityMetadataSchema.extend({
  entityKind: z.literal("GirderSectionSegment"),
  girderSectionSegmentId: uuidStringSchema,
  mainGirderRefId: uuidStringSchema.nullable(),
  materialRefId: uuidStringSchema.nullable().optional(),
});

const rcDeckSchema = designEntityMetadataSchema.extend({
  entityKind: z.literal("RcDeck"),
  rcDeckId: uuidStringSchema,
  deckRefId: uuidStringSchema.nullable(),
  compositeAction: z.literal(false).optional(),
});

const haunchSchema = designEntityMetadataSchema.extend({
  entityKind: z.literal("Haunch"),
  haunchId: uuidStringSchema,
  mainGirderRefId: uuidStringSchema.nullable(),
});

const crossBeamSchema = designEntityMetadataSchema.extend({
  entityKind: z.literal("CrossBeam"),
  crossBeamId: uuidStringSchema,
  materialRefId: uuidStringSchema.nullable().optional(),
});

const swayBracingSchema = designEntityMetadataSchema.extend({
  entityKind: z.literal("SwayBracing"),
  swayBracingId: uuidStringSchema,
});

const lateralBracingSchema = designEntityMetadataSchema.extend({
  entityKind: z.literal("LateralBracing"),
  lateralBracingId: uuidStringSchema,
});

const braceMemberSchema = designEntityMetadataSchema.extend({
  entityKind: z.literal("BraceMember"),
  braceMemberId: uuidStringSchema,
  parentBracingRefId: uuidStringSchema.nullable(),
});

const stiffenerSchema = designEntityMetadataSchema.extend({
  entityKind: z.literal("Stiffener"),
  stiffenerId: uuidStringSchema,
  mainGirderRefId: uuidStringSchema.nullable(),
});

const spliceSchema = designEntityMetadataSchema.extend({
  entityKind: z.literal("Splice"),
  spliceId: uuidStringSchema,
  mainGirderRefId: uuidStringSchema.nullable(),
});

const deckAnchorageSchema = designEntityMetadataSchema.extend({
  entityKind: z.literal("DeckAnchorage"),
  deckAnchorageId: uuidStringSchema,
  anchorageRole: z.enum(DECK_ANCHORAGE_ROLES),
  girderRefId: uuidStringSchema.nullable(),
  rcDeckRefId: uuidStringSchema.nullable(),
});

const sdmNonCompositeAssertionSchema = z.strictObject({
  compositeAction: z.literal(false),
});

const structuralDesignModelSchema = z.strictObject({
  modelId: uuidStringSchema,
  nonCompositeAssertion: sdmNonCompositeAssertionSchema,
  mainGirders: z.array(mainGirderSchema),
  girderSectionSegments: z.array(girderSectionSegmentSchema),
  rcDecks: z.array(rcDeckSchema),
  haunches: z.array(haunchSchema),
  crossBeams: z.array(crossBeamSchema),
  swayBracings: z.array(swayBracingSchema),
  lateralBracings: z.array(lateralBracingSchema),
  braceMembers: z.array(braceMemberSchema),
  stiffeners: z.array(stiffenerSchema),
  splices: z.array(spliceSchema),
  deckAnchorages: z.array(deckAnchorageSchema),
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
    structuralDesignModel: structuralDesignModelSchema.optional(),
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
