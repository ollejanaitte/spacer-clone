import { z } from "zod";
import { contractSchemaId, SHARED_CONTRACT_VERSION } from "../constants";
import { finiteNumberSchema, nonEmptyStringSchema } from "./primitives";

export const governedQuantityAdoptionStatusSchema = z.enum([
  "PENDING",
  "PLACEHOLDER",
  "UNKNOWN",
  "ADOPTED",
]);

export const governedQuantitySchema = z
  .strictObject({
    value: finiteNumberSchema.nullable(),
    units: nonEmptyStringSchema,
    adoptionStatus: governedQuantityAdoptionStatusSchema,
    sourceLocator: z.string().nullable(),
    decisionId: z.string().nullable().optional(),
  })
  .meta({
    id: contractSchemaId("governed-quantity"),
    title: "GovernedQuantity",
    contractVersion: SHARED_CONTRACT_VERSION,
  });

export type GovernedQuantityValue = z.infer<typeof governedQuantitySchema>;
export type GovernedQuantityAdoptionStatusValue = z.infer<
  typeof governedQuantityAdoptionStatusSchema
>;
