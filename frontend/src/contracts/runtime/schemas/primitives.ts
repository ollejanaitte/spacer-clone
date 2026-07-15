import { z } from "zod";

/** Matches Step 0A `isSemVerString` — structural only; semantic checks remain in schemaIdentity. */
export const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

/** Matches Step 0A `isIso8601UtcTimestamp` surface form — semantic UTC check stays in provenance/revision. */
export const ISO_8601_UTC_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

export const uuidStringSchema = z.uuid();

export const semVerStringSchema = z.string().regex(SEMVER_PATTERN);

export const iso8601UtcTimestampSchema = z.string().regex(ISO_8601_UTC_PATTERN);

export const nonEmptyStringSchema = z.string().min(1);

export const finiteNumberSchema = z.number().refine(Number.isFinite, {
  message: "Must be a finite number.",
});

export const positiveIntegerSchema = z.number().int().positive();

export const nonNegativeIntegerSchema = z.number().int().min(0);

export const transformMatrix4x4Schema = z.tuple([
  finiteNumberSchema,
  finiteNumberSchema,
  finiteNumberSchema,
  finiteNumberSchema,
  finiteNumberSchema,
  finiteNumberSchema,
  finiteNumberSchema,
  finiteNumberSchema,
  finiteNumberSchema,
  finiteNumberSchema,
  finiteNumberSchema,
  finiteNumberSchema,
  finiteNumberSchema,
  finiteNumberSchema,
  finiteNumberSchema,
  finiteNumberSchema,
]);

export const axisNameSchema = z.enum(["x", "y", "z"]);

export const axisDirectionSchema = z.enum(["+x", "-x", "+y", "-y", "+z", "-z"]);

export const axisOrderSchema = z.tuple([axisNameSchema, axisNameSchema, axisNameSchema]);

export const actorTypeSchema = z.enum(["user", "system", "tool"]);

export const validationSeveritySchema = z.enum(["error", "warning", "info"]);

export const validationStatusSchema = z.enum(["valid", "invalid", "warning"]);
