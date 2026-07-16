import type { CapabilityBlock } from "./capabilityBlock";
import { validateCapabilityBlock } from "./capabilityBlock";
import type { ContentChecksum } from "./contentChecksum";
import {
  contentChecksumsEqual,
  validateContentChecksum,
} from "./contentChecksum";
import {
  ROAD_DESIGN_DOCUMENT_SCHEMA_ID,
  validateSupportedContractVersion,
} from "./contractVersionRegistry";
import {
  collectEntityIdIssues,
  findCrossCollectionDuplicateEntityIds,
  findDuplicateEntityIds,
  mergeEntityIdIssues,
  validateEntityIdReference,
} from "./contractEntityRefs";
import type { CoordinateContext } from "./coordinateContext";
import { validateCoordinateContext } from "./coordinateContext";
import {
  validateDocumentReference,
  type DocumentReference,
} from "./documentReference";
import type { Extensions } from "./extensions";
import { validateExtensions } from "./extensions";
import type { ImmutableResourceReference } from "./immutableResourceReference";
import { validateImmutableResourceReference } from "./immutableResourceReference";
import type { Provenance } from "./provenance";
import { validateProvenance } from "./provenance";
import {
  validateRevisionMetadata,
  type RevisionMetadata,
} from "./revision";
import type { SchemaId, SchemaVersion } from "./schemaIdentity";
import type { StableEntityId } from "./stableEntityId";
import { validateStableEntityId } from "./stableEntityId";
import type { UnitContext } from "./unitContext";
import { validateUnitContext } from "./unitContext";
import { isValidUuid, type UuidString } from "./uuid";
import {
  createValidationIssue,
  createValidationResult,
  mergeValidationResults,
  type ValidationIssue,
  type ValidationResult,
} from "./validation";

export const ROAD_DESIGN_DOCUMENT_KIND = "road-design" as const;

export interface RoadAlignmentEntry {
  readonly entityId: UuidString;
  readonly coordinateContextId: UuidString;
  readonly label: string;
}

export interface RoadStationingEntry {
  readonly entityId: UuidString;
  readonly alignmentId: UuidString;
  readonly originStation: number;
}

export interface RoadStationing {
  readonly entries: readonly RoadStationingEntry[];
}

export interface RoadProfileEntry {
  readonly entityId: UuidString;
  readonly alignmentId: UuidString;
  readonly label: string;
}

export interface RoadCrossSectionEntry {
  readonly entityId: UuidString;
  readonly profileId: UuidString;
  readonly label: string;
}

export interface RoadBridgeEntry {
  readonly entityId: UuidString;
  readonly alignmentId: UuidString;
  readonly label: string;
}

export interface RoadDesignDocument {
  readonly schemaId: SchemaId;
  readonly schemaVersion: SchemaVersion;
  readonly documentKind: typeof ROAD_DESIGN_DOCUMENT_KIND;
  readonly documentId: UuidString;
  readonly revisionId: number;
  readonly contentChecksum: ContentChecksum;
  readonly provenance: Provenance;
  readonly coordinateContexts: readonly CoordinateContext[];
  readonly unitContext: UnitContext;
  readonly stableIdRegistry: readonly StableEntityId[];
  readonly alignments: readonly RoadAlignmentEntry[];
  readonly stationing: RoadStationing;
  readonly profiles: readonly RoadProfileEntry[];
  readonly crossSections: readonly RoadCrossSectionEntry[];
  readonly bridges: readonly RoadBridgeEntry[];
  readonly revision: RevisionMetadata;
  readonly validation: DocumentReference;
  readonly extensions?: Extensions;
  readonly unknownFieldStoreRef?: DocumentReference;
  readonly migrationProvenanceRef?: DocumentReference;
  readonly sourceRefs?: readonly DocumentReference[];
  readonly attachments?: readonly ImmutableResourceReference[];
  readonly topologyCapability?: CapabilityBlock;
  readonly bridgeGeometryCapability?: CapabilityBlock;
  readonly ldistCapability?: CapabilityBlock;
  readonly haunchCapability?: CapabilityBlock;
  readonly hosoCapability?: CapabilityBlock;
  readonly drawingCapability?: CapabilityBlock;
}

