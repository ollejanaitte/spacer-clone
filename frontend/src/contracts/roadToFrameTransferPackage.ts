import type { PackageArtifactReference } from "./artifactReference";
import { validatePackageArtifactReference } from "./artifactReference";
import type { ContentChecksum } from "./contentChecksum";
import { validateContentChecksum } from "./contentChecksum";
import {
  ROAD_TO_FRAME_TRANSFER_PACKAGE_SCHEMA_ID,
  validateSupportedContractVersion,
} from "./contractVersionRegistry";
import {
  collectEntityIdIssues,
  findCrossCollectionDuplicateEntityIds,
  mergeEntityIdIssues,
  validateEntityIdReference,
  type EntityIdRef,
} from "./contractEntityRefs";
import type { CoordinateContext } from "./coordinateContext";
import { validateCoordinateContext } from "./coordinateContext";
import {
  validateDocumentReference,
  type DocumentReference,
} from "./documentReference";
import type { Extensions } from "./extensions";
import { validateExtensions } from "./extensions";
import type { Polyline3, Polygon3 } from "./geometryPrimitives";
import { validatePolygon3, validatePolyline3 } from "./geometryPrimitives";
import type {
  CapabilityAssessmentSummary,
  PackageCapabilityEntry,
} from "./packageCapability";
import {
  validateCapabilityAssessmentSummary,
  validatePackageCapabilityCollection,
} from "./packageCapability";
import type { Provenance } from "./provenance";
import { validateProvenance } from "./provenance";
import { ROAD_DESIGN_DOCUMENT_KIND } from "./roadDesignDocument";
import type { SchemaId, SchemaVersion } from "./schemaIdentity";
import type { UnitContext } from "./unitContext";
import { validateUnitContext } from "./unitContext";
import { isValidUuid, type UuidString } from "./uuid";
import {
  createValidationIssue,
  createValidationResult,
  type ValidationIssue,
  type ValidationResult,
} from "./validation";

export const ROAD_TO_FRAME_TRANSFER_PACKAGE_KIND = "road-to-frame-transfer-package" as const;

export interface AlignmentRefEntry {
  readonly entityId: UuidString;
  readonly provenance: Provenance;
  readonly dependencyIds: readonly UuidString[];
  readonly sourceAlignmentId: UuidString;
  readonly label?: string;
}

export interface StationRefEntry {
  readonly entityId: UuidString;
  readonly provenance: Provenance;
  readonly dependencyIds: readonly UuidString[];
  readonly alignmentRefId: UuidString;
  readonly station: number;
}

export type SubstructureKind = "abutment" | "pier" | "other";

export interface SubstructureEntry {
  readonly entityId: UuidString;
  readonly provenance: Provenance;
  readonly dependencyIds: readonly UuidString[];
  readonly kind: SubstructureKind;
  readonly point?: { readonly x: number; readonly y: number; readonly z: number };
  readonly polyline?: Polyline3;
}

export interface BearingLineEntry {
  readonly entityId: UuidString;
  readonly provenance: Provenance;
  readonly dependencyIds: readonly UuidString[];
  readonly polyline: Polyline3;
  readonly substructureId: UuidString;
}

export type SpanEndpointRefKind = "substructure" | "bearing-line";

export interface SpanEndpointRef {
  readonly refKind: SpanEndpointRefKind;
  readonly refId: UuidString;
}

export interface SpanEntry {
  readonly entityId: UuidString;
  readonly provenance: Provenance;
  readonly dependencyIds: readonly UuidString[];
  readonly startRef: SpanEndpointRef;
  readonly endRef: SpanEndpointRef;
  readonly length: number;
}

export interface MainGirderCandidateEntry {
  readonly entityId: UuidString;
  readonly provenance: Provenance;
  readonly dependencyIds: readonly UuidString[];
  readonly polyline: Polyline3;
  readonly spanIds: readonly UuidString[];
}

export interface CrossBeamCandidateEntry {
  readonly entityId: UuidString;
  readonly provenance: Provenance;
  readonly dependencyIds: readonly UuidString[];
  readonly polyline: Polyline3;
  readonly mainGirderIds: readonly UuidString[];
}

export type SurfaceRegionRole = "deck" | "pavement" | "haunch" | "other";
export type RoadRegionRole = "carriageway" | "sidewalk" | "median" | "other";

export interface SurfaceRegionEntry {
  readonly entityId: UuidString;
  readonly provenance: Provenance;
  readonly dependencyIds: readonly UuidString[];
  readonly polygon: Polygon3;
  readonly role: SurfaceRegionRole;
}

export interface RoadRegionEntry {
  readonly entityId: UuidString;
  readonly provenance: Provenance;
  readonly dependencyIds: readonly UuidString[];
  readonly polygon: Polygon3;
  readonly role: RoadRegionRole;
}

