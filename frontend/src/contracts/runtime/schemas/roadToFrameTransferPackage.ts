import { z } from "zod";
import { ROAD_TO_FRAME_TRANSFER_PACKAGE_SCHEMA_ID } from "../../contractVersionRegistry";
import { ROAD_TO_FRAME_TRANSFER_PACKAGE_KIND } from "../../roadToFrameTransferPackage";
import { contractSchemaId, SHARED_CONTRACT_VERSION } from "../constants";
import { packageArtifactReferenceSchema } from "./artifactReference";
import { contentChecksumSchema } from "./contentChecksum";
import { coordinateContextSchema } from "./coordinateContext";
import { documentReferenceSchema } from "./documentReference";
import { extensionsSchema } from "./extensions";
import {
  capabilityAssessmentSummarySchema,
  packageCapabilityEntrySchema,
} from "./packageCapability";
import { provenanceSchema } from "./provenance";
import { semVerStringSchema, uuidStringSchema } from "./primitives";
import { transferPackageGeometrySchema } from "./transferGeometry";
import { unitContextSchema } from "./unitContext";

export const roadToFrameTransferPackageSchema = z
  .strictObject({
    schemaId: z.literal(ROAD_TO_FRAME_TRANSFER_PACKAGE_SCHEMA_ID),
    schemaVersion: semVerStringSchema,
    documentKind: z.literal(ROAD_TO_FRAME_TRANSFER_PACKAGE_KIND),
    packageId: uuidStringSchema,
    contentChecksum: contentChecksumSchema,
    provenance: provenanceSchema,
    sourceDocumentRef: documentReferenceSchema,
    coordinateContext: coordinateContextSchema,
    unitContext: unitContextSchema,
    capabilities: z.array(packageCapabilityEntrySchema),
    selection: z.array(uuidStringSchema),
    geometry: transferPackageGeometrySchema,
    validationRef: documentReferenceSchema.optional(),
    capabilityAssessmentSummary: capabilityAssessmentSummarySchema.optional(),
    extensions: extensionsSchema.optional(),
    unknownFieldStoreRef: documentReferenceSchema.optional(),
    parentPackageRef: packageArtifactReferenceSchema.optional(),
  })
  .meta({
    id: contractSchemaId("road-to-frame-transfer-package"),
    title: "RoadToFrameTransferPackage",
    contractVersion: SHARED_CONTRACT_VERSION,
  });

export type RoadToFrameTransferPackageValue = z.infer<typeof roadToFrameTransferPackageSchema>;