const FORBIDDEN_FRAME_MECHANICS_KEYS = [
  "structuralModel",
  "loadDefinitions",
  "analysisSettings",
  "transferBindings",
  "materials",
  "sections",
  "supports",
  "springs",
  "nodes",
  "members",
  "loadCases",
  "solverResults",
  "analysisResults",
  "viewerState",
  "femNodes",
  "femMembers",
  "persistedResultRefs",
] as const;

export function detectForbiddenRoadFrameMechanicsKeys(value: unknown): readonly string[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return [];
  }

  const record = value as Record<string, unknown>;
  return FORBIDDEN_FRAME_MECHANICS_KEYS.filter((key) => key in record);
}

function joinPath(basePath: string, suffix: string): string {
  return basePath.length > 0 ? `${basePath}${suffix}` : suffix;
}

function validateRevisionConsistency(
  document: Partial<RoadDesignDocument>,
  basePath: string,
): ValidationResult {
  const revision = document.revision;
  if (revision === undefined) {
    return createValidationResult([]);
  }

  const issues: ValidationIssue[] = [];

  if (
    document.documentId !== undefined &&
    revision.documentId !== undefined &&
    document.documentId !== revision.documentId
  ) {
    issues.push(
      createValidationIssue({
        code: "ROAD_DESIGN_REVISION_DOCUMENT_ID_MISMATCH",
        severity: "error",
        message: "documentId must match revision.documentId.",
        path: joinPath(basePath, "/revision/documentId"),
      }),
    );
  }

  if (
    document.revisionId !== undefined &&
    revision.revisionId !== undefined &&
    document.revisionId !== revision.revisionId
  ) {
    issues.push(
      createValidationIssue({
        code: "ROAD_DESIGN_REVISION_ID_MISMATCH",
        severity: "error",
        message: "revisionId must match revision.revisionId.",
        path: joinPath(basePath, "/revision/revisionId"),
      }),
    );
  }

  if (
    document.contentChecksum !== undefined &&
    revision.contentChecksum !== undefined &&
    !contentChecksumsEqual(document.contentChecksum, revision.contentChecksum)
  ) {
    issues.push(
      createValidationIssue({
        code: "ROAD_DESIGN_REVISION_CHECKSUM_MISMATCH",
        severity: "error",
        message: "contentChecksum must match revision.contentChecksum.",
        path: joinPath(basePath, "/revision/contentChecksum"),
      }),
    );
  }

  return createValidationResult(issues);
}

const ROAD_STABLE_ENTITY_KINDS = {
  alignment: "alignment",
  stationing: "stationing",
  profile: "profile",
  crossSection: "cross-section",
  bridge: "bridge",
  centerline: "centerline",
} as const;

function validateRoadCoordinateContexts(
  contexts: readonly CoordinateContext[] | undefined,
  basePath: string,
): ValidationResult {
  if (contexts === undefined) {
    return createValidationResult([
      createValidationIssue({
        code: "ROAD_DESIGN_COORDINATE_CONTEXTS_MISSING",
        severity: "error",
        message: "coordinateContexts is required.",
        path: joinPath(basePath, "/coordinateContexts"),
      }),
    ]);
  }

  if (contexts.length === 0) {
    return createValidationResult([
      createValidationIssue({
        code: "ROAD_DESIGN_COORDINATE_CONTEXTS_EMPTY",
        severity: "error",
        message: "coordinateContexts must contain at least one entry.",
        path: joinPath(basePath, "/coordinateContexts"),
      }),
    ]);
  }

  const hasStationCapableContext = contexts.some(
    (context) => context.stationConvention !== undefined,
  );

  if (!hasStationCapableContext) {
    return createValidationResult([
      createValidationIssue({
        code: "ROAD_DESIGN_STATION_CAPABLE_CONTEXT_REQUIRED",
        severity: "error",
        message:
          "At least one coordinateContext must declare stationConvention for road station geometry.",
        path: joinPath(basePath, "/coordinateContexts"),
      }),
    ]);
  }

  return createValidationResult([]);
}

