import { z } from "zod";
import { ENGINEERING_PROJECT_SCHEMA_ID } from "../../contractVersionRegistry";
import { ENGINEERING_PROJECT_DOCUMENT_KIND } from "../../engineeringProject";
import { contractSchemaId, SHARED_CONTRACT_VERSION } from "../constants";
import { contentChecksumSchema } from "./contentChecksum";
import { documentReferenceSchema } from "./documentReference";
import { extensionsSchema } from "./extensions";
import { nonEmptyStringSchema, positiveIntegerSchema, semVerStringSchema, uuidStringSchema } from "./primitives";
import { provenanceSchema } from "./provenance";
import { revisionMetadataSchema } from "./revision";

export const engineeringProjectSchema = z
  .strictObject({
    schemaId: z.literal(ENGINEERING_PROJECT_SCHEMA_ID),
    schemaVersion: semVerStringSchema,
    documentKind: z.literal(ENGINEERING_PROJECT_DOCUMENT_KIND),
    projectId: uuidStringSchema,
    revisionId: positiveIntegerSchema,
    contentChecksum: contentChecksumSchema,
    provenance: provenanceSchema,
    name: nonEmptyStringSchema,
    roadDesignRef: documentReferenceSchema.nullable(),
    frameAnalysisRefs: z.array(documentReferenceSchema),
    transferRecordRefs: z.array(documentReferenceSchema),
    projectRevisionMetadata: revisionMetadataSchema,
    extensions: extensionsSchema.optional(),
    unknownFieldStoreRef: documentReferenceSchema.optional(),
    migrationProvenanceRef: documentReferenceSchema.optional(),
  })
  .meta({
    id: contractSchemaId("engineering-project"),
    title: "EngineeringProject",
    contractVersion: SHARED_CONTRACT_VERSION,
  });

export type EngineeringProjectValue = z.infer<typeof engineeringProjectSchema>;
