import { z } from "zod";
import { MIGRATION_RECORD_SCHEMA_ID } from "../../contractVersionRegistry";
import { MIGRATION_RECORD_DOCUMENT_KIND } from "../../migrationRecord";
import { contractSchemaId, SHARED_CONTRACT_VERSION } from "../constants";
import { contentChecksumSchema } from "./contentChecksum";
import { documentReferenceSchema } from "./documentReference";
import {
  iso8601UtcTimestampSchema,
  nonEmptyStringSchema,
  semVerStringSchema,
  uuidStringSchema,
} from "./primitives";
import { actorRefSchema } from "./provenance";
import { validationIssueSchema } from "./validationResult";

const migrationStatusSchema = z.enum(["dry_run", "committed"]);

const mappingDispositionSchema = z.enum(["committed", "quarantined", "unmapped"]);

export const migrationIdMappingSchema = z.strictObject({
  sourceId: nonEmptyStringSchema,
  disposition: mappingDispositionSchema,
  targetId: uuidStringSchema.optional(),
  entityKind: nonEmptyStringSchema.optional(),
});

export const migrationRecordSchema = z
  .strictObject({
    schemaId: z.literal(MIGRATION_RECORD_SCHEMA_ID),
    schemaVersion: semVerStringSchema,
    documentKind: z.literal(MIGRATION_RECORD_DOCUMENT_KIND),
    migrationId: uuidStringSchema,
    adapterId: nonEmptyStringSchema,
    adapterVersion: nonEmptyStringSchema,
    sourceRawChecksum: contentChecksumSchema,
    sourceContentChecksum: contentChecksumSchema,
    sourceVersion: nonEmptyStringSchema,
    targetVersion: nonEmptyStringSchema,
    targetRefs: z.array(documentReferenceSchema).optional(),
    candidateTargetRefs: z.array(documentReferenceSchema).optional(),
    diagnostics: z.array(validationIssueSchema),
    recordedAt: iso8601UtcTimestampSchema,
    idMappings: z.array(migrationIdMappingSchema),
    status: migrationStatusSchema,
    operator: actorRefSchema.optional(),
  })
  .meta({
    id: contractSchemaId("migration-record"),
    title: "MigrationRecord",
    contractVersion: SHARED_CONTRACT_VERSION,
  });

export type MigrationRecordValue = z.infer<typeof migrationRecordSchema>;