export interface LoadPlacementCandidateEntry {
  readonly entityId: UuidString;
  readonly provenance: Provenance;
  readonly dependencyIds: readonly UuidString[];
  readonly polyline?: Polyline3;
  readonly polygon?: Polygon3;
  readonly roadRegionIds: readonly UuidString[];
}

export interface TransferPackageGeometry {
  readonly alignmentRefs: readonly AlignmentRefEntry[];
  readonly stationRefs: readonly StationRefEntry[];
  readonly substructures: readonly SubstructureEntry[];
  readonly bearingLines: readonly BearingLineEntry[];
  readonly spans: readonly SpanEntry[];
  readonly mainGirderCandidates: readonly MainGirderCandidateEntry[];
  readonly crossBeamCandidates: readonly CrossBeamCandidateEntry[];
  readonly surfaceRegions: readonly SurfaceRegionEntry[];
  readonly roadRegions: readonly RoadRegionEntry[];
  readonly loadPlacementCandidates: readonly LoadPlacementCandidateEntry[];
}

export interface RoadToFrameTransferPackage {
  readonly schemaId: SchemaId;
  readonly schemaVersion: SchemaVersion;
  readonly documentKind: typeof ROAD_TO_FRAME_TRANSFER_PACKAGE_KIND;
  readonly packageId: UuidString;
  readonly contentChecksum: ContentChecksum;
  readonly provenance: Provenance;
  readonly sourceDocumentRef: DocumentReference;
  readonly coordinateContext: CoordinateContext;
  readonly unitContext: UnitContext;
  readonly capabilities: readonly PackageCapabilityEntry[];
  readonly selection: readonly UuidString[];
  readonly geometry: TransferPackageGeometry;
  readonly validationRef?: DocumentReference;
  readonly capabilityAssessmentSummary?: CapabilityAssessmentSummary;
  readonly extensions?: Extensions;
  readonly unknownFieldStoreRef?: DocumentReference;
  readonly parentPackageRef?: PackageArtifactReference;
}

const FORBIDDEN_PACKAGE_KEYS = [
  "structuralModel",
  "loadDefinitions",
  "analysisSettings",
  "transferBindings",
  "materials",
  "sections",
  "supports",
  "springs",
  "releases",
  "rigidOffsets",
  "nodes",
  "members",
  "loadCases",
  "loadCombinations",
  "solverSettings",
  "solverResults",
  "analysisResults",
  "viewerState",
  "femNodes",
  "femMembers",
  "persistedResultRefs",
  "materialActuals",
  "sectionStiffness",
  "bearingMechanics",
  "supportMechanics",
] as const;

export function detectForbiddenTransferPackageKeys(value: unknown): readonly string[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return [];
  }

  const record = value as Record<string, unknown>;
  return FORBIDDEN_PACKAGE_KEYS.filter((key) => key in record);
}

function joinPath(basePath: string, suffix: string): string {
  return basePath.length > 0 ? `${basePath}${suffix}` : suffix;
}

function collectCollectionEntityIds(
  entries: readonly { readonly entityId: UuidString }[],
): ReadonlySet<UuidString> {
  return new Set(entries.map((entry) => entry.entityId));
}

function validateCategoryRefInDependencies(
  refId: UuidString,
  dependencyIds: readonly UuidString[] | undefined,
  path: string,
): ValidationIssue | undefined {
  if (dependencyIds === undefined || !dependencyIds.includes(refId)) {
    return createValidationIssue({
      code: "TRANSFER_GEOMETRY_CATEGORY_REF_NOT_IN_DEPENDENCIES",
      severity: "error",
      message: "Category reference IDs must also appear in dependencyIds.",
      path,
      entityId: refId,
    });
  }
  return undefined;
}

function validateUuidRefsInCollection(
  ids: readonly UuidString[] | undefined,
  collectionIds: ReadonlySet<UuidString>,
  path: string,
  unresolvedCode: string,
  duplicateCode: string,
  unresolvedMessage: string,
  requireNonEmpty = false,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (ids === undefined) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_GEOMETRY_CATEGORY_REFS_MISSING",
        severity: "error",
        message: "Category reference array is required.",
        path,
      }),
    );
    return issues;
  }

  if (requireNonEmpty && ids.length === 0) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_GEOMETRY_CATEGORY_REFS_EMPTY",
        severity: "error",
        message: "Category reference array must be non-empty.",
        path,
      }),
    );
  }

  const seen = new Set<UuidString>();
  ids.forEach((refId, index) => {
    collectEntityIdIssues(
      issues,
      validateEntityIdReference(
        refId,
        collectionIds,
        `${path}/${index}`,
        unresolvedCode,
        unresolvedMessage,
      ),
    );

    if (seen.has(refId)) {
      issues.push(
        createValidationIssue({
          code: duplicateCode,
          severity: "error",
          message: "Category reference IDs must be unique within the array.",
          path: `${path}/${index}`,
          entityId: refId,
        }),
      );
    } else {
      seen.add(refId);
    }
  });

  return issues;
}

