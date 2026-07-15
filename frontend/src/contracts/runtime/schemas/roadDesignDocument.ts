import { z } from "zod";
import { ROAD_DESIGN_DOCUMENT_SCHEMA_ID } from "../../contractVersionRegistry";
import { ROAD_DESIGN_DOCUMENT_KIND } from "../../roadDesignDocument";
import { contractSchemaId, SHARED_CONTRACT_VERSION } from "../constants";
import { capabilityBlockSchema } from "./capabilityBlock";
import { createCommonEnvelopeSchema } from "./commonEnvelope";
import { coordinateContextSchema } from "./coordinateContext";
import { documentReferenceSchema } from "./documentReference";
import { extensionsSchema } from "./extensions";
import { immutableResourceReferenceSchema } from "./immutableResourceReference";
import {
  roadAlignmentEntrySchema,
  roadBridgeEntrySchema,
  roadCrossSectionEntrySchema,
  roadProfileEntrySchema,
  roadStationingSchema,
} from "./domainSkeleton";
import { revisionMetadataSchema } from "./revision";
import { stableEntityIdSchema } from "./stableEntityId";
import { unitContextSchema } from "./unitContext";

export const roadDesignDocumentSchema = createCommonEnvelopeSchema({
  fixedSchemaId: ROAD_DESIGN_DOCUMENT_SCHEMA_ID,
  fixedDocumentKind: ROAD_DESIGN_DOCUMENT_KIND,
})
  .extend({
    coordinateContexts: z.array(coordinateContextSchema).min(1),
    unitContext: unitContextSchema,
    stableIdRegistry: z.array(stableEntityIdSchema),
    alignments: z.array(roadAlignmentEntrySchema),
    stationing: roadStationingSchema,
    profiles: z.array(roadProfileEntrySchema),
    crossSections: z.array(roadCrossSectionEntrySchema),
    bridges: z.array(roadBridgeEntrySchema),
    revision: revisionMetadataSchema,
    validation: documentReferenceSchema,
    sourceRefs: z.array(documentReferenceSchema).optional(),
    attachments: z.array(immutableResourceReferenceSchema).optional(),
    topologyCapability: capabilityBlockSchema.optional(),
    bridgeGeometryCapability: capabilityBlockSchema.optional(),
    ldistCapability: capabilityBlockSchema.optional(),
    haunchCapability: capabilityBlockSchema.optional(),
    hosoCapability: capabilityBlockSchema.optional(),
    drawingCapability: capabilityBlockSchema.optional(),
  })
  .meta({
    id: contractSchemaId("road-design-document"),
    title: "RoadDesignDocument",
    contractVersion: SHARED_CONTRACT_VERSION,
  });

export type RoadDesignDocumentValue = z.infer<typeof roadDesignDocumentSchema>;
