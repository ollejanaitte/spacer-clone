import { z } from "zod";
import type { DocumentKind } from "../../documentKind";
import { contractSchemaId, SHARED_CONTRACT_VERSION } from "../constants";
import { contentChecksumSchema } from "./contentChecksum";
import { documentKindSchema, documentReferenceSchema } from "./documentReference";
import { extensionsSchema } from "./extensions";
import { nonEmptyStringSchema, positiveIntegerSchema, semVerStringSchema, uuidStringSchema } from "./primitives";
import { provenanceSchema } from "./provenance";

export interface CreateCommonEnvelopeSchemaOptions {
  readonly fixedSchemaId?: string;
  readonly fixedDocumentKind?: DocumentKind;
}

export function createCommonEnvelopeSchema(
  options: CreateCommonEnvelopeSchemaOptions = {},
): z.ZodObject<{
  schemaId: z.ZodType<string>;
  schemaVersion: typeof semVerStringSchema;
  documentId: typeof uuidStringSchema;
  documentKind: z.ZodType<string>;
  revisionId: typeof positiveIntegerSchema;
  contentChecksum: typeof contentChecksumSchema;
  provenance: typeof provenanceSchema;
  extensions: z.ZodOptional<typeof extensionsSchema>;
  unknownFieldStoreRef: z.ZodOptional<typeof documentReferenceSchema>;
  migrationProvenanceRef: z.ZodOptional<typeof documentReferenceSchema>;
}> {
  const schemaIdSchema =
    options.fixedSchemaId !== undefined
      ? z.literal(options.fixedSchemaId)
      : nonEmptyStringSchema;

  const documentKindFieldSchema =
    options.fixedDocumentKind !== undefined
      ? z.literal(options.fixedDocumentKind)
      : documentKindSchema;

  return z
    .strictObject({
      schemaId: schemaIdSchema,
      schemaVersion: semVerStringSchema,
      documentId: uuidStringSchema,
      documentKind: documentKindFieldSchema,
      revisionId: positiveIntegerSchema,
      contentChecksum: contentChecksumSchema,
      provenance: provenanceSchema,
      extensions: extensionsSchema.optional(),
      unknownFieldStoreRef: documentReferenceSchema.optional(),
      migrationProvenanceRef: documentReferenceSchema.optional(),
    })
    .meta({
      id: contractSchemaId("common-envelope"),
      title: "CommonEnvelope",
      contractVersion: SHARED_CONTRACT_VERSION,
      reusableBaseShape: true,
    });
}

/** Generic reusable envelope shape; schemaId/documentKind are validated semantically. */
export const commonEnvelopeSchema = createCommonEnvelopeSchema();

export type CommonEnvelopeValue = z.infer<typeof commonEnvelopeSchema>;
