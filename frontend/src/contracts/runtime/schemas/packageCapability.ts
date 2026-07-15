import { z } from "zod";
import { PACKAGE_CAPABILITY_STATES } from "../../packageCapability";
import { contractSchemaId, SHARED_CONTRACT_VERSION } from "../constants";
import { nonEmptyStringSchema } from "./primitives";

export const packageCapabilityEntrySchema = z
  .strictObject({
    capabilityId: nonEmptyStringSchema,
    status: z.enum(PACKAGE_CAPABILITY_STATES),
    critical: z.boolean().optional(),
  })
  .meta({
    id: contractSchemaId("package-capability-entry"),
    title: "PackageCapabilityEntry",
    contractVersion: SHARED_CONTRACT_VERSION,
  });

export const capabilityAssessmentSummarySchema = z
  .strictObject({
    mutationBlocked: z.boolean(),
    blockedCapabilityIds: z.array(nonEmptyStringSchema).optional(),
  })
  .meta({
    id: contractSchemaId("capability-assessment-summary"),
    title: "CapabilityAssessmentSummary",
    contractVersion: SHARED_CONTRACT_VERSION,
  });

export type PackageCapabilityEntryValue = z.infer<typeof packageCapabilityEntrySchema>;
export type CapabilityAssessmentSummaryValue = z.infer<typeof capabilityAssessmentSummarySchema>;
