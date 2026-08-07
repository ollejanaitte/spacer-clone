import { z } from "zod";
import type { DocumentKind } from "../../documentKind";
import {
  COMMON_BRIDGE_DATA_MODEL_SCHEMA_ID,
} from "../../contractVersionRegistry";
import { contractSchemaId, SHARED_CONTRACT_VERSION } from "../constants";
import { createCommonEnvelopeSchema } from "./commonEnvelope";
import { contentChecksumSchema } from "./contentChecksum";
import { documentKindSchema, documentReferenceSchema } from "./documentReference";
import { extensionsSchema } from "./extensions";
import {
  finiteNumberSchema,
  nonEmptyStringSchema,
  semVerStringSchema,
  uuidStringSchema,
} from "./primitives";
import { provenanceSchema } from "./provenance";

/**
 * Common Bridge Data Model (CBDM) — canonical runtime (zod) schema.
 *
 * This is the SINGLE SOURCE OF TRUTH for the CBDM contract shape. The checked-in
 * JSON Schema `schemas/contracts/v0.1/common-bridge-data-model.schema.json` is
 * generated from this schema by the contract JSON schema pipeline, and the
 * canonical TypeScript types in `frontend/src/contracts/commonBridgeDataModel.ts`
 * are inferred from / re-export this schema so that schema, JSON Schema and types
 * stay semantically in parity.
 *
 * The model is bridge-agnostic: no Reference Bridge specific value or ID prefix is
 * embedded here. Reference Bridge 001 data lives in the Reference fixture and the
 * mapping registers under docs/apollo/step10/reference_bridge_001/phase5/.
 */

export const COMMON_BRIDGE_DATA_MODEL_DOCUMENT_KIND = "common-bridge-data-model" as const;

// ---------------------------------------------------------------------------
// Value state primitives
// ---------------------------------------------------------------------------

/** Numeric authority (mirrors Apollo NumericAuthority). */
export const numericAuthoritySchema = z.enum([
  "PLACEHOLDER",
  "USER_PROVIDED_UNVERIFIED",
  "SOURCE_TRACED",
  "ADOPTED",
]);

export const numericAuthorityValues = numericAuthoritySchema.options;

/** Scalar payload of a resolved value (number/string/boolean). */
export const scalarValueSchema = z.union([finiteNumberSchema, z.string(), z.boolean()]);

/** A single candidate value with its source references. */
export const candidateValueSchema = z
  .object({
    value: scalarValueSchema,
    unit: nonEmptyStringSchema.optional(),
    sourceRefs: z.array(nonEmptyStringSchema).optional(),
  })
  .describe("A candidate value and its provenance.");

export const confirmedValueSchema = z
  .object({
    state: z.literal("CONFIRMED"),
    value: scalarValueSchema,
    unit: nonEmptyStringSchema.optional(),
    sourceUnit: nonEmptyStringSchema.optional(),
    sourceRefs: z.array(nonEmptyStringSchema).optional(),
    goldenId: nonEmptyStringSchema.optional(),
    precision: finiteNumberSchema.optional(),
    authority: numericAuthoritySchema.optional(),
  })
  .describe("Confirmed value usable downstream.");

export const humanConfirmationRequiredValueSchema = z
  .object({
    state: z.literal("HUMAN_CONFIRMATION_REQUIRED"),
    value: scalarValueSchema,
    unit: nonEmptyStringSchema.optional(),
    sourceUnit: nonEmptyStringSchema.optional(),
    sourceRefs: z.array(nonEmptyStringSchema).optional(),
    goldenId: nonEmptyStringSchema.optional(),
    humanConfirmationId: nonEmptyStringSchema,
    confirmationState: z.enum(["PENDING", "CONFIRMED", "REJECTED"]).optional(),
  })
  .describe("Value present but pending human confirmation (HCR).");

export const conflictValueSchema = z
  .object({
    state: z.literal("CONFLICT"),
    conflictId: nonEmptyStringSchema,
    candidates: z.array(candidateValueSchema).min(1),
    selected: candidateValueSchema.nullable(),
    resolutionStatus: z.enum(["UNRESOLVED", "RESOLVED", "RESOLVED_WITH_DEVIATION"]),
    description: z.string().optional(),
  })
  .describe("Conflicting candidates; selected is null until human resolution.");

export const holdValueSchema = z
  .object({
    state: z.literal("HOLD_INSUFFICIENT_SOURCE"),
    stateReason: nonEmptyStringSchema,
    unit: nonEmptyStringSchema.optional(),
    sourceRefs: z.array(nonEmptyStringSchema).optional(),
  })
  .describe("Value unknown because source is insufficient; explicit reason required.");

