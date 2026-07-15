import type { CapabilityBlock } from "./capabilityBlock";
import { validateCapabilityBlock } from "./capabilityBlock";
import type { ContentChecksum } from "./contentChecksum";
import {
  contentChecksumsEqual,
  validateContentChecksum,
} from "./contentChecksum";
import {
  BRIDGE_FRAME_ANALYSIS_DOCUMENT_SCHEMA_ID,
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
  validateDocumentReferenceCollection,
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
import { isSemVerString } from "./schemaIdentity";
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

export const BRIDGE_FRAME_ANALYSIS_DOCUMENT_KIND = "bridge-frame-analysis" as const;

export interface FrameNodeEntry {
  readonly entityId: UuidString;
  readonly coordinateContextId: UuidString;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface FrameMaterialEntry {
  readonly entityId: UuidString;
  readonly label: string;
}

export interface FrameSectionEntry {
  readonly entityId: UuidString;
  readonly label: string;
}

export interface FrameMemberEntry {
  readonly entityId: UuidString;
  readonly nodeIId: UuidString;
  readonly nodeJId: UuidString;
  readonly materialId: UuidString;
  readonly sectionId: UuidString;
}

export interface FrameSupportEntry {
  readonly entityId: UuidString;
  readonly nodeId: UuidString;
  readonly label: string;
}

export interface StructuralModel {
  readonly nodes: readonly FrameNodeEntry[];
  readonly members: readonly FrameMemberEntry[];
  readonly materials: readonly FrameMaterialEntry[];
  readonly sections: readonly FrameSectionEntry[];
  readonly supports: readonly FrameSupportEntry[];
}

export type LoadKind = "dead" | "live" | "wind" | "temperature" | "other";

export interface LoadDefinitionEntry {
  readonly entityId: UuidString;
  readonly label: string;
  readonly loadKind: LoadKind;
}

export interface AnalysisSettings {
  readonly settingsId: UuidString;
  readonly solverFamily: string;
  readonly settingsVersion: string;
}

export type TransferTargetEntityKind =
  | "node"
  | "member"
  | "material"
  | "section"
  | "support"
  | "load-definition"
  | "analysis-settings";

const TRANSFER_TARGET_ENTITY_KINDS: readonly TransferTargetEntityKind[] = [
  "node",
  "member",
  "material",
  "section",
  "support",
  "load-definition",
  "analysis-settings",
] as const;

export interface TransferBinding {
  readonly bindingId: UuidString;
  readonly sourceDocumentRef: DocumentReference;
  readonly mappingProvenance: Provenance;
  readonly targetEntityKind: TransferTargetEntityKind;
  readonly targetEntityId: UuidString;
  readonly sourceEntityId: UuidString;
}

export interface BridgeFrameAnalysisDocument {
  readonly schemaId: SchemaId;
  readonly schemaVersion: SchemaVersion;
  readonly documentKind: typeof BRIDGE_FRAME_ANALYSIS_DOCUMENT_KIND;
  readonly documentId: UuidString;
  readonly revisionId: number;
  readonly contentChecksum: ContentChecksum;
  readonly provenance: Provenance;
  readonly coordinateContexts: readonly CoordinateContext[];
  readonly unitContext: UnitContext;
  readonly structuralModel: StructuralModel;
  readonly loadDefinitions: readonly LoadDefinitionEntry[];
  readonly analysisSettings: AnalysisSettings;
  readonly transferBindings: readonly TransferBinding[];
  readonly revision: RevisionMetadata;
  readonly validation: DocumentReference;
  readonly extensions?: Extensions;
  readonly unknownFieldStoreRef?: DocumentReference;
  readonly migrationProvenanceRef?: DocumentReference;
  readonly attachments?: readonly ImmutableResourceReference[];
  readonly springsCapability?: CapabilityBlock;
  readonly memberReleasesCapability?: CapabilityBlock;
  readonly rigidOffsetsCapability?: CapabilityBlock;
  readonly fixedLoadsCapability?: CapabilityBlock;
  readonly influenceLiveLoadsCapability?: CapabilityBlock;
  readonly staticCombinationsCapability?: CapabilityBlock;
  readonly modalAnalysisCapability?: CapabilityBlock;
  readonly responseSpectrumCapability?: CapabilityBlock;
  readonly persistedResultRefs?: readonly DocumentReference[];
  readonly reportRefs?: readonly DocumentReference[];
  readonly draftRefs?: readonly DocumentReference[];
}

const FORBIDDEN_ROAD_TRUTH_KEYS = [
  "alignments",
  "stationing",
  "profiles",
  "crossSections",
  "bridges",
  "stableIdRegistry",
  "roadGeometry",
  "roadRegions",
] as const;

const FORBIDDEN_VIEWER_STATE_KEYS = [
  "viewerState",
  "camera",
  "selectionState",
  "sessionState",
  "displayPreferences",
  "clippingState",
] as const;

const FORBIDDEN_FRAME_KEYS = [...FORBIDDEN_ROAD_TRUTH_KEYS, ...FORBIDDEN_VIEWER_STATE_KEYS] as const;

export function detectForbiddenFrameRoadOrViewerKeys(value: unknown): readonly string[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return [];
  }

  const record = value as Record<string, unknown>;
  return FORBIDDEN_FRAME_KEYS.filter((key) => key in record);
}

function validateFrameCoordinateContexts(
  contexts: readonly CoordinateContext[] | undefined,
  basePath: string,
): ValidationResult {
  if (contexts === undefined) {
    return createValidationResult([
      createValidationIssue({
        code: "BRIDGE_FRAME_COORDINATE_CONTEXTS_MISSING",
        severity: "error",
        message: "coordinateContexts is required.",
        path: joinPath(basePath, "/coordinateContexts"),
      }),
    ]);
  }

  if (contexts.length === 0) {
    return createValidationResult([
      createValidationIssue({
        code: "BRIDGE_FRAME_COORDINATE_CONTEXTS_EMPTY",
        severity: "error",
        message: "coordinateContexts must contain at least one entry.",
        path: joinPath(basePath, "/coordinateContexts"),
      }),
    ]);
  }

  return createValidationResult([]);
}

interface FrameEntityIndex {
  readonly nodeIds: ReadonlySet<UuidString>;
  readonly memberIds: ReadonlySet<UuidString>;
  readonly materialIds: ReadonlySet<UuidString>;
  readonly sectionIds: ReadonlySet<UuidString>;
  readonly supportIds: ReadonlySet<UuidString>;
  readonly loadDefinitionIds: ReadonlySet<UuidString>;
  readonly analysisSettingsId: UuidString | undefined;
}

function buildFrameEntityIndex(
  document: Partial<BridgeFrameAnalysisDocument>,
): FrameEntityIndex {
  const nodeIds = new Set<UuidString>();
  document.structuralModel?.nodes?.forEach((node) => {
    if (isValidUuid(node.entityId)) {
      nodeIds.add(node.entityId);
    }
  });

  const memberIds = new Set<UuidString>();
  document.structuralModel?.members?.forEach((member) => {
    if (isValidUuid(member.entityId)) {
      memberIds.add(member.entityId);
    }
  });

  const materialIds = new Set<UuidString>();
  document.structuralModel?.materials?.forEach((material) => {
    if (isValidUuid(material.entityId)) {
      materialIds.add(material.entityId);
    }
  });

  const sectionIds = new Set<UuidString>();
  document.structuralModel?.sections?.forEach((section) => {
    if (isValidUuid(section.entityId)) {
      sectionIds.add(section.entityId);
    }
  });

  const supportIds = new Set<UuidString>();
  document.structuralModel?.supports?.forEach((support) => {
    if (isValidUuid(support.entityId)) {
      supportIds.add(support.entityId);
    }
  });

  const loadDefinitionIds = new Set<UuidString>();
  document.loadDefinitions?.forEach((loadDefinition) => {
    if (isValidUuid(loadDefinition.entityId)) {
      loadDefinitionIds.add(loadDefinition.entityId);
    }
  });

  const analysisSettingsId =
    document.analysisSettings !== undefined &&
    isValidUuid(document.analysisSettings.settingsId)
      ? document.analysisSettings.settingsId
      : undefined;

  return {
    nodeIds,
    memberIds,
    materialIds,
    sectionIds,
    supportIds,
    loadDefinitionIds,
    analysisSettingsId,
  };
}

function resolveTransferTargetKind(
  entityId: UuidString,
  index: FrameEntityIndex,
): TransferTargetEntityKind | undefined {
  if (index.nodeIds.has(entityId)) {
    return "node";
  }
  if (index.memberIds.has(entityId)) {
    return "member";
  }
  if (index.materialIds.has(entityId)) {
    return "material";
  }
  if (index.sectionIds.has(entityId)) {
    return "section";
  }
  if (index.supportIds.has(entityId)) {
    return "support";
  }
  if (index.loadDefinitionIds.has(entityId)) {
    return "load-definition";
  }
  if (index.analysisSettingsId === entityId) {
    return "analysis-settings";
  }
  return undefined;
}

function targetEntityExistsForKind(
  entityId: UuidString,
  kind: TransferTargetEntityKind,
  index: FrameEntityIndex,
): boolean {
  switch (kind) {
    case "node":
      return index.nodeIds.has(entityId);
    case "member":
      return index.memberIds.has(entityId);
    case "material":
      return index.materialIds.has(entityId);
    case "section":
      return index.sectionIds.has(entityId);
    case "support":
      return index.supportIds.has(entityId);
    case "load-definition":
      return index.loadDefinitionIds.has(entityId);
    case "analysis-settings":
      return index.analysisSettingsId === entityId;
  }
}

function validateAnalysisSettings(
  settings: Partial<AnalysisSettings> | undefined,
  basePath: string,
): ValidationResult {
  if (settings === undefined) {
    return createValidationResult([
      createValidationIssue({
        code: "BRIDGE_FRAME_ANALYSIS_SETTINGS_MISSING",
        severity: "error",
        message: "analysisSettings is required.",
        path: basePath,
      }),
    ]);
  }

  const issues: ValidationIssue[] = [];

  if (typeof settings.settingsId !== "string" || !isValidUuid(settings.settingsId)) {
    issues.push(
      createValidationIssue({
        code: "BRIDGE_FRAME_ANALYSIS_SETTINGS_ID_INVALID",
        severity: "error",
        message: "analysisSettings.settingsId must be a valid UUID.",
        path: joinPath(basePath, "/settingsId"),
      }),
    );
  }

  if (typeof settings.settingsVersion !== "string" || !isSemVerString(settings.settingsVersion)) {
    issues.push(
      createValidationIssue({
        code: "BRIDGE_FRAME_ANALYSIS_SETTINGS_VERSION_INVALID",
        severity: "error",
        message: "analysisSettings.settingsVersion must be a valid SemVer string.",
        path: joinPath(basePath, "/settingsVersion"),
      }),
    );
  }

  return createValidationResult(issues);
}

function joinPath(basePath: string, suffix: string): string {
  return basePath.length > 0 ? `${basePath}${suffix}` : suffix;
}

function validateRevisionConsistency(
  document: Partial<BridgeFrameAnalysisDocument>,
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
        code: "BRIDGE_FRAME_REVISION_DOCUMENT_ID_MISMATCH",
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
        code: "BRIDGE_FRAME_REVISION_ID_MISMATCH",
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
        code: "BRIDGE_FRAME_REVISION_CHECKSUM_MISMATCH",
        severity: "error",
        message: "contentChecksum must match revision.contentChecksum.",
        path: joinPath(basePath, "/revision/contentChecksum"),
      }),
    );
  }

  return createValidationResult(issues);
}

