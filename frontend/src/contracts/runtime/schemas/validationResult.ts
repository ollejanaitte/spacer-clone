import { z } from "zod";
import { contractSchemaId, SHARED_CONTRACT_VERSION } from "../constants";
import {
  nonEmptyStringSchema,
  nonNegativeIntegerSchema,
  semVerStringSchema,
  validationSeveritySchema,
  validationStatusSchema,
} from "./primitives";

export const validationIssueSchema = z.strictObject({
  code: nonEmptyStringSchema,
  severity: validationSeveritySchema,
  message: nonEmptyStringSchema,
  path: z.string(),
  entityKind: nonEmptyStringSchema.optional(),
  entityId: nonEmptyStringSchema.optional(),
});

export const validationResultSchema = z
  .strictObject({
    schemaVersion: semVerStringSchema,
    status: validationStatusSchema,
    issues: z.array(validationIssueSchema),
    evaluatedRevision: nonNegativeIntegerSchema.optional(),
    evaluatedChecksum: nonEmptyStringSchema.optional(),
    ruleSetVersion: nonEmptyStringSchema.optional(),
  })
  .meta({
    id: contractSchemaId("validation-result"),
    title: "ValidationResult",
    contractVersion: SHARED_CONTRACT_VERSION,
  });

export type ValidationResultValue = z.infer<typeof validationResultSchema>;
