import { z } from "zod";
import { contractSchemaId, SHARED_CONTRACT_VERSION } from "../constants";
import { contentChecksumSchema } from "./contentChecksum";
import { nonEmptyStringSchema } from "./primitives";

export const immutableResourceReferenceSchema = z
  .strictObject({
    uri: nonEmptyStringSchema,
    contentChecksum: contentChecksumSchema,
    mediaType: nonEmptyStringSchema.optional(),
  })
  .meta({
    id: contractSchemaId("immutable-resource-reference"),
    title: "ImmutableResourceReference",
    contractVersion: SHARED_CONTRACT_VERSION,
  });

export type ImmutableResourceReferenceValue = z.infer<typeof immutableResourceReferenceSchema>;
