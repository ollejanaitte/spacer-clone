import { z } from "zod";
import { contractSchemaId, SHARED_CONTRACT_VERSION } from "../constants";
import {
  axisDirectionSchema,
  axisNameSchema,
  axisOrderSchema,
  finiteNumberSchema,
  nonEmptyStringSchema,
  semVerStringSchema,
  transformMatrix4x4Schema,
  uuidStringSchema,
} from "./primitives";

export const point3Schema = z.strictObject({
  x: finiteNumberSchema,
  y: finiteNumberSchema,
  z: finiteNumberSchema,
});

export const axisDirectionsSchema = z.strictObject({
  x: axisDirectionSchema,
  y: axisDirectionSchema,
  z: axisDirectionSchema,
});

export const orientationSpecSchema = z.strictObject({
  rotations: z.tuple([finiteNumberSchema, finiteNumberSchema, finiteNumberSchema]),
  rotationOrder: z.enum(["xyz", "xzy", "yxz", "yzx", "zxy", "zyx"]),
  rotationConvention: z.enum(["intrinsic", "extrinsic"]),
});

export const verifiedCanonicalTransformSchema = z.strictObject({
  transformVersion: nonEmptyStringSchema,
  status: z.literal("verified"),
  matrix: transformMatrix4x4Schema,
});

export const uncertainCanonicalTransformSchema = z.strictObject({
  transformVersion: nonEmptyStringSchema,
  status: z.enum(["unknown", "conflicted"]),
  matrix: transformMatrix4x4Schema.optional(),
});

export const canonicalTransformSchema = z.union([
  verifiedCanonicalTransformSchema,
  uncertainCanonicalTransformSchema,
]);

export const datumAuthoritySchema = z.strictObject({
  name: nonEmptyStringSchema,
  status: z.enum(["verified", "unknown", "conflicted"]),
  identifier: nonEmptyStringSchema.optional(),
});

export const stationConventionSchema = z.strictObject({
  tangentDirection: axisDirectionSchema,
  offsetSign: z.enum(["left_positive", "right_positive"]),
  elevationSign: z.enum(["up_positive", "down_positive"]),
});

export const coordinateContextSchema = z
  .strictObject({
    schemaVersion: semVerStringSchema,
    contextId: uuidStringSchema,
    referenceType: z.enum(["local", "project", "external-crs"]),
    referenceName: nonEmptyStringSchema,
    externalCrsIdentifier: nonEmptyStringSchema.optional(),
    origin: point3Schema,
    axisOrder: axisOrderSchema,
    axisDirections: axisDirectionsSchema,
    handedness: z.enum(["left", "right"]),
    verticalAxis: axisNameSchema,
    orientation: orientationSpecSchema,
    transformToCanonical: canonicalTransformSchema,
    horizontalDatum: datumAuthoritySchema.optional(),
    verticalDatum: datumAuthoritySchema.optional(),
    stationConvention: stationConventionSchema.optional(),
    angleUnit: z.enum(["rad", "deg"]),
    confidenceStatus: z.enum(["verified", "unknown", "conflicted"]),
  })
  .meta({
    id: contractSchemaId("coordinate-context"),
    title: "CoordinateContext",
    contractVersion: SHARED_CONTRACT_VERSION,
  });

export type CoordinateContextValue = z.infer<typeof coordinateContextSchema>;