function validateSpanEndpointRef(
  endpoint: SpanEndpointRef | undefined,
  path: string,
  substructureIds: ReadonlySet<UuidString>,
  bearingLineIds: ReadonlySet<UuidString>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (endpoint === undefined) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_GEOMETRY_SPAN_ENDPOINT_MISSING",
        severity: "error",
        message: "Span endpoint reference is required.",
        path,
      }),
    );
    return issues;
  }

  if (endpoint.refKind === "substructure") {
    collectEntityIdIssues(
      issues,
      validateEntityIdReference(
        endpoint.refId,
        substructureIds,
        `${path}/refId`,
        "TRANSFER_GEOMETRY_SPAN_SUBSTRUCTURE_REF_UNRESOLVED",
        "substructure span endpoint refId must reference an existing substructures entity ID.",
      ),
    );
  } else if (endpoint.refKind === "bearing-line") {
    collectEntityIdIssues(
      issues,
      validateEntityIdReference(
        endpoint.refId,
        bearingLineIds,
        `${path}/refId`,
        "TRANSFER_GEOMETRY_SPAN_BEARING_LINE_REF_UNRESOLVED",
        "bearing-line span endpoint refId must reference an existing bearingLines entity ID.",
      ),
    );
  }

  return issues;
}

function validateDependencyIds(
  dependencyIds: readonly UuidString[] | undefined,
  entityId: UuidString | undefined,
  knownIds: ReadonlySet<UuidString>,
  path: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (dependencyIds === undefined) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_GEOMETRY_DEPENDENCY_IDS_MISSING",
        severity: "error",
        message: "dependencyIds is required.",
        path: `${path}/dependencyIds`,
      }),
    );
    return issues;
  }

  const seen = new Set<UuidString>();
  dependencyIds.forEach((dependencyId, index) => {
    if (entityId !== undefined && dependencyId === entityId) {
      issues.push(
        createValidationIssue({
          code: "TRANSFER_GEOMETRY_SELF_DEPENDENCY",
          severity: "error",
          message: "An entity must not depend on itself.",
          path: `${path}/dependencyIds/${index}`,
          entityId: dependencyId,
        }),
      );
    }

    if (seen.has(dependencyId)) {
      issues.push(
        createValidationIssue({
          code: "TRANSFER_GEOMETRY_DUPLICATE_DEPENDENCY",
          severity: "error",
          message: "dependencyIds must not contain duplicate entries.",
          path: `${path}/dependencyIds/${index}`,
          entityId: dependencyId,
        }),
      );
    } else {
      seen.add(dependencyId);
    }

    collectEntityIdIssues(
      issues,
      validateEntityIdReference(
        dependencyId,
        knownIds,
        `${path}/dependencyIds/${index}`,
        "TRANSFER_GEOMETRY_DEPENDENCY_UNRESOLVED",
        "dependencyIds must reference existing geometry entity IDs.",
      ),
    );
  });

  return issues;
}

const TRANSFER_PACKAGE_GEOMETRY_ARRAY_KEYS = [
  "alignmentRefs",
  "stationRefs",
  "substructures",
  "bearingLines",
  "spans",
  "mainGirderCandidates",
  "crossBeamCandidates",
  "surfaceRegions",
  "roadRegions",
  "loadPlacementCandidates",
] as const;

export function hasCompleteTransferPackageGeometry(
  geometry: Partial<TransferPackageGeometry> | undefined,
): geometry is TransferPackageGeometry {
  if (geometry === undefined) {
    return false;
  }

  for (const key of TRANSFER_PACKAGE_GEOMETRY_ARRAY_KEYS) {
    if (!Array.isArray(geometry[key])) {
      return false;
    }
  }

  return true;
}

function collectGeometryEntityIds(geometry: TransferPackageGeometry): EntityIdRef[] {
  const groups: EntityIdRef[][] = [
    geometry.alignmentRefs.map((entry, index) => ({
      id: entry.entityId,
      path: `/geometry/alignmentRefs/${index}/entityId`,
    })),
    geometry.stationRefs.map((entry, index) => ({
      id: entry.entityId,
      path: `/geometry/stationRefs/${index}/entityId`,
    })),
    geometry.substructures.map((entry, index) => ({
      id: entry.entityId,
      path: `/geometry/substructures/${index}/entityId`,
    })),
    geometry.bearingLines.map((entry, index) => ({
      id: entry.entityId,
      path: `/geometry/bearingLines/${index}/entityId`,
    })),
    geometry.spans.map((entry, index) => ({
      id: entry.entityId,
      path: `/geometry/spans/${index}/entityId`,
    })),
    geometry.mainGirderCandidates.map((entry, index) => ({
      id: entry.entityId,
      path: `/geometry/mainGirderCandidates/${index}/entityId`,
    })),
    geometry.crossBeamCandidates.map((entry, index) => ({
      id: entry.entityId,
      path: `/geometry/crossBeamCandidates/${index}/entityId`,
    })),
    geometry.surfaceRegions.map((entry, index) => ({
      id: entry.entityId,
      path: `/geometry/surfaceRegions/${index}/entityId`,
    })),
    geometry.roadRegions.map((entry, index) => ({
      id: entry.entityId,
      path: `/geometry/roadRegions/${index}/entityId`,
    })),
    geometry.loadPlacementCandidates.map((entry, index) => ({
      id: entry.entityId,
      path: `/geometry/loadPlacementCandidates/${index}/entityId`,
    })),
  ];

  return groups.flat();
}

