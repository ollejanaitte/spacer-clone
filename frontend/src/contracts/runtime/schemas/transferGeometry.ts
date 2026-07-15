import { z } from "zod";
import { contractSchemaId, SHARED_CONTRACT_VERSION } from "../constants";
import { point3Schema, polygon3Schema, polyline3Schema } from "./geometryPrimitives";
import { nonEmptyStringSchema, uuidStringSchema } from "./primitives";
import { provenanceSchema } from "./provenance";

const geometryEntityBaseSchema = z.strictObject({
  entityId: uuidStringSchema,
  provenance: provenanceSchema,
  dependencyIds: z.array(uuidStringSchema),
});

export const alignmentRefEntrySchema = geometryEntityBaseSchema.extend({
  sourceAlignmentId: uuidStringSchema,
  label: nonEmptyStringSchema.optional(),
});

export const stationRefEntrySchema = geometryEntityBaseSchema.extend({
  alignmentRefId: uuidStringSchema,
  station: z.number().refine(Number.isFinite, { message: "Must be a finite number." }),
});

export const substructureEntrySchema = geometryEntityBaseSchema.extend({
  kind: z.enum(["abutment", "pier", "other"]),
  point: point3Schema.optional(),
  polyline: polyline3Schema.optional(),
});

export const spanEndpointRefSchema = z.strictObject({
  refKind: z.enum(["substructure", "bearing-line"]),
  refId: uuidStringSchema,
});

export const bearingLineEntrySchema = geometryEntityBaseSchema.extend({
  polyline: polyline3Schema,
  substructureId: uuidStringSchema,
});

export const spanEntrySchema = geometryEntityBaseSchema.extend({
  startRef: spanEndpointRefSchema,
  endRef: spanEndpointRefSchema,
  length: z.number().refine((value) => Number.isFinite(value) && value > 0, {
    message: "Must be a finite positive number.",
  }),
});

export const mainGirderCandidateEntrySchema = geometryEntityBaseSchema.extend({
  polyline: polyline3Schema,
  spanIds: z.array(uuidStringSchema).min(1),
});

export const crossBeamCandidateEntrySchema = geometryEntityBaseSchema.extend({
  polyline: polyline3Schema,
  mainGirderIds: z.array(uuidStringSchema).min(1),
});

export const surfaceRegionEntrySchema = geometryEntityBaseSchema.extend({
  polygon: polygon3Schema,
  role: z.enum(["deck", "pavement", "haunch", "other"]),
});

export const roadRegionEntrySchema = geometryEntityBaseSchema.extend({
  polygon: polygon3Schema,
  role: z.enum(["carriageway", "sidewalk", "median", "other"]),
});

export const loadPlacementCandidateEntrySchema = geometryEntityBaseSchema.extend({
  polyline: polyline3Schema.optional(),
  polygon: polygon3Schema.optional(),
  roadRegionIds: z.array(uuidStringSchema),
});

export const transferPackageGeometrySchema = z
  .strictObject({
    alignmentRefs: z.array(alignmentRefEntrySchema),
    stationRefs: z.array(stationRefEntrySchema),
    substructures: z.array(substructureEntrySchema),
    bearingLines: z.array(bearingLineEntrySchema),
    spans: z.array(spanEntrySchema),
    mainGirderCandidates: z.array(mainGirderCandidateEntrySchema),
    crossBeamCandidates: z.array(crossBeamCandidateEntrySchema),
    surfaceRegions: z.array(surfaceRegionEntrySchema),
    roadRegions: z.array(roadRegionEntrySchema),
    loadPlacementCandidates: z.array(loadPlacementCandidateEntrySchema),
  })
  .meta({
    id: contractSchemaId("transfer-package-geometry"),
    title: "TransferPackageGeometry",
    contractVersion: SHARED_CONTRACT_VERSION,
  });

export type TransferPackageGeometryValue = z.infer<typeof transferPackageGeometrySchema>;