function validateStableIdRegistryConsistency(
  document: Partial<RoadDesignDocument>,
  basePath: string,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const registry = document.stableIdRegistry ?? [];

  const entityExpectations: Array<{ id: UuidString; kind: string; path: string }> = [];

  document.alignments?.forEach((alignment, index) => {
    entityExpectations.push({
      id: alignment.entityId,
      kind: ROAD_STABLE_ENTITY_KINDS.alignment,
      path: joinPath(basePath, `/alignments/${index}/entityId`),
    });
  });
  document.stationing?.entries.forEach((entry, index) => {
    entityExpectations.push({
      id: entry.entityId,
      kind: ROAD_STABLE_ENTITY_KINDS.stationing,
      path: joinPath(basePath, `/stationing/entries/${index}/entityId`),
    });
  });
  document.profiles?.forEach((profile, index) => {
    entityExpectations.push({
      id: profile.entityId,
      kind: ROAD_STABLE_ENTITY_KINDS.profile,
      path: joinPath(basePath, `/profiles/${index}/entityId`),
    });
  });
  document.crossSections?.forEach((crossSection, index) => {
    entityExpectations.push({
      id: crossSection.entityId,
      kind: ROAD_STABLE_ENTITY_KINDS.crossSection,
      path: joinPath(basePath, `/crossSections/${index}/entityId`),
    });
  });
  document.bridges?.forEach((bridge, index) => {
    entityExpectations.push({
      id: bridge.entityId,
      kind: ROAD_STABLE_ENTITY_KINDS.bridge,
      path: joinPath(basePath, `/bridges/${index}/entityId`),
    });
  });

  const registryById = new Map<string, { kind: string; path: string }>();
  registry.forEach((entry, index) => {
    if (!isValidUuid(entry.id)) {
      return;
    }
    registryById.set(entry.id, {
      kind: entry.entityKind,
      path: joinPath(basePath, `/stableIdRegistry/${index}`),
    });
  });

  const entityIds = new Set<UuidString>();
  for (const expectation of entityExpectations) {
    if (!isValidUuid(expectation.id)) {
      continue;
    }
    entityIds.add(expectation.id);

    const registryEntry = registryById.get(expectation.id);
    if (registryEntry === undefined) {
      issues.push(
        createValidationIssue({
          code: "ROAD_DESIGN_STABLE_ID_REGISTRY_ENTRY_MISSING",
          severity: "error",
          message: "stableIdRegistry must contain an entry for every road design entity.",
          path: expectation.path,
          entityId: expectation.id,
        }),
      );
      continue;
    }

    if (registryEntry.kind !== expectation.kind) {
      issues.push(
        createValidationIssue({
          code: "ROAD_DESIGN_STABLE_ID_REGISTRY_KIND_MISMATCH",
          severity: "error",
          message: `stableIdRegistry entityKind must be "${expectation.kind}" for this entity.`,
          path: registryEntry.path,
          entityId: expectation.id,
        }),
      );
    }
  }

  registry.forEach((entry, index) => {
    if (!isValidUuid(entry.id)) {
      return;
    }
    if (entry.entityKind === ROAD_STABLE_ENTITY_KINDS.centerline) {
      return;
    }
    if (!entityIds.has(entry.id)) {
      issues.push(
        createValidationIssue({
          code: "ROAD_DESIGN_STABLE_ID_REGISTRY_ORPHAN",
          severity: "error",
          message: "stableIdRegistry entry does not correspond to any road design entity.",
          path: joinPath(basePath, `/stableIdRegistry/${index}`),
          entityId: entry.id,
        }),
      );
    }
  });

  return createValidationResult(issues);
}

