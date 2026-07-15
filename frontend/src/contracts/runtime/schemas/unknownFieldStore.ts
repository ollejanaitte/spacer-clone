import { z } from "zod";
import { UNKNOWN_FIELD_STORE_SCHEMA_ID } from "../../contractVersionRegistry";
import { UNKNOWN_FIELD_STORE_DOCUMENT_KIND } from "../../unknownFieldStore";
import { contractSchemaId, SHARED_CONTRACT_VERSION } from "../constants";
import { contentChecksumSchema } from "./contentChecksum";
import { immutableResourceReferenceSchema } from "./immutableResourceReference";
import { nonEmptyStringSchema, semVerStringSchema, uuidStringSchema } from "./primitives";

const sourceVersionClassificationSchema = z.enum([
  "exact_supported",
  "same_major_future_minor",
  "supported_older",
  "supported_legacy",
  "unsupported_future_major",
  "missing_or_invalid",
]);

const unknownFieldCriticalitySchema = z.enum(["critical", "optional", "informational"]);

export const unknownFieldEntrySchema = z.strictObject({
  jsonPointer: z.string().min(1),
  sourcePointer: nonEmptyStringSchema.optional(),
  criticality: unknownFieldCriticalitySchema,
  rawPayloadRef: immutableResourceReferenceSchema,
});

export const unknownFieldCollisionRecordSchema = z.strictObject({
  jsonPointer: z.string().min(1),
  knownFieldPath: nonEmptyStringSchema,
  rawPayloadRef: immutableResourceReferenceSchema,
});

export const unknownFieldStoreSchema = z
  .strictObject({
    schemaId: z.literal(UNKNOWN_FIELD_STORE_SCHEMA_ID),
    schemaVersion: semVerStringSchema,
    documentKind: z.literal(UNKNOWN_FIELD_STORE_DOCUMENT_KIND),
    storeId: uuidStringSchema,
    sourceRawChecksum: contentChecksumSchema,
    sourceVersionClassification: sourceVersionClassificationSchema,
    sourceVersion: nonEmptyStringSchema.optional(),
    entries: z.array(unknownFieldEntrySchema),
    rawPayloadRef: immutableResourceReferenceSchema.optional(),
    collisionRecords: z.array(unknownFieldCollisionRecordSchema).optional(),
  })
  .meta({
    id: contractSchemaId("unknown-field-store"),
    title: "UnknownFieldStore",
    contractVersion: SHARED_CONTRACT_VERSION,
  });

export type UnknownFieldStoreValue = z.infer<typeof unknownFieldStoreSchema>;
