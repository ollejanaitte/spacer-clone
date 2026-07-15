import { z } from "zod";
import { contractSchemaId } from "../constants";
import { SHARED_CONTRACT_VERSION } from "../constants";
import { semVerStringSchema, uuidStringSchema } from "./primitives";

export const schemaIdentitySchema = z
  .strictObject({
    schemaId: z.string().min(1),
    schemaVersion: semVerStringSchema,
  })
  .meta({
    id: contractSchemaId("schema-identity"),
    title: "SchemaIdentity",
    contractVersion: SHARED_CONTRACT_VERSION,
  });

export type SchemaIdentityValue = z.infer<typeof schemaIdentitySchema>;

export const uuidValueSchema = uuidStringSchema.meta({
  id: contractSchemaId("uuid"),
  title: "UuidString",
  contractVersion: SHARED_CONTRACT_VERSION,
});

export type UuidValue = z.infer<typeof uuidValueSchema>;