function validateGeometryCollections(
  geometry: Partial<TransferPackageGeometry> | undefined,
  basePath: string,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (geometry === undefined) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_PACKAGE_GEOMETRY_MISSING",
        severity: "error",
        message: "geometry is required.",
        path: joinPath(basePath, "/geometry"),
      }),
    );
    return createValidationResult(issues);
  }

  for (const key of TRANSFER_PACKAGE_GEOMETRY_ARRAY_KEYS) {
    if (!Array.isArray(geometry[key])) {
      issues.push(
        createValidationIssue({
          code: "TRANSFER_PACKAGE_GEOMETRY_COLLECTION_MISSING",
          severity: "error",
          message: `geometry.${key} is required.`,
          path: joinPath(basePath, `/geometry/${key}`),
        }),
      );
    }
  }

  if (!hasCompleteTransferPackageGeometry(geometry)) {
    return createValidationResult(issues);
  }

  const completeGeometry = geometry;
  const entityIdRefs = collectGeometryEntityIds(completeGeometry);
  issues.push(
    ...findCrossCollectionDuplicateEntityIds(
      [entityIdRefs],
      "TRANSFER_GEOMETRY_ENTITY_ID_DUPLICATE",
      "Geometry entity IDs must be unique across all collections.",
    ),
  );

  const knownIds = new Set(entityIdRefs.map((entry) => entry.id));
  const alignmentRefIds = collectCollectionEntityIds(completeGeometry.alignmentRefs);
  const substructureIds = collectCollectionEntityIds(completeGeometry.substructures);
  const bearingLineIds = collectCollectionEntityIds(completeGeometry.bearingLines);
  const spanIds = collectCollectionEntityIds(completeGeometry.spans);
  const mainGirderIds = collectCollectionEntityIds(completeGeometry.mainGirderCandidates);
  const roadRegionIds = collectCollectionEntityIds(completeGeometry.roadRegions);

  completeGeometry.alignmentRefs.forEach((entry, index) => {
    const path = joinPath(basePath, `/geometry/alignmentRefs/${index}`);
    if (typeof entry.sourceAlignmentId !== "string" || !isValidUuid(entry.sourceAlignmentId)) {
      issues.push(
        createValidationIssue({
          code: "TRANSFER_GEOMETRY_SOURCE_ALIGNMENT_ID_INVALID",
          severity: "error",
          message: "sourceAlignmentId must be a valid UUID identifying the source Road alignment.",
          path: `${path}/sourceAlignmentId`,
        }),
      );
    }
    issues.push(...validateDependencyIds(entry.dependencyIds, entry.entityId, knownIds, path));
  });

  completeGeometry.stationRefs.forEach((entry, index) => {
    const path = joinPath(basePath, `/geometry/stationRefs/${index}`);
    if (typeof entry.station !== "number" || !Number.isFinite(entry.station)) {
      issues.push(
        createValidationIssue({
          code: "TRANSFER_GEOMETRY_STATION_NONFINITE",
          severity: "error",
          message: "station must be a finite number.",
          path: `${path}/station`,
        }),
      );
    }
    collectEntityIdIssues(
      issues,
      validateEntityIdReference(
        entry.alignmentRefId,
        alignmentRefIds,
        `${path}/alignmentRefId`,
        "TRANSFER_GEOMETRY_ALIGNMENT_REF_UNRESOLVED",
        "alignmentRefId must reference an existing alignmentRefs entity ID.",
      ),
    );
    collectEntityIdIssues(
      issues,
      validateCategoryRefInDependencies(
        entry.alignmentRefId,
        entry.dependencyIds,
        `${path}/alignmentRefId`,
      ),
    );
    issues.push(...validateDependencyIds(entry.dependencyIds, entry.entityId, knownIds, path));
  });

  completeGeometry.substructures.forEach((entry, index) => {
    const path = joinPath(basePath, `/geometry/substructures/${index}`);
    const hasPoint = entry.point !== undefined;
    const hasPolyline = entry.polyline !== undefined;
    if (hasPoint === hasPolyline) {
      issues.push(
        createValidationIssue({
          code: "TRANSFER_GEOMETRY_SUBSTRUCTURE_SHAPE_EXCLUSIVE",
          severity: "error",
          message: "Substructure must declare exactly one of point or polyline.",
          path,
        }),
      );
    }
    if (entry.polyline !== undefined) {
      issues.push(...validatePolyline3(entry.polyline, `${path}/polyline`).issues);
    }
    issues.push(...validateDependencyIds(entry.dependencyIds, entry.entityId, knownIds, path));
  });

  completeGeometry.bearingLines.forEach((entry, index) => {
    const path = joinPath(basePath, `/geometry/bearingLines/${index}`);
    issues.push(...validatePolyline3(entry.polyline, `${path}/polyline`).issues);
    collectEntityIdIssues(
      issues,
      validateEntityIdReference(
        entry.substructureId,
        substructureIds,
        `${path}/substructureId`,
        "TRANSFER_GEOMETRY_SUBSTRUCTURE_REF_UNRESOLVED",
        "substructureId must reference an existing substructures entity ID.",
      ),
    );
    collectEntityIdIssues(
      issues,
      validateCategoryRefInDependencies(
        entry.substructureId,
        entry.dependencyIds,
        `${path}/substructureId`,
      ),
    );
    issues.push(...validateDependencyIds(entry.dependencyIds, entry.entityId, knownIds, path));
  });

  completeGeometry.spans.forEach((entry, index) => {
    const path = joinPath(basePath, `/geometry/spans/${index}`);
    if (typeof entry.length !== "number" || !Number.isFinite(entry.length) || entry.length <= 0) {
      issues.push(
        createValidationIssue({
          code: "TRANSFER_GEOMETRY_SPAN_LENGTH_INVALID",
          severity: "error",
          message: "span length must be a finite positive number.",
          path: `${path}/length`,
        }),
      );
    }
    issues.push(
      ...validateSpanEndpointRef(
        entry.startRef,
        `${path}/startRef`,
        substructureIds,
        bearingLineIds,
      ),
      ...validateSpanEndpointRef(
        entry.endRef,
        `${path}/endRef`,
        substructureIds,
        bearingLineIds,
      ),
    );
    if (
      entry.startRef !== undefined &&
      entry.endRef !== undefined &&
      entry.startRef.refId === entry.endRef.refId &&
      entry.startRef.refKind === entry.endRef.refKind
    ) {
      issues.push(
        createValidationIssue({
          code: "TRANSFER_GEOMETRY_SPAN_ENDPOINTS_IDENTICAL",
          severity: "error",
          message: "span startRef and endRef must not reference the same endpoint.",
          path: `${path}/endRef`,
        }),
      );
    }
    if (entry.startRef !== undefined) {
      collectEntityIdIssues(
        issues,
        validateCategoryRefInDependencies(
          entry.startRef.refId,
          entry.dependencyIds,
          `${path}/startRef/refId`,
        ),
      );
    }
    if (entry.endRef !== undefined) {
      collectEntityIdIssues(
        issues,
        validateCategoryRefInDependencies(
          entry.endRef.refId,
          entry.dependencyIds,
          `${path}/endRef/refId`,
        ),
      );
    }
    issues.push(...validateDependencyIds(entry.dependencyIds, entry.entityId, knownIds, path));
  });

  completeGeometry.mainGirderCandidates.forEach((entry, index) => {
    const path = joinPath(basePath, `/geometry/mainGirderCandidates/${index}`);
    issues.push(...validatePolyline3(entry.polyline, `${path}/polyline`).issues);
    issues.push(
      ...validateUuidRefsInCollection(
        entry.spanIds,
        spanIds,
        `${path}/spanIds`,
        "TRANSFER_GEOMETRY_MAIN_GIRDER_SPAN_REF_UNRESOLVED",
        "TRANSFER_GEOMETRY_MAIN_GIRDER_SPAN_ID_DUPLICATE",
        "spanIds must reference existing spans entity IDs.",
        true,
      ),
    );
    for (const spanId of entry.spanIds ?? []) {
      collectEntityIdIssues(
        issues,
        validateCategoryRefInDependencies(spanId, entry.dependencyIds, `${path}/spanIds`),
      );
    }
    issues.push(...validateDependencyIds(entry.dependencyIds, entry.entityId, knownIds, path));
  });

  completeGeometry.crossBeamCandidates.forEach((entry, index) => {
    const path = joinPath(basePath, `/geometry/crossBeamCandidates/${index}`);
    issues.push(...validatePolyline3(entry.polyline, `${path}/polyline`).issues);
    issues.push(
      ...validateUuidRefsInCollection(
        entry.mainGirderIds,
        mainGirderIds,
        `${path}/mainGirderIds`,
        "TRANSFER_GEOMETRY_CROSS_BEAM_GIRDER_REF_UNRESOLVED",
        "TRANSFER_GEOMETRY_CROSS_BEAM_GIRDER_ID_DUPLICATE",
        "mainGirderIds must reference existing mainGirderCandidates entity IDs.",
        true,
      ),
    );
    for (const girderId of entry.mainGirderIds ?? []) {
      collectEntityIdIssues(
        issues,
        validateCategoryRefInDependencies(girderId, entry.dependencyIds, `${path}/mainGirderIds`),
      );
    }
    issues.push(...validateDependencyIds(entry.dependencyIds, entry.entityId, knownIds, path));
  });

  completeGeometry.surfaceRegions.forEach((entry, index) => {
    const path = joinPath(basePath, `/geometry/surfaceRegions/${index}`);
    issues.push(...validatePolygon3(entry.polygon, `${path}/polygon`).issues);
    issues.push(...validateDependencyIds(entry.dependencyIds, entry.entityId, knownIds, path));
  });

  completeGeometry.roadRegions.forEach((entry, index) => {
    const path = joinPath(basePath, `/geometry/roadRegions/${index}`);
    issues.push(...validatePolygon3(entry.polygon, `${path}/polygon`).issues);
    issues.push(...validateDependencyIds(entry.dependencyIds, entry.entityId, knownIds, path));
  });

  completeGeometry.loadPlacementCandidates.forEach((entry, index) => {
    const path = joinPath(basePath, `/geometry/loadPlacementCandidates/${index}`);
    const hasPolyline = entry.polyline !== undefined;
    const hasPolygon = entry.polygon !== undefined;
    if (hasPolyline === hasPolygon) {
      issues.push(
        createValidationIssue({
          code: "TRANSFER_GEOMETRY_LOAD_PLACEMENT_SHAPE_EXCLUSIVE",
          severity: "error",
          message: "loadPlacementCandidate must declare exactly one of polyline or polygon.",
          path,
        }),
      );
    }
    if (entry.polyline !== undefined) {
      issues.push(...validatePolyline3(entry.polyline, `${path}/polyline`).issues);
    }
    if (entry.polygon !== undefined) {
      issues.push(...validatePolygon3(entry.polygon, `${path}/polygon`).issues);
    }
    issues.push(
      ...validateUuidRefsInCollection(
        entry.roadRegionIds,
        roadRegionIds,
        `${path}/roadRegionIds`,
        "TRANSFER_GEOMETRY_LOAD_PLACEMENT_ROAD_REGION_REF_UNRESOLVED",
        "TRANSFER_GEOMETRY_LOAD_PLACEMENT_ROAD_REGION_ID_DUPLICATE",
        "roadRegionIds must reference existing roadRegions entity IDs.",
      ),
    );
    for (const regionId of entry.roadRegionIds ?? []) {
      collectEntityIdIssues(
        issues,
        validateCategoryRefInDependencies(regionId, entry.dependencyIds, `${path}/roadRegionIds`),
      );
    }
    issues.push(...validateDependencyIds(entry.dependencyIds, entry.entityId, knownIds, path));
  });

  return createValidationResult(issues);
}

