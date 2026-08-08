import { z } from "zod";
import type { DocumentKind } from "../../documentKind";
import { BRIDGE_PROJECT_SCHEMA_ID } from "../../contractVersionRegistry";
import { contractSchemaId, SHARED_CONTRACT_VERSION } from "../constants";
import { createCommonEnvelopeSchema } from "./commonEnvelope";
import { contentChecksumSchema } from "./contentChecksum";
import { documentReferenceSchema } from "./documentReference";
import { extensionsSchema } from "./extensions";
import {
  finiteNumberSchema,
  iso8601UtcTimestampSchema,
  nonEmptyStringSchema,
  semVerStringSchema,
  uuidStringSchema,
} from "./primitives";
import { provenanceSchema } from "./provenance";
import { revisionMetadataSchema } from "./revision";

export const BRIDGE_PROJECT_DOCUMENT_KIND = "bridge-project" as const;

// ---------------------------------------------------------------------------
// Shared value status / owner vocabulary
// ---------------------------------------------------------------------------

/**
 * Status vocabulary for shared cross-tool values (see docs/integration/
 * value-status-unit-policy.md). Distinguishes original/confirmed values from
 * derived, inferred, missing, deferred, and not-authorized values so that
 * reverse reconstruction (superstructure sample -> alignment) is never mistaken
 * for an original confirmed value.
 */
export const bridgeProjectValueStatusSchema = z.enum([
  "CONFIRMED", // 原本/入力値として確認済み
  "DERIVED", // 現行モデルから決定論的に導出
  "INFERRED", // 推定
  "MISSING", // 不足
  "DEFERRED", // 保留
  "NOT_AUTHORIZED", // 未認証
]);

export const bridgeProjectValueSourceSchema = z.enum([
  "ORIGINAL", // 原本/入力
  "USER_INPUT", // ユーザー入力
  "GENERATED_BY_TOOL", // ツール生成
  "RECONSTRUCTED", // 復元・補完
]);

export const bridgeProjectOwnerSchema = z.enum([
  "ALIGNMENT_OWNER",
  "SUPERSTRUCTURE_OWNER",
  "SUBSTRUCTURE_OWNER",
  "BRIDGE_PROJECT_SHARED",
]);

export const bridgeProjectSectionKeySchema = z.enum([
  "project",
  "alignment",
  "bridgeGeometry",
  "superstructure",
  "substructure",
  "analysis",
  "model3D",
  "metadata",
]);

export const bridgeProjectSectionStateSchema = z.enum([
  "EMPTY",
  "PARTIAL",
  "COMPLETE",
  "NOT_AUTHORIZED",
  "DEFERRED",
]);

/**
 * A shared value with provenance/status metadata: value, canonical unit,
 * status, source classification, generating tool, updated timestamp, and an
 * optional source reference (golden id / document reference).
 */
export const bridgeProjectValueSchema = z
  .strictObject({
    value: z.union([finiteNumberSchema, z.string(), z.boolean()]).nullable(),
    unit: nonEmptyStringSchema.optional(),
    status: bridgeProjectValueStatusSchema,
    source: bridgeProjectValueSourceSchema.optional(),
    generatedBy: nonEmptyStringSchema.optional(),
    updatedAt: iso8601UtcTimestampSchema.optional(),
    sourceReference: nonEmptyStringSchema.optional(),
    stateReason: z.string().optional(),
  })
  .describe(
    "Shared value carrying value/unit/source/status/generatedBy/updatedAt/sourceReference " +
      "so that downstream tools never mistake a reconstructed value for a confirmed one.",
  );

// ---------------------------------------------------------------------------
// Section status / ownership
// ---------------------------------------------------------------------------

export const bridgeProjectSectionStatusSchema = z
  .strictObject({
    owner: bridgeProjectOwnerSchema,
    state: bridgeProjectSectionStateSchema,
    stateReason: z.string().optional(),
    sourceDocumentRef: documentReferenceSchema.optional(),
  })
  .describe("Ownership and completion state of one BridgeProject section.");

export const bridgeProjectStatusSchema = z
  .strictObject({
    phase: z.enum([
      "road-alignment",
      "superstructure",
      "substructure",
      "reconciliation",
      "closed",
    ]),
    sections: z.record(bridgeProjectSectionKeySchema, bridgeProjectSectionStatusSchema),
  })
  .describe("Overall workflow phase and per-section ownership/status.");

// ---------------------------------------------------------------------------
// Authoritative document references
// ---------------------------------------------------------------------------

export const bridgeProjectReferencesSchema = z
  .strictObject({
    roadDesign: documentReferenceSchema.optional(),
    commonModel: documentReferenceSchema.optional(),
    superstructure: documentReferenceSchema.optional(),
    analysis: z.array(documentReferenceSchema).optional(),
    substructure: documentReferenceSchema.optional(),
    model3D: documentReferenceSchema.optional(),
  })
  .describe(
    "References to the authoritative per-domain documents. Shared engineering facts are " +
      "canonical in commonModel (CBDM); superstructure facts in superstructure (BSDD); " +
      "substructure facts in substructure; analysis results in analysis (BFAD / result " +
      "resources). BridgeProject coordinates, it does not duplicate them.",
  );

// ---------------------------------------------------------------------------
// Cross-domain handoff facts (support system + reactions)
// ---------------------------------------------------------------------------