export const notApplicableValueSchema = z
  .object({
    state: z.literal("NOT_APPLICABLE"),
    reason: z.string().optional(),
  })
  .describe("Concept does not apply to this bridge.");

export const notAvailableValueSchema = z
  .object({
    state: z.literal("NOT_AVAILABLE"),
    stateReason: z.string().optional(),
  })
  .describe("Concept valid but no value available in the current contract.");

export const resolvedValueSchema = z.discriminatedUnion("state", [
  confirmedValueSchema,
  humanConfirmationRequiredValueSchema,
  conflictValueSchema,
  holdValueSchema,
  notApplicableValueSchema,
  notAvailableValueSchema,
]);

export const resolvedValueStates = [
  "CONFIRMED",
  "HUMAN_CONFIRMATION_REQUIRED",
  "CONFLICT",
  "HOLD_INSUFFICIENT_SOURCE",
  "NOT_APPLICABLE",
  "NOT_AVAILABLE",
] as const;

// ---------------------------------------------------------------------------
// Common entity shape
// ---------------------------------------------------------------------------

export const commonEntityTypeSchema = z.enum([
  "ALIGNMENT",
  "SPAN",
  "SUPPORT",
  "GIRDER",
  "GRID_POINT",
  "DECK",
  "CROSS_MEMBER",
  "STRUCTURAL_NODE",
  "STRUCTURAL_MEMBER",
  "MATERIAL",
  "SECTION",
  "LOAD_CASE",
  "LOAD_COMBINATION",
  "DESIGN_ITEM",
  "REPORT_ITEM",
  "DRAWING_SHEET",
  "DRAWING_ITEM",
  "ANALYSIS_RESULT",
]);

const entityBaseSchema = z
  .object({
    id: nonEmptyStringSchema,
    displayName: z.string().optional(),
    fields: z.record(z.string(), resolvedValueSchema),
  })
  .describe(
    "A Common Bridge Data Model entity. Engineering attributes are stored as " +
      "resolved value records keyed by a stable field key, so confirmed / HCR / " +
      "conflict / hold states are preserved losslessly.",
  );

export const commonEntityBaseSchema = entityBaseSchema;

export const alignmentEntitySchema = entityBaseSchema.extend({
  entityType: z.literal("ALIGNMENT"),
});
export const spanEntitySchema = entityBaseSchema.extend({ entityType: z.literal("SPAN") });
export const supportEntitySchema = entityBaseSchema.extend({ entityType: z.literal("SUPPORT") });
export const girderEntitySchema = entityBaseSchema.extend({ entityType: z.literal("GIRDER") });
export const gridPointEntitySchema = entityBaseSchema.extend({
  entityType: z.literal("GRID_POINT"),
});
export const deckEntitySchema = entityBaseSchema.extend({ entityType: z.literal("DECK") });
export const crossMemberEntitySchema = entityBaseSchema.extend({
  entityType: z.literal("CROSS_MEMBER"),
});
export const structuralNodeEntitySchema = entityBaseSchema.extend({
  entityType: z.literal("STRUCTURAL_NODE"),
});
export const structuralMemberEntitySchema = entityBaseSchema.extend({
  entityType: z.literal("STRUCTURAL_MEMBER"),
});
export const materialEntitySchema = entityBaseSchema.extend({ entityType: z.literal("MATERIAL") });
export const sectionEntitySchema = entityBaseSchema.extend({ entityType: z.literal("SECTION") });
export const loadCaseEntitySchema = entityBaseSchema.extend({ entityType: z.literal("LOAD_CASE") });
export const loadCombinationEntitySchema = entityBaseSchema.extend({
  entityType: z.literal("LOAD_COMBINATION"),
});
export const designItemEntitySchema = entityBaseSchema.extend({
  entityType: z.literal("DESIGN_ITEM"),
});
export const reportItemEntitySchema = entityBaseSchema.extend({
  entityType: z.literal("REPORT_ITEM"),
});
export const drawingSheetEntitySchema = entityBaseSchema.extend({
  entityType: z.literal("DRAWING_SHEET"),
});
export const drawingItemEntitySchema = entityBaseSchema.extend({
  entityType: z.literal("DRAWING_ITEM"),
});
export const analysisResultEntitySchema = entityBaseSchema.extend({
  entityType: z.literal("ANALYSIS_RESULT"),
});

// ---------------------------------------------------------------------------
// Layer containers
// ---------------------------------------------------------------------------

