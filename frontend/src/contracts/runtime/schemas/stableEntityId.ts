import { z } from "zod";
import { contractSchemaId, SHARED_CONTRACT_VERSION } from "../constants";
import { nonEmptyStringSchema, uuidStringSchema } from "./primitives";

export const displayAliasSchema = z.strictObject({
  label: nonEmptyStringSchema,
  purpose: nonEmptyStringSchema.optional(),
});

export const stableEntityIdSchema = z
  .strictObject({
    namespace: nonEmptyStringSchema,
    id: uuidStringSchema,
    entityKind: nonEmptyStringSchema,
    aliases: z.array(displayAliasSchema).optional(),
  })
  .meta({
    id: contractSchemaId("stable-entity-id"),
    title: "StableEntityId",
    contractVersion: SHARED_CONTRACT_VERSION,
  });

export type StableEntityIdValue = z.infer<typeof stableEntityIdSchema>;
