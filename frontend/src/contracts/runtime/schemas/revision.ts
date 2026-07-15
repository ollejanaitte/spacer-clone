import { z } from "zod";
import { contractSchemaId, SHARED_CONTRACT_VERSION } from "../constants";
import { contentChecksumSchema } from "./contentChecksum";
import {
  iso8601UtcTimestampSchema,
  nonEmptyStringSchema,
  nonNegativeIntegerSchema,
  positiveIntegerSchema,
  semVerStringSchema,
  uuidStringSchema,
} from "./primitives";
import { actorRefSchema, toolProvenanceSchema } from "./provenance";

export const revisionMetadataSchema = z
  .strictObject({
    schemaVersion: semVerStringSchema,
    documentId: uuidStringSchema,
    revisionId: positiveIntegerSchema,
    createdAt: iso8601UtcTimestampSchema,
    contentChecksum: contentChecksumSchema,
    parentRevisionIds: z.array(positiveIntegerSchema).optional(),
    baseRevisionId: positiveIntegerSchema.optional(),
    sequence: nonNegativeIntegerSchema.optional(),
    actor: actorRefSchema.optional(),
    tool: toolProvenanceSchema.optional(),
    reason: nonEmptyStringSchema.optional(),
    migrationRecordRef: nonEmptyStringSchema.optional(),
  })
  .meta({
    id: contractSchemaId("revision-metadata"),
    title: "RevisionMetadata",
    contractVersion: SHARED_CONTRACT_VERSION,
  });

export type RevisionMetadataValue = z.infer<typeof revisionMetadataSchema>;