function validateStructuralModel(
  model: Partial<StructuralModel> | undefined,
  coordinateContextIds: ReadonlySet<UuidString>,
  basePath: string,
): ValidationResult {
  if (model === undefined) {
    return createValidationResult([
      createValidationIssue({
        code: "BRIDGE_FRAME_STRUCTURAL_MODEL_MISSING",
        severity: "error",
        message: "structuralModel is required.",
        path: basePath,
      }),
    ]);
  }

  const issues: ValidationIssue[] = [];

  const nodeIds = new Set<UuidString>();
  model.nodes?.forEach((node) => {
    if (isValidUuid(node.entityId)) {
      nodeIds.add(node.entityId);
    }
  });

  const materialIds = new Set<UuidString>();
  model.materials?.forEach((material) => {
    if (isValidUuid(material.entityId)) {
      materialIds.add(material.entityId);
    }
  });

  const sectionIds = new Set<UuidString>();
  model.sections?.forEach((section) => {
    if (isValidUuid(section.entityId)) {
      sectionIds.add(section.entityId);
    }
  });

  model.nodes?.forEach((node, index) => {
    collectEntityIdIssues(
      issues,
      validateEntityIdReference(
        node.coordinateContextId,
        coordinateContextIds,
        joinPath(basePath, `/nodes/${index}/coordinateContextId`),
        "BRIDGE_FRAME_COORDINATE_CONTEXT_REF_UNRESOLVED",
        "node coordinateContextId must reference a declared coordinateContext.",
      ),
    );
  });

  model.members?.forEach((member, index) => {
    const memberPath = joinPath(basePath, `/members/${index}`);
    if (member.nodeIId === member.nodeJId) {
      issues.push(
        createValidationIssue({
          code: "BRIDGE_FRAME_MEMBER_ZERO_LENGTH",
          severity: "error",
          message: "member nodeIId and nodeJId must not reference the same node.",
          path: joinPath(memberPath, "/nodeJId"),
          entityId: member.entityId,
        }),
      );
    }

    collectEntityIdIssues(
      issues,
      validateEntityIdReference(
        member.nodeIId,
        nodeIds,
        joinPath(memberPath, "/nodeIId"),
        "BRIDGE_FRAME_NODE_REF_UNRESOLVED",
        "member nodeIId must reference a declared structuralModel node.",
      ),
    );
    collectEntityIdIssues(
      issues,
      validateEntityIdReference(
        member.nodeJId,
        nodeIds,
        joinPath(memberPath, "/nodeJId"),
        "BRIDGE_FRAME_NODE_REF_UNRESOLVED",
        "member nodeJId must reference a declared structuralModel node.",
      ),
    );
    collectEntityIdIssues(
      issues,
      validateEntityIdReference(
        member.materialId,
        materialIds,
        joinPath(memberPath, "/materialId"),
        "BRIDGE_FRAME_MATERIAL_REF_UNRESOLVED",
        "member materialId must reference a declared structuralModel material.",
      ),
    );
    collectEntityIdIssues(
      issues,
      validateEntityIdReference(
        member.sectionId,
        sectionIds,
        joinPath(memberPath, "/sectionId"),
        "BRIDGE_FRAME_SECTION_REF_UNRESOLVED",
        "member sectionId must reference a declared structuralModel section.",
      ),
    );
  });

  model.supports?.forEach((support, index) => {
    collectEntityIdIssues(
      issues,
      validateEntityIdReference(
        support.nodeId,
        nodeIds,
        joinPath(basePath, `/supports/${index}/nodeId`),
        "BRIDGE_FRAME_NODE_REF_UNRESOLVED",
        "support nodeId must reference a declared structuralModel node.",
      ),
    );
  });

  return mergeEntityIdIssues(issues);
}

