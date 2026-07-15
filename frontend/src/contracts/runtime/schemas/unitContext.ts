import { z } from "zod";
import { contractSchemaId, SHARED_CONTRACT_VERSION } from "../constants";
import { nonEmptyStringSchema, semVerStringSchema, uuidStringSchema } from "./primitives";

export const unitSignConventionsSchema = z.strictObject({
  crossfall: z.enum(["right_down_positive", "left_down_positive"]).optional(),
  rotation: z.enum(["counterclockwise_positive", "clockwise_positive"]).optional(),
});

export const unitContextSchema = z
  .strictObject({
    schemaVersion: semVerStringSchema,
    contextId: uuidStringSchema,
    length: z.enum(["m", "mm", "ft", "in"]),
    angle: z.enum(["rad", "deg"]),
    force: z.enum(["N", "kN", "lbf"]).optional(),
    moment: z.enum(["N·m", "kN·m", "lbf·ft"]).optional(),
    mass: z.enum(["kg", "t", "lb"]).optional(),
    temperature: z.enum(["K", "°C", "°F"]).optional(),
    stress: z.enum(["Pa", "kPa", "MPa", "GPa"]).optional(),
    area: z.enum(["m²", "mm²", "ft²", "in²"]).optional(),
    inertia: z.enum(["m⁴", "mm⁴", "ft⁴", "in⁴"]).optional(),
    modulus: z.enum(["Pa", "kPa", "MPa", "GPa"]).optional(),
    time: z.enum(["s", "min", "h"]).optional(),
    signConventions: unitSignConventionsSchema.optional(),
    conversionVersion: nonEmptyStringSchema,
  })
  .meta({
    id: contractSchemaId("unit-context"),
    title: "UnitContext",
    contractVersion: SHARED_CONTRACT_VERSION,
  });

export type UnitContextValue = z.infer<typeof unitContextSchema>;
