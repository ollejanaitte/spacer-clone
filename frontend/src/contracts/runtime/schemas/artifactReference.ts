import { z } from "zod";
import { contractSchemaId, SHARED_CONTRACT_VERSION } from "../constants";
import { contentChecksumSchema } from "./contentChecksum";
import { semVerStringSchema, uuidStringSchema } from "./primitives";

export const packageArtifactReferenceSchema = z
  .strictObject({
    packageId: uuidStringSchema,
    schemaVersion: semVerStringSchema,
    contentChecksum: contentChecksumSchema,
  })
  .meta({
    id: contractSchemaId("package-artifact-reference"),
    title: "PackageArtifactReference",
    contractVersion: SHARED_CONTRACT_VERSION,
  });

export const transferRecordArtifactReferenceSchema = z
  .strictObject({
    recordId: uuidStringSchema,
    schemaVersion: semVerStringSchema,
    contentChecksum: contentChecksumSchema,
  })
  .meta({
    id: contractSchemaId("transfer-record-artifact-reference"),
    title: "TransferRecordArtifactReference",
    contractVersion: SHARED_CONTRACT_VERSION,
  });

export const policyReferenceSchema = z
  .strictObject({
    policyId: z.string().min(1),
    schemaVersion: semVerStringSchema,
    contentChecksum: contentChecksumSchema,
  })
  .meta({
    id: contractSchemaId("policy-reference"),
    title: "PolicyReference",
    contractVersion: SHARED_CONTRACT_VERSION,
  });

export type PackageArtifactReferenceValue = z.infer<typeof packageArtifactReferenceSchema>;
export type TransferRecordArtifactReferenceValue = z.infer<
  typeof transferRecordArtifactReferenceSchema
>;
export type PolicyReferenceValue = z.infer<typeof policyReferenceSchema>;