function validateTransferBindings(
  bindings: readonly TransferBinding[] | undefined,
  entityIndex: FrameEntityIndex,
  basePath: string,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  bindings?.forEach((binding, index) => {
    const bindingPath = joinPath(basePath, `/${index}`);
    issues.push(
      ...validateDocumentReference(
        binding.sourceDocumentRef,
        joinPath(bindingPath, "/sourceDocumentRef"),
        "road-design",
      ).issues,
      ...validateProvenance(
        binding.mappingProvenance,
        joinPath(bindingPath, "/mappingProvenance"),
      ).issues,
    );

    if (
      binding.sourceDocumentRef.documentKind !== undefined &&
      binding.sourceDocumentRef.documentKind !== "road-design"
    ) {
      issues.push(
        createValidationIssue({
          code: "BRIDGE_FRAME_TRANSFER_SOURCE_KIND_INVALID",
          severity: "error",
          message: "transferBindings sourceDocumentRef must reference a road-design document.",
          path: joinPath(bindingPath, "/sourceDocumentRef/documentKind"),
        }),
      );
    }

    const targetKind = binding.targetEntityKind;
    if (!TRANSFER_TARGET_ENTITY_KINDS.includes(targetKind)) {
      issues.push(
        createValidationIssue({
          code: "BRIDGE_FRAME_TRANSFER_TARGET_KIND_INVALID",
          severity: "error",
          message:
            "transferBindings targetEntityKind must be one of node, member, material, section, support, load-definition, or analysis-settings.",
          path: joinPath(bindingPath, "/targetEntityKind"),
        }),
      );
      return;
    }

    if (!targetEntityExistsForKind(binding.targetEntityId, targetKind, entityIndex)) {
      const actualKind = resolveTransferTargetKind(binding.targetEntityId, entityIndex);
      if (actualKind !== undefined) {
        issues.push(
          createValidationIssue({
            code: "BRIDGE_FRAME_TRANSFER_TARGET_KIND_MISMATCH",
            severity: "error",
            message: `transferBindings targetEntityId belongs to "${actualKind}", not "${targetKind}".`,
            path: joinPath(bindingPath, "/targetEntityId"),
            entityId: binding.targetEntityId,
          }),
        );
      } else {
        issues.push(
          createValidationIssue({
            code: "BRIDGE_FRAME_TRANSFER_TARGET_REF_UNRESOLVED",
            severity: "error",
            message: `transferBindings targetEntityId must reference a declared ${targetKind}.`,
            path: joinPath(bindingPath, "/targetEntityId"),
            entityId: binding.targetEntityId,
          }),
        );
      }
    }
  });

  return mergeEntityIdIssues(issues);
}