function validateRoadEntityGraph(
  document: Partial<RoadDesignDocument>,
  basePath: string,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  const coordinateContextIds = new Set<UuidString>();
  document.coordinateContexts?.forEach((context) => {
    if (isValidUuid(context.contextId)) {
      coordinateContextIds.add(context.contextId);
    }
  });

  issues.push(
    ...findDuplicateEntityIds(
      document.coordinateContexts?.map((entry, entryIndex) => ({
        id: entry.contextId,
        path: joinPath(basePath, `/coordinateContexts/${entryIndex}/contextId`),
      })) ?? [],
      "ROAD_DESIGN_COORDINATE_CONTEXT_ID_DUPLICATE",
      "coordinateContext contextId values must be unique.",
    ),
    ...findCrossCollectionDuplicateEntityIds(
      [
        document.alignments?.map((entry, index) => ({
          id: entry.entityId,
          path: joinPath(basePath, `/alignments/${index}/entityId`),
        })) ?? [],
        document.stationing?.entries.map((entry, index) => ({
          id: entry.entityId,
          path: joinPath(basePath, `/stationing/entries/${index}/entityId`),
        })) ?? [],
        document.profiles?.map((entry, index) => ({
          id: entry.entityId,
          path: joinPath(basePath, `/profiles/${index}/entityId`),
        })) ?? [],
        document.crossSections?.map((entry, index) => ({
          id: entry.entityId,
          path: joinPath(basePath, `/crossSections/${index}/entityId`),
        })) ?? [],
        document.bridges?.map((entry, index) => ({
          id: entry.entityId,
          path: joinPath(basePath, `/bridges/${index}/entityId`),
        })) ?? [],
      ],
      "ROAD_DESIGN_ENTITY_ID_CROSS_COLLECTION_DUPLICATE",
      "entityId values must be unique across road design entities.",
    ),
    ...findDuplicateEntityIds(
      document.stableIdRegistry?.map((entry, index) => ({
        id: entry.id,
        path: joinPath(basePath, `/stableIdRegistry/${index}/id`),
      })) ?? [],
      "ROAD_DESIGN_STABLE_ID_DUPLICATE",
      "stableIdRegistry id values must be unique.",
    ),
  );
  const alignmentIds = new Set<UuidString>();
  document.alignments?.forEach((alignment, index) => {
    alignmentIds.add(alignment.entityId);
    collectEntityIdIssues(
      issues,
      validateEntityIdReference(
        alignment.coordinateContextId,
        coordinateContextIds,
        joinPath(basePath, `/alignments/${index}/coordinateContextId`),
        "ROAD_DESIGN_COORDINATE_CONTEXT_REF_UNRESOLVED",
        "alignment coordinateContextId must reference a declared coordinateContext.",
      ),
    );
  });

  document.stationing?.entries.forEach((entry, index) => {
    collectEntityIdIssues(
      issues,
      validateEntityIdReference(
        entry.alignmentId,
        alignmentIds,
        joinPath(basePath, `/stationing/entries/${index}/alignmentId`),
        "ROAD_DESIGN_ALIGNMENT_REF_UNRESOLVED",
        "stationing alignmentId must reference a declared alignment.",
      ),
    );
  });

  const profileIds = new Set<UuidString>();
  document.profiles?.forEach((profile, index) => {
    profileIds.add(profile.entityId);
    collectEntityIdIssues(
      issues,
      validateEntityIdReference(
        profile.alignmentId,
        alignmentIds,
        joinPath(basePath, `/profiles/${index}/alignmentId`),
        "ROAD_DESIGN_ALIGNMENT_REF_UNRESOLVED",
        "profile alignmentId must reference a declared alignment.",
      ),
    );
  });

  document.crossSections?.forEach((crossSection, index) => {
    collectEntityIdIssues(
      issues,
      validateEntityIdReference(
        crossSection.profileId,
        profileIds,
        joinPath(basePath, `/crossSections/${index}/profileId`),
        "ROAD_DESIGN_PROFILE_REF_UNRESOLVED",
        "crossSection profileId must reference a declared profile.",
      ),
    );
  });

  document.bridges?.forEach((bridge, index) => {
    collectEntityIdIssues(
      issues,
      validateEntityIdReference(
        bridge.alignmentId,
        alignmentIds,
        joinPath(basePath, `/bridges/${index}/alignmentId`),
        "ROAD_DESIGN_ALIGNMENT_REF_UNRESOLVED",
        "bridge alignmentId must reference a declared alignment.",
      ),
    );
  });

  return mergeEntityIdIssues(issues);
}