function validateSelectionClosure(
  selection: readonly UuidString[] | undefined,
  geometry: TransferPackageGeometry,
  basePath: string,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const path = joinPath(basePath, "/selection");

  if (selection === undefined) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_PACKAGE_SELECTION_MISSING",
        severity: "error",
        message: "selection is required.",
        path,
      }),
    );
    return createValidationResult(issues);
  }

  const entityIdRefs = collectGeometryEntityIds(geometry);
  const knownIds = new Set(entityIdRefs.map((entry) => entry.id));
  const dependencyMap = new Map<UuidString, readonly UuidString[]>();
  const allEntries = [
    ...geometry.alignmentRefs,
    ...geometry.stationRefs,
    ...geometry.substructures,
    ...geometry.bearingLines,
    ...geometry.spans,
    ...geometry.mainGirderCandidates,
    ...geometry.crossBeamCandidates,
    ...geometry.surfaceRegions,
    ...geometry.roadRegions,
    ...geometry.loadPlacementCandidates,
  ];
  for (const entry of allEntries) {
    dependencyMap.set(entry.entityId, entry.dependencyIds);
  }

  const seen = new Set<UuidString>();
  const selectedIds: UuidString[] = [];

  selection.forEach((selectedId, index) => {
    if (!isValidUuid(selectedId)) {
      issues.push(
        createValidationIssue({
          code: "TRANSFER_PACKAGE_SELECTION_ID_INVALID",
          severity: "error",
          message: "selection entries must be valid UUID geometry IDs.",
          path: `${path}/${index}`,
        }),
      );
      return;
    }

    if (seen.has(selectedId)) {
      issues.push(
        createValidationIssue({
          code: "TRANSFER_PACKAGE_SELECTION_DUPLICATE",
          severity: "error",
          message: "selection entries must be unique.",
          path: `${path}/${index}`,
          entityId: selectedId,
        }),
      );
      return;
    }
    seen.add(selectedId);

    if (!knownIds.has(selectedId)) {
      issues.push(
        createValidationIssue({
          code: "TRANSFER_PACKAGE_SELECTION_MISSING_ENTITY",
          severity: "error",
          message: "selection must reference existing geometry entity IDs.",
          path: `${path}/${index}`,
          entityId: selectedId,
        }),
      );
      return;
    }

    selectedIds.push(selectedId);
  });

  const selectedSet = new Set(selectedIds);

  function computeDependencyClosure(rootId: UuidString): ReadonlySet<UuidString> {
    const closure = new Set<UuidString>();
    const stack = [rootId];
    while (stack.length > 0) {
      const current = stack.pop();
      if (current === undefined) {
        continue;
      }
      if (closure.has(current)) {
        continue;
      }
      closure.add(current);
      const dependencies = dependencyMap.get(current) ?? [];
      for (const dependencyId of dependencies) {
        if (!closure.has(dependencyId)) {
          stack.push(dependencyId);
        }
      }
    }
    return closure;
  }

  selectedIds.forEach((selectedId, index) => {
    const closure = computeDependencyClosure(selectedId);
    for (const dependencyId of closure) {
      if (!selectedSet.has(dependencyId)) {
        issues.push(
          createValidationIssue({
            code: "TRANSFER_PACKAGE_SELECTION_DEPENDENCY_CLOSURE",
            severity: "error",
            message: "selection must include the full dependency closure of each selected entity.",
            path: `${path}/${index}`,
            entityId: selectedId,
          }),
        );
        break;
      }
    }
  });

  return createValidationResult(issues);
}

