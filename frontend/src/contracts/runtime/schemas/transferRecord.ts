import { z } from "zod";
import { TRANSFER_RECORD_SCHEMA_ID } from "../../contractVersionRegistry";
import { TRANSFER_RECORD_KIND } from "../../transferRecord";
import { contractSchemaId, SHARED_CONTRACT_VERSION } from "../constants";
import {
  packageArtifactReferenceSchema,
  policyReferenceSchema,
  transferRecordArtifactReferenceSchema,
} from "./artifactReference";
import { contentChecksumSchema } from "./contentChecksum";
import { documentReferenceSchema } from "./documentReference";
import { extensionsSchema } from "./extensions";
import { PACKAGE_CAPABILITY_STATES } from "../../packageCapability";
import { actorRefSchema } from "./provenance";
import { iso8601UtcTimestampSchema, nonEmptyStringSchema, semVerStringSchema, uuidStringSchema } from "./primitives";

const transferRecordStatusSchema = z.enum([
  "previewed",
  "rejected",
  "partially-accepted",
  "accepted",
  "conflicted",
  "stale",
  "rolled-back",
]);

const entityMappingDispositionSchema = z.enum(["mapped", "unmapped", "quarantined", "blocked"]);

export const entityMappingEntrySchema = z.strictObject({
  roadGeometryId: uuidStringSchema,
  frameEntityIds: z.array(uuidStringSchema),
  disposition: entityMappingDispositionSchema,
  reason: nonEmptyStringSchema.optional(),
});

export const transferDecisionEntrySchema = z.strictObject({
  decisionId: uuidStringSchema,
  entityId: uuidStringSchema.optional(),
  fieldPath: nonEmptyStringSchema.optional(),
  reason: nonEmptyStringSchema,
});

export const transferCapabilityAssessmentEntrySchema = z.strictObject({
  capabilityId: nonEmptyStringSchema,
  producerStatus: z.enum(PACKAGE_CAPABILITY_STATES),
  consumerStatus: z.enum(PACKAGE_CAPABILITY_STATES),
  blocked: z.boolean(),
  reason: nonEmptyStringSchema.optional(),
});

export const transferRecordSchema = z
  .strictObject({
    schemaId: z.literal(TRANSFER_RECORD_SCHEMA_ID),
    schemaVersion: semVerStringSchema,
    documentKind: z.literal(TRANSFER_RECORD_KIND),
    recordId: uuidStringSchema,
    contentChecksum: contentChecksumSchema,
    packageRef: packageArtifactReferenceSchema,
    sourceDocumentRef: documentReferenceSchema,
    targetBefore: documentReferenceSchema,
    targetAfter: documentReferenceSchema.optional(),
    baselineRecordRef: transferRecordArtifactReferenceSchema.optional(),
    rollbackOf: transferRecordArtifactReferenceSchema.optional(),
    supersedes: transferRecordArtifactReferenceSchema.optional(),
    status: transferRecordStatusSchema,
    firstImport: z.boolean(),
    capabilityAssessment: z.array(transferCapabilityAssessmentEntrySchema),
    entityMappings: z.array(entityMappingEntrySchema),
    acceptedChanges: z.array(transferDecisionEntrySchema),
    rejectedChanges: z.array(transferDecisionEntrySchema),
    conflicts: z.array(transferDecisionEntrySchema),
    coordinateTransform: policyReferenceSchema,
    applyProfile: policyReferenceSchema,
    timestamp: iso8601UtcTimestampSchema,
    actor: actorRefSchema,
    toolVersion: nonEmptyStringSchema,
    validationRef: documentReferenceSchema.optional(),
    unknownFieldStoreRef: documentReferenceSchema.optional(),
    extensions: extensionsSchema.optional(),
  })
  .meta({
    id: contractSchemaId("transfer-record"),
    title: "TransferRecord",
    contractVersion: SHARED_CONTRACT_VERSION,
  });

export type TransferRecordValue = z.infer<typeof transferRecordSchema>;
