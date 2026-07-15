import { z } from "zod";
import { BRIDGE_FRAME_ANALYSIS_DOCUMENT_SCHEMA_ID } from "../../contractVersionRegistry";
import { BRIDGE_FRAME_ANALYSIS_DOCUMENT_KIND } from "../../bridgeFrameAnalysisDocument";
import { contractSchemaId, SHARED_CONTRACT_VERSION } from "../constants";
import { capabilityBlockSchema } from "./capabilityBlock";
import { createCommonEnvelopeSchema } from "./commonEnvelope";
import { coordinateContextSchema } from "./coordinateContext";
import { documentReferenceSchema } from "./documentReference";
import { extensionsSchema } from "./extensions";
import { immutableResourceReferenceSchema } from "./immutableResourceReference";
import {
  analysisSettingsSchema,
  loadDefinitionEntrySchema,
  structuralModelSchema,
  transferBindingSchema,
} from "./domainSkeleton";
import { revisionMetadataSchema } from "./revision";
import { unitContextSchema } from "./unitContext";

export const bridgeFrameAnalysisDocumentSchema = createCommonEnvelopeSchema({
  fixedSchemaId: BRIDGE_FRAME_ANALYSIS_DOCUMENT_SCHEMA_ID,
  fixedDocumentKind: BRIDGE_FRAME_ANALYSIS_DOCUMENT_KIND,
})
  .extend({
    coordinateContexts: z.array(coordinateContextSchema).min(1),
    unitContext: unitContextSchema,
    structuralModel: structuralModelSchema,
    loadDefinitions: z.array(loadDefinitionEntrySchema),
    analysisSettings: analysisSettingsSchema,
    transferBindings: z.array(transferBindingSchema),
    revision: revisionMetadataSchema,
    validation: documentReferenceSchema,
    attachments: z.array(immutableResourceReferenceSchema).optional(),
    springsCapability: capabilityBlockSchema.optional(),
    memberReleasesCapability: capabilityBlockSchema.optional(),
    rigidOffsetsCapability: capabilityBlockSchema.optional(),
    fixedLoadsCapability: capabilityBlockSchema.optional(),
    influenceLiveLoadsCapability: capabilityBlockSchema.optional(),
    staticCombinationsCapability: capabilityBlockSchema.optional(),
    modalAnalysisCapability: capabilityBlockSchema.optional(),
    responseSpectrumCapability: capabilityBlockSchema.optional(),
    persistedResultRefs: z.array(documentReferenceSchema).optional(),
    reportRefs: z.array(documentReferenceSchema).optional(),
    draftRefs: z.array(documentReferenceSchema).optional(),
  })
  .meta({
    id: contractSchemaId("bridge-frame-analysis-document"),
    title: "BridgeFrameAnalysisDocument",
    contractVersion: SHARED_CONTRACT_VERSION,
  });

export type BridgeFrameAnalysisDocumentValue = z.infer<typeof bridgeFrameAnalysisDocumentSchema>;
