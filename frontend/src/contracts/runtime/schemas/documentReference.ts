import { z } from "zod";
import { DOCUMENT_KINDS } from "../../documentKind";
import { contractSchemaId, SHARED_CONTRACT_VERSION } from "../constants";
import { contentChecksumSchema } from "./contentChecksum";
import { nonEmptyStringSchema, positiveIntegerSchema, uuidStringSchema } from "./primitives";

export const documentKindSchema = z.enum(DOCUMENT_KINDS);

export const documentReferenceSchema = z
  .strictObject({
    documentKind: documentKindSchema,
    documentId: uuidStringSchema,
    revisionId: positiveIntegerSchema,
    contentChecksum: contentChecksumSchema,
    uri: nonEmptyStringSchema.optional(),
    embeddedResourceKey: nonEmptyStringSchema.optional(),
    mediaType: nonEmptyStringSchema.optional(),
  })
  .meta({
    id: contractSchemaId("document-reference"),
    title: "DocumentReference",
    contractVersion: SHARED_CONTRACT_VERSION,
  });

export type DocumentReferenceValue = z.infer<typeof documentReferenceSchema>;