export interface PackageApplyabilityResult {
  readonly applyable: boolean;
  readonly blockers: readonly ValidationIssue[];
}

export function assessPackageApplyability(
  pkg: RoadToFrameTransferPackage,
): PackageApplyabilityResult {
  const blockers: ValidationIssue[] = [];

  const versionResult = validateSupportedContractVersion(
    pkg.schemaId,
    pkg.schemaVersion,
    "/schemaVersion",
  );
  if (versionResult.status === "invalid") {
    blockers.push(...versionResult.issues);
  }

  const coordinateStatus = pkg.coordinateContext.confidenceStatus;
  if (coordinateStatus === "unknown" || coordinateStatus === "conflicted") {
    blockers.push(
      createValidationIssue({
        code: "TRANSFER_PACKAGE_COORDINATE_CONTEXT_BLOCKS_APPLY",
        severity: "error",
        message: "Coordinate context is not apply-ready.",
        path: "/coordinateContext/confidenceStatus",
      }),
    );
  }

  const transformStatus = pkg.coordinateContext.transformToCanonical.status;
  if (transformStatus === "unknown" || transformStatus === "conflicted") {
    blockers.push(
      createValidationIssue({
        code: "TRANSFER_PACKAGE_COORDINATE_TRANSFORM_BLOCKS_APPLY",
        severity: "error",
        message: "Canonical coordinate transform is not apply-ready.",
        path: "/coordinateContext/transformToCanonical/status",
      }),
    );
  }

  const unitResult = validateUnitContext(pkg.unitContext, "/unitContext", { profile: "road" });
  if (unitResult.status === "invalid") {
    blockers.push(...unitResult.issues);
  }

  for (const capability of pkg.capabilities) {
    if (
      capability.critical === true &&
      (capability.status === "unknown" || capability.status === "unsupported")
    ) {
      blockers.push(
        createValidationIssue({
          code: "TRANSFER_PACKAGE_CAPABILITY_BLOCKS_APPLY",
          severity: "error",
          message: `Critical capability "${capability.capabilityId}" blocks apply.`,
          path: "/capabilities",
        }),
      );
    }
  }

  if (pkg.capabilityAssessmentSummary?.mutationBlocked === true) {
    blockers.push(
      createValidationIssue({
        code: "TRANSFER_PACKAGE_MUTATION_BLOCKED",
        severity: "error",
        message: "Capability assessment marks this package as mutation-blocked.",
        path: "/capabilityAssessmentSummary/mutationBlocked",
      }),
    );
  }

  return {
    applyable: blockers.length === 0,
    blockers,
  };
}