export function validateRoadDesignDocument(
  document: Partial<RoadDesignDocument> | undefined,
  path = "",
): ValidationResult {
  const basePath = path.length > 0 ? path : "";

  if (document === undefined) {
    return createValidationResult([
      createValidationIssue({
        code: "ROAD_DESIGN_DOCUMENT_MISSING",
        severity: "error",
        message: "RoadDesignDocument is required.",
        path: basePath,
      }),
    ]);
  }

  const issues: ValidationIssue[] = [];

  if (document.schemaId !== ROAD_DESIGN_DOCUMENT_SCHEMA_ID) {
    issues.push(
      createValidationIssue({
        code: "ROAD_DESIGN_SCHEMA_ID_INVALID",
        severity: "error",
        message: `schemaId must be "${ROAD_DESIGN_DOCUMENT_SCHEMA_ID}".`,
        path: joinPath(basePath, "/schemaId"),
      }),
    );
  }

  if (document.documentKind !== ROAD_DESIGN_DOCUMENT_KIND) {
    issues.push(
      createValidationIssue({
        code: "ROAD_DESIGN_DOCUMENT_KIND_INVALID",
        severity: "error",
        message: `documentKind must be "${ROAD_DESIGN_DOCUMENT_KIND}".`,
        path: joinPath(basePath, "/documentKind"),
      }),
    );
  }

  detectForbiddenRoadFrameMechanicsKeys(document).forEach((key) => {
    issues.push(
      createValidationIssue({
        code: "ROAD_DESIGN_FRAME_MECHANICS_FORBIDDEN",
        severity: "error",
        message: `Frame mechanics field "${key}" is prohibited on RoadDesignDocument.`,
        path: joinPath(basePath, `/${key}`),
      }),
    );
  });

  const coordinateContextResults = (document.coordinateContexts ?? []).map((context, index) =>
    validateCoordinateContext(
      context,
      joinPath(basePath, `/coordinateContexts/${index}`),
    ),
  );

  const capabilityBlocks: Array<[CapabilityBlock | undefined, string]> = [
    [document.topologyCapability, "/topologyCapability"],
    [document.bridgeGeometryCapability, "/bridgeGeometryCapability"],
    [document.ldistCapability, "/ldistCapability"],
    [document.haunchCapability, "/haunchCapability"],
    [document.hosoCapability, "/hosoCapability"],
    [document.drawingCapability, "/drawingCapability"],
  ];

  const capabilityResults = capabilityBlocks.map(([block, suffix]) =>
    validateCapabilityBlock(block, joinPath(basePath, suffix)),
  );

  const attachmentResults = (document.attachments ?? []).map((attachment, index) =>
    validateImmutableResourceReference(
      attachment,
      joinPath(basePath, `/attachments/${index}`),
    ),
  );

  const stableIdResults = (document.stableIdRegistry ?? []).map((entry, index) =>
    validateStableEntityId(entry, joinPath(basePath, `/stableIdRegistry/${index}`)),
  );

  const sourceRefIssues: ValidationIssue[] = [];
  const seenSourceRefs = new Set<string>();
  document.sourceRefs?.forEach((reference, index) => {
    const itemPath = joinPath(basePath, `/sourceRefs/${index}`);
    sourceRefIssues.push(...validateDocumentReference(reference, itemPath).issues);
    const identity = `${reference.documentKind}:${reference.documentId}:${reference.revisionId}`;
    if (seenSourceRefs.has(identity)) {
      sourceRefIssues.push(
        createValidationIssue({
          code: "DOCUMENT_REFERENCE_DUPLICATE",
          severity: "error",
          message: "Duplicate document references are prohibited.",
          path: itemPath,
        }),
      );
    } else {
      seenSourceRefs.add(identity);
    }
  });

  return mergeValidationResults(
    createValidationResult(issues),
    validateSupportedContractVersion(
      ROAD_DESIGN_DOCUMENT_SCHEMA_ID,
      document.schemaVersion,
      joinPath(basePath, ""),
    ),
    validateContentChecksum(document.contentChecksum, joinPath(basePath, "/contentChecksum")),
    validateProvenance(document.provenance, joinPath(basePath, "/provenance")),
    validateExtensions(document.extensions, joinPath(basePath, "/extensions")),
    validateRevisionMetadata(document.revision, joinPath(basePath, "/revision")),
    validateRevisionConsistency(document, basePath),
    validateUnitContext(document.unitContext, joinPath(basePath, "/unitContext"), {
      profile: "road",
    }),
    validateRoadCoordinateContexts(document.coordinateContexts, basePath),
    validateRoadEntityGraph(document, basePath),
    validateStableIdRegistryConsistency(document, basePath),
    validateDocumentReference(
      document.validation,
      joinPath(basePath, "/validation"),
      "validation-result",
    ),
    createValidationResult(sourceRefIssues),
    document.unknownFieldStoreRef === undefined
      ? createValidationResult([])
      : validateDocumentReference(
          document.unknownFieldStoreRef,
          joinPath(basePath, "/unknownFieldStoreRef"),
          "unknown-field-store",
        ),
    document.migrationProvenanceRef === undefined
      ? createValidationResult([])
      : validateDocumentReference(
          document.migrationProvenanceRef,
          joinPath(basePath, "/migrationProvenanceRef"),
          "migration-record",
        ),
    ...coordinateContextResults,
    ...capabilityResults,
    ...attachmentResults,
    ...stableIdResults,
  );
}
