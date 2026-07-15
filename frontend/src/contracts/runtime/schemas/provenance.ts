import { z } from "zod";
import { contractSchemaId, SHARED_CONTRACT_VERSION } from "../constants";
import {
  actorTypeSchema,
  iso8601UtcTimestampSchema,
  nonEmptyStringSchema,
} from "./primitives";

export const actorRefSchema = z.strictObject({
  actorId: nonEmptyStringSchema,
  actorType: actorTypeSchema,
  displayName: nonEmptyStringSchema.optional(),
});

export const toolProvenanceSchema = z.strictObject({
  toolId: nonEmptyStringSchema,
  toolVersion: nonEmptyStringSchema,
  algorithmVersion: nonEmptyStringSchema.optional(),
});

export const provenanceSchema = z
  .strictObject({
    createdAt: iso8601UtcTimestampSchema,
    createdBy: actorRefSchema,
    updatedAt: iso8601UtcTimestampSchema.optional(),
    updatedBy: actorRefSchema.optional(),
    producer: toolProvenanceSchema,
  })
  .meta({
    id: contractSchemaId("provenance"),
    title: "Provenance",
    contractVersion: SHARED_CONTRACT_VERSION,
  });

export type ProvenanceValue = z.infer<typeof provenanceSchema>;
