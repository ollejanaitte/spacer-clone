import { z } from "zod";
import { contractSchemaId, SHARED_CONTRACT_VERSION } from "../constants";
import { documentReferenceSchema } from "./documentReference";
import {
  finiteNumberSchema,
  nonEmptyStringSchema,
  semVerStringSchema,
  uuidStringSchema,
} from "./primitives";
import { provenanceSchema } from "./provenance";

export const roadAlignmentEntrySchema = z.strictObject({
  entityId: uuidStringSchema,
  coordinateContextId: uuidStringSchema,
  label: nonEmptyStringSchema,
});

export const roadStationingEntrySchema = z.strictObject({
  entityId: uuidStringSchema,
  alignmentId: uuidStringSchema,
  originStation: finiteNumberSchema,
});

export const roadStationingSchema = z.strictObject({
  entries: z.array(roadStationingEntrySchema),
});

export const roadProfileEntrySchema = z.strictObject({
  entityId: uuidStringSchema,
  alignmentId: uuidStringSchema,
  label: nonEmptyStringSchema,
});

export const roadCrossSectionEntrySchema = z.strictObject({
  entityId: uuidStringSchema,
  profileId: uuidStringSchema,
  label: nonEmptyStringSchema,
});

export const roadBridgeEntrySchema = z.strictObject({
  entityId: uuidStringSchema,
  alignmentId: uuidStringSchema,
  label: nonEmptyStringSchema,
});

export const frameNodeEntrySchema = z.strictObject({
  entityId: uuidStringSchema,
  coordinateContextId: uuidStringSchema,
  x: finiteNumberSchema,
  y: finiteNumberSchema,
  z: finiteNumberSchema,
});

export const frameMaterialEntrySchema = z.strictObject({
  entityId: uuidStringSchema,
  label: nonEmptyStringSchema,
});

export const frameSectionEntrySchema = z.strictObject({
  entityId: uuidStringSchema,
  label: nonEmptyStringSchema,
});

export const frameMemberEntrySchema = z.strictObject({
  entityId: uuidStringSchema,
  nodeIId: uuidStringSchema,
  nodeJId: uuidStringSchema,
  materialId: uuidStringSchema,
  sectionId: uuidStringSchema,
});

export const frameSupportEntrySchema = z.strictObject({
  entityId: uuidStringSchema,
  nodeId: uuidStringSchema,
  label: nonEmptyStringSchema,
});

export const structuralModelSchema = z
  .strictObject({
    nodes: z.array(frameNodeEntrySchema),
    members: z.array(frameMemberEntrySchema),
    materials: z.array(frameMaterialEntrySchema),
    sections: z.array(frameSectionEntrySchema),
    supports: z.array(frameSupportEntrySchema),
  })
  .meta({
    id: contractSchemaId("structural-model-skeleton"),
    title: "StructuralModelSkeleton",
    contractVersion: SHARED_CONTRACT_VERSION,
  });

export const loadDefinitionEntrySchema = z.strictObject({
  entityId: uuidStringSchema,
  label: nonEmptyStringSchema,
  loadKind: z.enum(["dead", "live", "wind", "temperature", "other"]),
});

export const transferTargetEntityKindSchema = z.enum([
  "node",
  "member",
  "material",
  "section",
  "support",
  "load-definition",
  "analysis-settings",
]);

export const analysisSettingsSchema = z.strictObject({
  settingsId: uuidStringSchema,
  solverFamily: nonEmptyStringSchema,
  settingsVersion: semVerStringSchema,
});

export const transferBindingSchema = z.strictObject({
  bindingId: uuidStringSchema,
  sourceDocumentRef: documentReferenceSchema,
  mappingProvenance: provenanceSchema,
  targetEntityKind: transferTargetEntityKindSchema,
  targetEntityId: uuidStringSchema,
  sourceEntityId: uuidStringSchema,
});

export type RoadAlignmentEntryValue = z.infer<typeof roadAlignmentEntrySchema>;
export type RoadStationingValue = z.infer<typeof roadStationingSchema>;
export type RoadProfileEntryValue = z.infer<typeof roadProfileEntrySchema>;
export type RoadCrossSectionEntryValue = z.infer<typeof roadCrossSectionEntrySchema>;
export type RoadBridgeEntryValue = z.infer<typeof roadBridgeEntrySchema>;
export type StructuralModelValue = z.infer<typeof structuralModelSchema>;
export type LoadDefinitionEntryValue = z.infer<typeof loadDefinitionEntrySchema>;
export type AnalysisSettingsValue = z.infer<typeof analysisSettingsSchema>;
export type TransferBindingValue = z.infer<typeof transferBindingSchema>;