export function validateBridgeFrameAnalysisDocument(
  document: Partial<BridgeFrameAnalysisDocument> | undefined,
  path = "",
): ValidationResult {
  const basePath = path.length > 0 ? path : "";

  if (document === undefined) {
    return createValidationResult([
      createValidationIssue({
        code: "BRIDGE_FRAME_DOCUMENT_MISSING",
        severity: "error",
        message: "BridgeFrameAnalysisDocument is required.",
        path: basePath,
      }),
    ]);
  }

  const issues: ValidationIssue[] = [];

  if (document.schemaId !== BRIDGE_FRAME_ANALYSIS_DOCUMENT_SCHEMA_ID) {
    issues.push(
      createValidationIssue({
        code: "BRIDGE_FRAME_SCHEMA_ID_INVALID",
        severity: "error",
        message: `schemaId must be "${BRIDGE_FRAME_ANALYSIS_DOCUMENT_SCHEMA_ID}".`,
        path: joinPath(basePath, "/schemaId"),
      }),
    );
  }

  if (document.documentKind !== BRIDGE_FRAME_ANALYSIS_DOCUMENT_KIND) {
    issues.push(
      createValidationIssue({
        code: "BRIDGE_FRAME_DOCUMENT_KIND_INVALID",
        severity: "error",
        message: `documentKind must be "${BRIDGE_FRAME_ANALYSIS_DOCUMENT_KIND}".`,
        path: joinPath(basePath, "/documentKind"),
      }),
    );
  }

  detectForbiddenFrameRoadOrViewerKeys(document).forEach((key) => {
    issues.push(
      createValidationIssue({
        code: "BRIDGE_FRAME_ROAD_OR_VIEWER_FIELD_FORBIDDEN",
        severity: "error",
        message: `Road truth or viewer/session field "${key}" is prohibited on BridgeFrameAnalysisDocument.`,
        path: joinPath(basePath, `/${key}`),
      }),
    );
  });

  const coordinateContextIds = new Set<UuidString>();
  document.coordinateContexts?.forEach((context) => {
    if (isValidUuid(context.contextId)) {
      coordinateContextIds.add(context.contextId);
    }
  });

  const coordinateContextResults = (document.coordinateContexts ?? []).map((context, index) =>
    validateCoordinateContext(
      context,
      joinPath(basePath, `/coordinateContexts/${index}`),
    ),
  );

  const frameEntityIndex = buildFrameEntityIndex(document);
  const analysisSettingsEntries =
    frameEntityIndex.analysisSettingsId !== undefined
      ? [
          {
            id: frameEntityIndex.analysisSettingsId,
            path: joinPath(basePath, "/analysisSettings/settingsId"),
          },
        ]
      : [];

  issues.push(
    ...findDuplicateEntityIds(
      document.coordinateContexts?.map((entry, index) => ({
        id: entry.contextId,
        path: joinPath(basePath, `/coordinateContexts/${index}/contextId`),
      })) ?? [],
      "BRIDGE_FRAME_COORDINATE_CONTEXT_ID_DUPLICATE",
      "coordinateContext contextId values must be unique.",
    ),
    ...findCrossCollectionDuplicateEntityIds(
      [
        document.structuralModel?.nodes?.map((entry, index) => ({
          id: entry.entityId,
          path: joinPath(basePath, `/structuralModel/nodes/${index}/entityId`),
        })) ?? [],
        document.structuralModel?.members?.map((entry, index) => ({
          id: entry.entityId,
          path: joinPath(basePath, `/structuralModel/members/${index}/entityId`),
        })) ?? [],
        document.structuralModel?.materials?.map((entry, index) => ({
          id: entry.entityId,
          path: joinPath(basePath, `/structuralModel/materials/${index}/entityId`),
        })) ?? [],
        document.structuralModel?.sections?.map((entry, index) => ({
          id: entry.entityId,
          path: joinPath(basePath, `/structuralModel/sections/${index}/entityId`),
        })) ?? [],
        document.structuralModel?.supports?.map((entry, index) => ({
          id: entry.entityId,
          path: joinPath(basePath, `/structuralModel/supports/${index}/entityId`),
        })) ?? [],
        document.loadDefinitions?.map((entry, index) => ({
          id: entry.entityId,
          path: joinPath(basePath, `/loadDefinitions/${index}/entityId`),
        })) ?? [],
        analysisSettingsEntries,
        document.transferBindings?.map((entry, index) => ({
          id: entry.bindingId,
          path: joinPath(basePath, `/transferBindings/${index}/bindingId`),
        })) ?? [],
      ],
      "BRIDGE_FRAME_ENTITY_ID_CROSS_COLLECTION_DUPLICATE",
      "entityId values must be unique across frame analysis entities.",
    ),
  );

  const capabilityBlocks: Array<[CapabilityBlock | undefined, string]> = [
    [document.springsCapability, "/springsCapability"],
    [document.memberReleasesCapability, "/memberReleasesCapability"],
    [document.rigidOffsetsCapability, "/rigidOffsetsCapability"],
    [document.fixedLoadsCapability, "/fixedLoadsCapability"],
    [document.influenceLiveLoadsCapability, "/influenceLiveLoadsCapability"],
    [document.staticCombinationsCapability, "/staticCombinationsCapability"],
    [document.modalAnalysisCapability, "/modalAnalysisCapability"],
    [document.responseSpectrumCapability, "/responseSpectrumCapability"],
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

  const reportRefIssues: ValidationIssue[] = [];
  document.reportRefs?.forEach((reference, index) => {
    reportRefIssues.push(
      ...validateDocumentReference(
        reference,
        joinPath(basePath, `/reportRefs/${index}`),
      ).issues,
    );
  });

  const draftRefIssues: ValidationIssue[] = [];
  document.draftRefs?.forEach((reference, index) => {
    draftRefIssues.push(
      ...validateDocumentReference(reference, joinPath(basePath, `/draftRefs/${index}`)).issues,
    );
  });

  return mergeValidationResults(
    createValidationResult(issues),
    validateSupportedContractVersion(
      BRIDGE_FRAME_ANALYSIS_DOCUMENT_SCHEMA_ID,
      document.schemaVersion,
      joinPath(basePath, ""),
    ),
    validateContentChecksum(document.contentChecksum, joinPath(basePath, "/contentChecksum")),
    validateProvenance(document.provenance, joinPath(basePath, "/provenance")),
    validateExtensions(document.extensions, joinPath(basePath, "/extensions")),
    validateRevisionMetadata(document.revision, joinPath(basePath, "/revision")),
    validateRevisionConsistency(document, basePath),
    validateUnitContext(document.unitContext, joinPath(basePath, "/unitContext"), {
      profile: "mechanical",
    }),
    validateFrameCoordinateContexts(document.coordinateContexts, basePath),
    validateAnalysisSettings(document.analysisSettings, joinPath(basePath, "/analysisSettings")),
    validateStructuralModel(
      document.structuralModel,
      coordinateContextIds,
      joinPath(basePath, "/structuralModel"),
    ),
    validateTransferBindings(
      document.transferBindings,
      frameEntityIndex,
      joinPath(basePath, "/transferBindings"),
    ),
    validateDocumentReference(
      document.validation,
      joinPath(basePath, "/validation"),
      "validation-result",
    ),
    document.persistedResultRefs === undefined
      ? createValidationResult([])
      : validateDocumentReferenceCollection(
          document.persistedResultRefs,
          joinPath(basePath, "/persistedResultRefs"),
          "persisted-result",
        ),
    createValidationResult(reportRefIssues),
    createValidationResult(draftRefIssues),
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
  );
}