export function validateRoadToFrameTransferPackage(
  pkg: Partial<RoadToFrameTransferPackage> | undefined,
  path = "",
): ValidationResult {
  const basePath = path.length > 0 ? path : "";

  if (pkg === undefined) {
    return createValidationResult([
      createValidationIssue({
        code: "TRANSFER_PACKAGE_MISSING",
        severity: "error",
        message: "RoadToFrameTransferPackage is required.",
        path: basePath,
      }),
    ]);
  }

  const issues: ValidationIssue[] = [];

  if (pkg.schemaId !== ROAD_TO_FRAME_TRANSFER_PACKAGE_SCHEMA_ID) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_PACKAGE_SCHEMA_ID_INVALID",
        severity: "error",
        message: `schemaId must be "${ROAD_TO_FRAME_TRANSFER_PACKAGE_SCHEMA_ID}".`,
        path: joinPath(basePath, "/schemaId"),
      }),
    );
  }

  issues.push(
    ...validateSupportedContractVersion(
      pkg.schemaId,
      pkg.schemaVersion,
      joinPath(basePath, "/schemaVersion"),
    ).issues,
  );

  if (pkg.documentKind !== ROAD_TO_FRAME_TRANSFER_PACKAGE_KIND) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_PACKAGE_DOCUMENT_KIND_INVALID",
        severity: "error",
        message: `documentKind must be "${ROAD_TO_FRAME_TRANSFER_PACKAGE_KIND}".`,
        path: joinPath(basePath, "/documentKind"),
      }),
    );
  }

  if (typeof pkg.packageId !== "string" || !isValidUuid(pkg.packageId)) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_PACKAGE_ID_INVALID",
        severity: "error",
        message: "packageId must be a valid UUID.",
        path: joinPath(basePath, "/packageId"),
      }),
    );
  }

  if ((pkg.geometry?.stationRefs?.length ?? 0) > 0) {
    if (pkg.coordinateContext?.stationConvention === undefined) {
      issues.push(
        createValidationIssue({
          code: "TRANSFER_PACKAGE_STATION_CONVENTION_REQUIRED",
          severity: "error",
          message: "coordinateContext.stationConvention is required when stationRefs are present.",
          path: joinPath(basePath, "/coordinateContext/stationConvention"),
        }),
      );
    }
  }

  issues.push(
    ...validateProvenance(pkg.provenance, joinPath(basePath, "/provenance")).issues,
    ...validateDocumentReference(
      pkg.sourceDocumentRef,
      joinPath(basePath, "/sourceDocumentRef"),
      ROAD_DESIGN_DOCUMENT_KIND,
    ).issues,
    ...validateCoordinateContext(pkg.coordinateContext, joinPath(basePath, "/coordinateContext")).issues,
    ...validateUnitContext(pkg.unitContext, joinPath(basePath, "/unitContext"), {
      profile: "road",
    }).issues,
    ...validatePackageCapabilityCollection(pkg.capabilities, joinPath(basePath, "/capabilities"))
      .issues,
    ...validateCapabilityAssessmentSummary(
      pkg.capabilityAssessmentSummary,
      joinPath(basePath, "/capabilityAssessmentSummary"),
      pkg.capabilities,
      pkg.coordinateContext,
    ).issues,
  );

  if (pkg.validationRef !== undefined) {
    issues.push(
      ...validateDocumentReference(
        pkg.validationRef,
        joinPath(basePath, "/validationRef"),
        "validation-result",
      ).issues,
    );
  }

  if (pkg.unknownFieldStoreRef !== undefined) {
    issues.push(
      ...validateDocumentReference(
        pkg.unknownFieldStoreRef,
        joinPath(basePath, "/unknownFieldStoreRef"),
        "unknown-field-store",
      ).issues,
    );
  }

  if (pkg.extensions !== undefined) {
    issues.push(...validateExtensions(pkg.extensions, joinPath(basePath, "/extensions")).issues);
  }

  if (pkg.parentPackageRef !== undefined) {
    issues.push(
      ...validatePackageArtifactReference(
        pkg.parentPackageRef,
        joinPath(basePath, "/parentPackageRef"),
      ).issues,
    );
    if (
      pkg.packageId !== undefined &&
      pkg.parentPackageRef.packageId !== undefined &&
      pkg.packageId === pkg.parentPackageRef.packageId
    ) {
      issues.push(
        createValidationIssue({
          code: "TRANSFER_PACKAGE_PARENT_SELF_REFERENCE",
          severity: "error",
          message: "parentPackageRef must not reference the same packageId.",
          path: joinPath(basePath, "/parentPackageRef/packageId"),
        }),
      );
    }
  }

  const geometryResult = validateGeometryCollections(pkg.geometry, basePath);
  issues.push(...geometryResult.issues);

  if (
    hasCompleteTransferPackageGeometry(pkg.geometry) &&
    geometryResult.status === "valid"
  ) {
    issues.push(
      ...validateSelectionClosure(pkg.selection, pkg.geometry, basePath).issues,
    );
  }

  const forbiddenKeys = detectForbiddenTransferPackageKeys(pkg);
  for (const key of forbiddenKeys) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_PACKAGE_FORBIDDEN_FIELD",
        severity: "error",
        message: `Prohibited frame or mechanics field "${key}" is not allowed in transfer packages.`,
        path: joinPath(basePath, `/${key}`),
      }),
    );
  }

  return createValidationResult(issues);
}

export function validateRoadToFrameTransferPackageInput(
  value: unknown,
  path = "",
): ValidationResult {
  const forbiddenKeys = detectForbiddenTransferPackageKeys(value);
  const issues = forbiddenKeys.map((key) =>
    createValidationIssue({
      code: "TRANSFER_PACKAGE_FORBIDDEN_FIELD",
      severity: "error",
      message: `Prohibited frame or mechanics field "${key}" is not allowed in transfer packages.`,
      path: path.length > 0 ? `${path}/${key}` : `/${key}`,
    }),
  );

  return mergeEntityIdIssues(issues);
}