export const bridgeMetadataSchema = z
  .object({
    bridgeId: nonEmptyStringSchema,
    displayName: nonEmptyStringSchema,
    standardProfile: nonEmptyStringSchema,
    r7Compliance: nonEmptyStringSchema,
    numericDesignAuthorization: nonEmptyStringSchema,
    designOrConstructionUse: nonEmptyStringSchema,
    referenceType: z.enum(["REFERENCE", "TEST", "NON_RELEASE"]),
  })
  .describe("Bridge document metadata (bridge-agnostic release authority surface).");

export const alignmentModelSchema = z
  .object({
    alignments: z.array(alignmentEntitySchema),
  })
  .describe("Alignment / geometry input layer.");

export const bridgeGeometryModelSchema = z
  .object({
    spans: z.array(spanEntitySchema),
    supports: z.array(supportEntitySchema),
    girders: z.array(girderEntitySchema),
    gridPoints: z.array(gridPointEntitySchema),
    deck: z.array(deckEntitySchema),
    crossMembers: z.array(crossMemberEntitySchema),
  })
  .describe("Bridge geometry layer (spans, supports, girders, grid, deck, cross members).");

export const commonStructuralModelSchema = z
  .object({
    nodes: z.array(structuralNodeEntitySchema),
    members: z.array(structuralMemberEntitySchema),
  })
  .describe("Structural model layer (nodes and members).");

export const materialsModelSchema = z
  .object({
    materials: z.array(materialEntitySchema),
  })
  .describe("Materials layer.");

export const sectionsModelSchema = z
  .object({
    sections: z.array(sectionEntitySchema),
  })
  .describe("Sections layer.");

export const loadsModelSchema = z
  .object({
    loadCases: z.array(loadCaseEntitySchema),
    loadCombinations: z.array(loadCombinationEntitySchema),
  })
  .describe("Loads layer.");

export const analysisReferenceModelSchema = z
  .object({
    status: z.enum(["NOT_AVAILABLE", "AVAILABLE", "PARTIAL"]),
    stateReason: z.string().optional(),
    results: z.array(analysisResultEntitySchema),
  })
  .describe(
    "Analysis reference slot. status NOT_AVAILABLE is valid and expected when the " +
      "current contract has no analysis Golden.",
  );

export const designReferenceModelSchema = z
  .object({
    items: z.array(designItemEntitySchema),
  })
  .describe("Design layer (adopted design values and design checks).");

export const reportSpecificationSchema = z
  .object({
    items: z.array(reportItemEntitySchema),
  })
  .describe("Report specification layer (report items).");

export const drawingSpecificationSchema = z
  .object({
    sheets: z.array(drawingSheetEntitySchema),
    items: z.array(drawingItemEntitySchema),
  })
  .describe("Drawing specification layer (sheets and drawing items).");

export const traceabilityLinkSchema = z
  .object({
    traceabilityId: nonEmptyStringSchema,
    goldenId: nonEmptyStringSchema.optional(),
    sourceRecordIds: z.array(nonEmptyStringSchema).optional(),
    commonEntityId: nonEmptyStringSchema.optional(),
    domain: nonEmptyStringSchema.optional(),
    drawingSheetId: nonEmptyStringSchema.optional(),
    notes: z.string().optional(),
  })
  .describe("Golden/source <-> Common entity traceability link.");

export const traceabilityRegistrySchema = z
  .object({
    links: z.array(traceabilityLinkSchema),
  })
  .describe("Traceability layer.");

export const conflictRegistryEntrySchema = z
  .object({
    conflictId: nonEmptyStringSchema,
    description: z.string().optional(),
    candidates: z.array(candidateValueSchema).min(1),
    selected: candidateValueSchema.nullable(),
    resolutionStatus: z.enum(["UNRESOLVED", "RESOLVED", "RESOLVED_WITH_DEVIATION"]),
    affectedEntityIds: z.array(nonEmptyStringSchema).optional(),
  })
  .describe("Conflict registry entry (e.g. CONF-P2II-001 at fixture level).");

export const humanConfirmationRegistryEntrySchema = z
  .object({
    humanConfirmationId: nonEmptyStringSchema,
    description: z.string().optional(),
    state: z.enum(["PENDING", "CONFIRMED", "REJECTED"]),
    affectedEntityIds: z.array(nonEmptyStringSchema).optional(),
  })
  .describe("Human-confirmation registry entry (e.g. HCR-001 at fixture level).");

export const holdRegistryEntrySchema = z
  .object({
    holdId: nonEmptyStringSchema,
    state: z.literal("HOLD_INSUFFICIENT_SOURCE"),
    stateReason: nonEmptyStringSchema,
    affectedEntityIds: z.array(nonEmptyStringSchema).optional(),
  })
  .describe("Hold registry entry (value unknown because source insufficient).");