export const bridgeProjectSupportSchema = z
  .strictObject({
    supportId: nonEmptyStringSchema,
    supportType: z.enum(["abutment", "pier"]).optional(),
    stationM: bridgeProjectValueSchema.optional(),
    offsetM: bridgeProjectValueSchema.optional(),
    skewRad: bridgeProjectValueSchema.optional(),
    elevationM: bridgeProjectValueSchema.optional(),
    bearingSeats: z
      .array(
        z.strictObject({
          seatId: nonEmptyStringSchema,
          transverseOffsetM: bridgeProjectValueSchema.optional(),
        }),
      )
      .optional(),
  })
  .describe(
    "Cross-tool support system fact (superstructure geometry + substructure placement " +
      "consume the same support line). Canonical unit: m / rad.",
  );

export const bridgeProjectReactionCaseKindSchema = z.enum([
  "permanent",
  "liveLoad",
  "braking",
  "wind",
  "seismicLevel1",
  "seismicLevel2",
]);

export const bridgeProjectReactionSchema = z
  .strictObject({
    supportId: nonEmptyStringSchema,
    caseKind: bridgeProjectReactionCaseKindSchema,
    status: bridgeProjectValueStatusSchema,
    force: z.strictObject({ x: finiteNumberSchema, y: finiteNumberSchema, z: finiteNumberSchema }).optional(),
    moment: z
      .strictObject({ x: finiteNumberSchema, y: finiteNumberSchema, z: finiteNumberSchema })
      .optional(),
    sourceReference: nonEmptyStringSchema.optional(),
    stateReason: z.string().optional(),
  })
  .describe(
    "Reaction handoff fact. Canonical unit kN / kN·m. Status NOT_AUTHORIZED until an " +
      "authorized analysis result exists; substructure tools must fail closed on it.",
  );

export const bridgeProjectSharedFactsSchema = z
  .strictObject({
    supports: z.array(bridgeProjectSupportSchema).optional(),
    reactions: z.array(bridgeProjectReactionSchema).optional(),
    coordinateSystem: z
      .enum(["x-longitudinal-y-transverse-z-up", "x-east-y-north-z-up"])
      .optional(),
    unitSystem: z.enum(["si-m-rad-kn", "si"]).optional(),
  })
  .describe(
    "Shared cross-tool handoff facts that today live in divergent structures (support " +
      "interface, substructure Support, superstructure support lines).",
  );

// ---------------------------------------------------------------------------
// CASE B reconstruction records (superstructure sample -> alignment)
// ---------------------------------------------------------------------------

export const bridgeProjectReconstructionStatusSchema = z.enum([
  "CONFIRMED", // 原本/入力値として確認済み
  "DERIVED", // 決定論的に導出
  "INFERRED", // 推定
  "MISSING", // 不足
  "DEFERRED", // 保留
  "NOT_AUTHORIZED", // 未認証
]);

export const bridgeProjectReconstructionEntrySchema = z
  .strictObject({
    fieldKey: nonEmptyStringSchema,
    status: bridgeProjectReconstructionStatusSchema,
    value: z.union([finiteNumberSchema, z.string(), z.boolean()]).nullable().optional(),
    unit: nonEmptyStringSchema.optional(),
    derivationRef: nonEmptyStringSchema.optional(),
    stateReason: z.string().optional(),
  })
  .describe(
    "One reconstructed/restored field with an explicit status so that a restored alignment " +
      "is never presented as if it were the original confirmed input.",
  );

export const bridgeProjectReconstructionSchema = z
  .strictObject({
    source: documentReferenceSchema.optional(),
    entries: z.array(bridgeProjectReconstructionEntrySchema).optional(),
  })
  .describe(
    "CASE B (superstructure sample -> alignment restore) provenance records. DERIVED/INFERRED " +
      "entries must stay distinct from CONFIRMED originals.",
  );

// ---------------------------------------------------------------------------
// Root document
// ---------------------------------------------------------------------------

export const bridgeProjectSchema = createCommonEnvelopeSchema({
  fixedSchemaId: BRIDGE_PROJECT_SCHEMA_ID,
  fixedDocumentKind: BRIDGE_PROJECT_DOCUMENT_KIND as DocumentKind,
})
  .extend({
    projectId: uuidStringSchema,
    name: nonEmptyStringSchema,
    projectRevisionMetadata: revisionMetadataSchema,
    status: bridgeProjectStatusSchema,
    references: bridgeProjectReferencesSchema,
    sharedFacts: bridgeProjectSharedFactsSchema.optional(),
    reconstruction: bridgeProjectReconstructionSchema.optional(),
  })
  .meta({
    id: contractSchemaId("bridge-project"),
    title: "BridgeProject",
    contractVersion: SHARED_CONTRACT_VERSION,
  });

export type BridgeProjectValue = z.infer<typeof bridgeProjectSchema>;
export type BridgeProjectValueStatus = z.infer<typeof bridgeProjectValueStatusSchema>;
export type BridgeProjectOwner = z.infer<typeof bridgeProjectOwnerSchema>;
export type BridgeProjectSectionKey = z.infer<typeof bridgeProjectSectionKeySchema>;
export type BridgeProjectSectionStatus = z.infer<typeof bridgeProjectSectionStatusSchema>;
export type BridgeProjectStatusValue = z.infer<typeof bridgeProjectStatusSchema>;
export type BridgeProjectReferencesValue = z.infer<typeof bridgeProjectReferencesSchema>;
export type BridgeProjectSharedFactsValue = z.infer<typeof bridgeProjectSharedFactsSchema>;
export type BridgeProjectSupportValue = z.infer<typeof bridgeProjectSupportSchema>;
export type BridgeProjectReactionValue = z.infer<typeof bridgeProjectReactionSchema>;
export type BridgeProjectReconstructionValue = z.infer<typeof bridgeProjectReconstructionSchema>;
export type BridgeProjectReconstructionEntryValue = z.infer<
  typeof bridgeProjectReconstructionEntrySchema
>;
export type BridgeProjectValueValue = z.infer<typeof bridgeProjectValueSchema>;