export const resolutionRegistrySchema = z
  .object({
    conflicts: z.array(conflictRegistryEntrySchema),
    humanConfirmations: z.array(humanConfirmationRegistryEntrySchema),
    holds: z.array(holdRegistryEntrySchema),
  })
  .describe("Resolution registry: conflicts, human confirmations, holds.");

// ---------------------------------------------------------------------------
// Root document
// ---------------------------------------------------------------------------

export const commonBridgeDataModelSchema = createCommonEnvelopeSchema({
  fixedSchemaId: COMMON_BRIDGE_DATA_MODEL_SCHEMA_ID,
  fixedDocumentKind: COMMON_BRIDGE_DATA_MODEL_DOCUMENT_KIND as DocumentKind,
})
  .extend({
    metadata: bridgeMetadataSchema,
    alignments: alignmentModelSchema,
    bridgeGeometry: bridgeGeometryModelSchema,
    structuralModel: commonStructuralModelSchema,
    materials: materialsModelSchema,
    sections: sectionsModelSchema,
    loads: loadsModelSchema,
    analysisReference: analysisReferenceModelSchema,
    design: designReferenceModelSchema,
    reportSpecification: reportSpecificationSchema,
    drawingSpecification: drawingSpecificationSchema,
    traceability: traceabilityRegistrySchema,
    resolutionRegistry: resolutionRegistrySchema,
  })
  .meta({
    id: contractSchemaId("common-bridge-data-model"),
    title: "CommonBridgeDataModel",
    contractVersion: SHARED_CONTRACT_VERSION,
  });

export type CommonBridgeDataModelValue = z.infer<typeof commonBridgeDataModelSchema>;
export type BridgeMetadataValue = z.infer<typeof bridgeMetadataSchema>;
export type AlignmentModelValue = z.infer<typeof alignmentModelSchema>;
export type BridgeGeometryModelValue = z.infer<typeof bridgeGeometryModelSchema>;
export type CommonStructuralModelValue = z.infer<typeof commonStructuralModelSchema>;
export type MaterialsModelValue = z.infer<typeof materialsModelSchema>;
export type SectionsModelValue = z.infer<typeof sectionsModelSchema>;
export type LoadsModelValue = z.infer<typeof loadsModelSchema>;
export type AnalysisReferenceModelValue = z.infer<typeof analysisReferenceModelSchema>;
export type DesignReferenceModelValue = z.infer<typeof designReferenceModelSchema>;
export type ReportSpecificationValue = z.infer<typeof reportSpecificationSchema>;
export type DrawingSpecificationValue = z.infer<typeof drawingSpecificationSchema>;
export type TraceabilityRegistryValue = z.infer<typeof traceabilityRegistrySchema>;
export type ResolutionRegistryValue = z.infer<typeof resolutionRegistrySchema>;
export type ResolvedValueValue = z.infer<typeof resolvedValueSchema>;
export type ConflictValueValue = z.infer<typeof conflictValueSchema>;
export type CandidateValueValue = z.infer<typeof candidateValueSchema>;
export type CommonEntityValue = {
  id: string;
  displayName?: string;
  fields: Record<string, ResolvedValueValue>;
};
export type StructuralNodeValue = z.infer<typeof structuralNodeEntitySchema>;
export type StructuralMemberValue = z.infer<typeof structuralMemberEntitySchema>;
export type SupportDefinitionValue = z.infer<typeof supportEntitySchema>;
export type MaterialDefinitionValue = z.infer<typeof materialEntitySchema>;
export type SectionDefinitionValue = z.infer<typeof sectionEntitySchema>;
export type LoadDefinitionValue =
  | z.infer<typeof loadCaseEntitySchema>
  | z.infer<typeof loadCombinationEntitySchema>;
export type LoadCaseValue = z.infer<typeof loadCaseEntitySchema>;
export type LoadCombinationValue = z.infer<typeof loadCombinationEntitySchema>;
export type ReportItemValue = z.infer<typeof reportItemEntitySchema>;
export type DrawingSheetValue = z.infer<typeof drawingSheetEntitySchema>;
export type DrawingItemValue = z.infer<typeof drawingItemEntitySchema>;
export type TraceabilityLinkValue = z.infer<typeof traceabilityLinkSchema>;
export type ConflictRegistryEntryValue = z.infer<typeof conflictRegistryEntrySchema>;
export type HumanConfirmationRegistryEntryValue = z.infer<
  typeof humanConfirmationRegistryEntrySchema
>;
export type HoldRegistryEntryValue = z.infer<typeof holdRegistryEntrySchema>;
