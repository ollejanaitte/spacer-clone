import type {
  PackageArtifactReference,
  PolicyReference,
  TransferRecordArtifactReference,
} from "./artifactReference";
import {
  validatePackageArtifactReference,
  validatePolicyReference,
  validateTransferRecordArtifactReference,
} from "./artifactReference";
import { BRIDGE_FRAME_ANALYSIS_DOCUMENT_KIND } from "./bridgeFrameAnalysisDocument";
import type { ContentChecksum } from "./contentChecksum";
import { contentChecksumsEqual, validateContentChecksum } from "./contentChecksum";
import {
  TRANSFER_RECORD_SCHEMA_ID,
  validateSupportedContractVersion,
} from "./contractVersionRegistry";
import {
  validateDocumentReference,
  type DocumentReference,
} from "./documentReference";
import type { Extensions } from "./extensions";
import { validateExtensions } from "./extensions";
import {
  isApplyBlockingCapabilityState,
  isPackageCapabilityState,
  type PackageCapabilityState,
} from "./packageCapability";
import type { ActorRef } from "./provenance";
import { ROAD_DESIGN_DOCUMENT_KIND } from "./roadDesignDocument";
import type { SchemaId, SchemaVersion } from "./schemaIdentity";
import { isIso8601UtcTimestamp } from "./isoTimestamp";
import { isValidUuid, type UuidString } from "./uuid";
import {
  createValidationIssue,
  createValidationResult,
  type ValidationIssue,
  type ValidationResult,
} from "./validation";

export const TRANSFER_RECORD_KIND = "transfer-record" as const;

export type TransferRecordStatus =
  | "previewed"
  | "rejected"
  | "partially-accepted"
  | "accepted"
  | "conflicted"
  | "stale"
  | "rolled-back";

export type EntityMappingDisposition = "mapped" | "unmapped" | "quarantined" | "blocked";

export interface EntityMappingEntry {
  readonly roadGeometryId: UuidString;
  readonly frameEntityIds: readonly UuidString[];
  readonly disposition: EntityMappingDisposition;
  readonly reason?: string;
}

export interface TransferDecisionEntry {
  readonly decisionId: UuidString;
  readonly entityId?: UuidString;
  readonly fieldPath?: string;
  readonly reason: string;
}

export interface TransferCapabilityAssessmentEntry {
  readonly capabilityId: string;
  readonly producerStatus: PackageCapabilityState;
  readonly consumerStatus: PackageCapabilityState;
  readonly blocked: boolean;
  readonly reason?: string;
}

/**
 * Append-only transfer audit artifact. Repository layers append new records;
 * this contract does not provide mutation APIs.
 */
export interface TransferRecord {
  readonly schemaId: SchemaId;
  readonly schemaVersion: SchemaVersion;
  readonly documentKind: typeof TRANSFER_RECORD_KIND;
  readonly recordId: UuidString;
  readonly contentChecksum: ContentChecksum;
  readonly packageRef: PackageArtifactReference;
  readonly sourceDocumentRef: DocumentReference;
  readonly targetBefore: DocumentReference;
  readonly targetAfter?: DocumentReference;
  readonly baselineRecordRef?: TransferRecordArtifactReference;
  readonly rollbackOf?: TransferRecordArtifactReference;
  readonly supersedes?: TransferRecordArtifactReference;
  readonly status: TransferRecordStatus;
  readonly firstImport: boolean;
  readonly capabilityAssessment: readonly TransferCapabilityAssessmentEntry[];
  readonly entityMappings: readonly EntityMappingEntry[];
  readonly acceptedChanges: readonly TransferDecisionEntry[];
  readonly rejectedChanges: readonly TransferDecisionEntry[];
  readonly conflicts: readonly TransferDecisionEntry[];
  readonly coordinateTransform: PolicyReference;
  readonly applyProfile: PolicyReference;
  readonly timestamp: string;
  readonly actor: ActorRef;
  readonly toolVersion: string;
  readonly validationRef?: DocumentReference;
  readonly unknownFieldStoreRef?: DocumentReference;
  readonly extensions?: Extensions;
}

const TARGET_AFTER_REQUIRED_STATUSES = new Set<TransferRecordStatus>([
  "accepted",
  "partially-accepted",
  "rolled-back",
]);

const TARGET_AFTER_FORBIDDEN_STATUSES = new Set<TransferRecordStatus>([
  "previewed",
  "rejected",
  "conflicted",
  "stale",
]);

const TARGET_AFTER_IMMUTABLE_REVISION_STATUSES = new Set<TransferRecordStatus>([
  "accepted",
  "partially-accepted",
  "rolled-back",
]);

function joinPath(basePath: string, suffix: string): string {
  return basePath.length > 0 ? `${basePath}${suffix}` : suffix;
}

export function validateTransferCapabilityAssessmentEntry(
  entry: Partial<TransferCapabilityAssessmentEntry> | undefined,
  path: string,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (entry === undefined) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_CAPABILITY_ASSESSMENT_ENTRY_MISSING",
        severity: "error",
        message: "Capability assessment entry is required.",
        path,
      }),
    );
    return createValidationResult(issues);
  }

  if (typeof entry.capabilityId !== "string" || entry.capabilityId.trim().length === 0) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_CAPABILITY_ASSESSMENT_ID_INVALID",
        severity: "error",
        message: "capabilityId must be a non-empty string.",
        path: `${path}/capabilityId`,
      }),
    );
  }

  if (
    entry.producerStatus === undefined ||
    typeof entry.producerStatus !== "string" ||
    !isPackageCapabilityState(entry.producerStatus)
  ) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_CAPABILITY_ASSESSMENT_PRODUCER_STATUS_INVALID",
        severity: "error",
        message: "producerStatus must be a supported capability state.",
        path: `${path}/producerStatus`,
      }),
    );
  }

  if (
    entry.consumerStatus === undefined ||
    typeof entry.consumerStatus !== "string" ||
    !isPackageCapabilityState(entry.consumerStatus)
  ) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_CAPABILITY_ASSESSMENT_CONSUMER_STATUS_INVALID",
        severity: "error",
        message: "consumerStatus must be a supported capability state.",
        path: `${path}/consumerStatus`,
      }),
    );
  }

  if (typeof entry.blocked !== "boolean") {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_CAPABILITY_ASSESSMENT_BLOCKED_INVALID",
        severity: "error",
        message: "blocked must be a boolean.",
        path: `${path}/blocked`,
      }),
    );
  }

  const producerBlocking =
    entry.producerStatus !== undefined &&
    typeof entry.producerStatus === "string" &&
    isPackageCapabilityState(entry.producerStatus) &&
    isApplyBlockingCapabilityState(entry.producerStatus);
  const consumerBlocking =
    entry.consumerStatus !== undefined &&
    typeof entry.consumerStatus === "string" &&
    isPackageCapabilityState(entry.consumerStatus) &&
    isApplyBlockingCapabilityState(entry.consumerStatus);

  if (entry.blocked === false && (producerBlocking || consumerBlocking)) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_CAPABILITY_ASSESSMENT_BLOCKED_FALSE_CONTRADICTION",
        severity: "error",
        message:
          "blocked must be true when producerStatus or consumerStatus is unknown or unsupported.",
        path: `${path}/blocked`,
      }),
    );
  }

  if (
    entry.blocked === true &&
    (typeof entry.reason !== "string" || entry.reason.trim().length === 0)
  ) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_CAPABILITY_ASSESSMENT_BLOCKED_REASON_REQUIRED",
        severity: "error",
        message: "reason is required when blocked is true.",
        path: `${path}/reason`,
      }),
    );
  }

  return createValidationResult(issues);
}

export function validateTransferCapabilityAssessmentCollection(
  entries: readonly TransferCapabilityAssessmentEntry[] | undefined,
  path: string,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (entries === undefined) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_CAPABILITY_ASSESSMENT_COLLECTION_MISSING",
        severity: "error",
        message: "capabilityAssessment collection is required.",
        path,
      }),
    );
    return createValidationResult(issues);
  }

  const seen = new Set<string>();
  entries.forEach((entry, index) => {
    const itemPath = `${path}/${index}`;
    issues.push(...validateTransferCapabilityAssessmentEntry(entry, itemPath).issues);

    if (typeof entry.capabilityId === "string" && entry.capabilityId.trim().length > 0) {
      if (seen.has(entry.capabilityId)) {
        issues.push(
          createValidationIssue({
            code: "TRANSFER_CAPABILITY_ASSESSMENT_ID_DUPLICATE",
            severity: "error",
            message: "capabilityId values must be unique within capabilityAssessment.",
            path: `${itemPath}/capabilityId`,
          }),
        );
      } else {
        seen.add(entry.capabilityId);
      }
    }
  });

  return createValidationResult(issues);
}

function validateEntityMapping(
  mapping: Partial<EntityMappingEntry> | undefined,
  path: string,
  roadSourceIds: Set<UuidString>,
  allRoadGeometryIds: ReadonlySet<UuidString>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (mapping === undefined) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_RECORD_ENTITY_MAPPING_MISSING",
        severity: "error",
        message: "entityMappings entry is required.",
        path,
      }),
    );
    return issues;
  }

  if (typeof mapping.roadGeometryId !== "string" || !isValidUuid(mapping.roadGeometryId)) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_RECORD_ROAD_GEOMETRY_ID_INVALID",
        severity: "error",
        message: "roadGeometryId must be a valid UUID.",
        path: `${path}/roadGeometryId`,
      }),
    );
  } else if (roadSourceIds.has(mapping.roadGeometryId)) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_RECORD_ROAD_GEOMETRY_ID_DUPLICATE",
        severity: "error",
        message: "roadGeometryId must be unique within entityMappings.",
        path: `${path}/roadGeometryId`,
        entityId: mapping.roadGeometryId,
      }),
    );
  } else {
    roadSourceIds.add(mapping.roadGeometryId);
  }

  if (
    mapping.disposition !== "mapped" &&
    mapping.disposition !== "unmapped" &&
    mapping.disposition !== "quarantined" &&
    mapping.disposition !== "blocked"
  ) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_RECORD_MAPPING_DISPOSITION_INVALID",
        severity: "error",
        message: "disposition must be mapped, unmapped, quarantined, or blocked.",
        path: `${path}/disposition`,
      }),
    );
  }

  if (!Array.isArray(mapping.frameEntityIds)) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_RECORD_FRAME_ENTITY_IDS_INVALID",
        severity: "error",
        message: "frameEntityIds must be an array.",
        path: `${path}/frameEntityIds`,
      }),
    );
    return issues;
  }

  if (mapping.disposition === "mapped" && mapping.frameEntityIds.length === 0) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_RECORD_MAPPED_REQUIRES_FRAME_IDS",
        severity: "error",
        message: "mapped disposition requires at least one frameEntityId.",
        path: `${path}/frameEntityIds`,
      }),
    );
  } else if (mapping.disposition !== "mapped" && mapping.frameEntityIds.length > 0) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_RECORD_NON_MAPPED_FORBIDS_FRAME_IDS",
        severity: "error",
        message: "unmapped, quarantined, and blocked dispositions require zero frameEntityIds.",
        path: `${path}/frameEntityIds`,
      }),
    );
  }

  const seenTargets = new Set<UuidString>();
  mapping.frameEntityIds.forEach((frameEntityId, index) => {
    if (!isValidUuid(frameEntityId)) {
      issues.push(
        createValidationIssue({
          code: "TRANSFER_RECORD_FRAME_ENTITY_ID_INVALID",
          severity: "error",
          message: "frameEntityIds entries must be valid UUIDs.",
          path: `${path}/frameEntityIds/${index}`,
        }),
      );
      return;
    }

    if (allRoadGeometryIds.has(frameEntityId)) {
      issues.push(
        createValidationIssue({
          code: "TRANSFER_RECORD_NAMESPACE_REUSE_FORBIDDEN",
          severity: "error",
          message: "frameEntityIds must not reuse any road source UUID namespace.",
          path: `${path}/frameEntityIds/${index}`,
          entityId: frameEntityId,
        }),
      );
    }

    if (seenTargets.has(frameEntityId)) {
      issues.push(
        createValidationIssue({
          code: "TRANSFER_RECORD_FRAME_ENTITY_ID_DUPLICATE",
          severity: "error",
          message: "frameEntityIds must be unique within a mapping entry.",
          path: `${path}/frameEntityIds/${index}`,
          entityId: frameEntityId,
        }),
      );
    } else {
      seenTargets.add(frameEntityId);
    }
  });

  return issues;
}

function validateTransferDecision(
  decision: Partial<TransferDecisionEntry> | undefined,
  path: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (decision === undefined) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_RECORD_DECISION_MISSING",
        severity: "error",
        message: "Decision entry is required.",
        path,
      }),
    );
    return issues;
  }

  if (typeof decision.decisionId !== "string" || !isValidUuid(decision.decisionId)) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_RECORD_DECISION_ID_INVALID",
        severity: "error",
        message: "decisionId must be a valid UUID.",
        path: `${path}/decisionId`,
      }),
    );
  }

  if (typeof decision.reason !== "string" || decision.reason.trim().length === 0) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_RECORD_DECISION_REASON_INVALID",
        severity: "error",
        message: "reason must be a non-empty string.",
        path: `${path}/reason`,
      }),
    );
  }

  return issues;
}

function validateTargetRevisionPair(
  targetBefore: DocumentReference | undefined,
  targetAfter: DocumentReference | undefined,
  status: TransferRecordStatus | undefined,
  basePath: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (targetBefore === undefined || targetAfter === undefined) {
    return issues;
  }

  if (targetBefore.documentId !== targetAfter.documentId) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_RECORD_TARGET_DOCUMENT_MISMATCH",
        severity: "error",
        message: "targetBefore and targetAfter must reference the same frame document.",
        path: joinPath(basePath, "/targetAfter/documentId"),
      }),
    );
  }

  if (
    status !== undefined &&
    TARGET_AFTER_IMMUTABLE_REVISION_STATUSES.has(status)
  ) {
    if (targetAfter.revisionId <= targetBefore.revisionId) {
      issues.push(
        createValidationIssue({
          code: "TRANSFER_RECORD_TARGET_REVISION_NOT_ADVANCED",
          severity: "error",
          message: "targetAfter revisionId must be greater than targetBefore for immutable outcomes.",
          path: joinPath(basePath, "/targetAfter/revisionId"),
        }),
      );
    }

    if (contentChecksumsEqual(targetBefore.contentChecksum, targetAfter.contentChecksum)) {
      issues.push(
        createValidationIssue({
          code: "TRANSFER_RECORD_TARGET_CHECKSUM_UNCHANGED",
          severity: "error",
          message: "targetAfter contentChecksum must differ from targetBefore for immutable outcomes.",
          path: joinPath(basePath, "/targetAfter/contentChecksum"),
        }),
      );
    }
  } else if (
    targetBefore.revisionId === targetAfter.revisionId &&
    contentChecksumsEqual(targetBefore.contentChecksum, targetAfter.contentChecksum)
  ) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_RECORD_TARGET_REVISION_UNCHANGED",
        severity: "error",
        message: "targetAfter must differ from targetBefore in revision or checksum.",
        path: joinPath(basePath, "/targetAfter"),
      }),
    );
  }

  return issues;
}

function validateSelfArtifactReference(
  recordId: UuidString | undefined,
  reference: TransferRecordArtifactReference | undefined,
  path: string,
  code: string,
): ValidationIssue | undefined {
  if (
    recordId !== undefined &&
    reference !== undefined &&
    reference.recordId === recordId
  ) {
    return createValidationIssue({
      code,
      severity: "error",
      message: "Transfer record must not reference itself.",
      path,
    });
  }
  return undefined;
}

export function validateTransferRecord(
  record: Partial<TransferRecord> | undefined,
  path = "",
): ValidationResult {
  const basePath = path.length > 0 ? path : "";

  if (record === undefined) {
    return createValidationResult([
      createValidationIssue({
        code: "TRANSFER_RECORD_MISSING",
        severity: "error",
        message: "TransferRecord is required.",
        path: basePath,
      }),
    ]);
  }

  const issues: ValidationIssue[] = [];

  if (record.schemaId !== TRANSFER_RECORD_SCHEMA_ID) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_RECORD_SCHEMA_ID_INVALID",
        severity: "error",
        message: `schemaId must be "${TRANSFER_RECORD_SCHEMA_ID}".`,
        path: joinPath(basePath, "/schemaId"),
      }),
    );
  }

  issues.push(
    ...validateSupportedContractVersion(
      record.schemaId,
      record.schemaVersion,
      joinPath(basePath, "/schemaVersion"),
    ).issues,
  );

  if (record.documentKind !== TRANSFER_RECORD_KIND) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_RECORD_DOCUMENT_KIND_INVALID",
        severity: "error",
        message: `documentKind must be "${TRANSFER_RECORD_KIND}".`,
        path: joinPath(basePath, "/documentKind"),
      }),
    );
  }

  if (typeof record.recordId !== "string" || !isValidUuid(record.recordId)) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_RECORD_ID_INVALID",
        severity: "error",
        message: "recordId must be a valid UUID.",
        path: joinPath(basePath, "/recordId"),
      }),
    );
  }

  issues.push(
    ...validateContentChecksum(record.contentChecksum, joinPath(basePath, "/contentChecksum")).issues,
    ...validatePackageArtifactReference(record.packageRef, joinPath(basePath, "/packageRef")).issues,
    ...validateDocumentReference(
      record.sourceDocumentRef,
      joinPath(basePath, "/sourceDocumentRef"),
      ROAD_DESIGN_DOCUMENT_KIND,
    ).issues,
    ...validateDocumentReference(
      record.targetBefore,
      joinPath(basePath, "/targetBefore"),
      BRIDGE_FRAME_ANALYSIS_DOCUMENT_KIND,
    ).issues,
    ...validateTransferCapabilityAssessmentCollection(
      record.capabilityAssessment,
      joinPath(basePath, "/capabilityAssessment"),
    ).issues,
    ...validatePolicyReference(
      record.coordinateTransform,
      joinPath(basePath, "/coordinateTransform"),
    ).issues,
    ...validatePolicyReference(record.applyProfile, joinPath(basePath, "/applyProfile")).issues,
  );

  if (record.targetAfter !== undefined) {
    issues.push(
      ...validateDocumentReference(
        record.targetAfter,
        joinPath(basePath, "/targetAfter"),
        BRIDGE_FRAME_ANALYSIS_DOCUMENT_KIND,
      ).issues,
    );
  }

  if (record.baselineRecordRef !== undefined) {
    issues.push(
      ...validateTransferRecordArtifactReference(
        record.baselineRecordRef,
        joinPath(basePath, "/baselineRecordRef"),
      ).issues,
    );
  }

  if (record.rollbackOf !== undefined) {
    issues.push(
      ...validateTransferRecordArtifactReference(
        record.rollbackOf,
        joinPath(basePath, "/rollbackOf"),
      ).issues,
    );
  }

  if (record.supersedes !== undefined) {
    issues.push(
      ...validateTransferRecordArtifactReference(
        record.supersedes,
        joinPath(basePath, "/supersedes"),
      ).issues,
    );
  }

  if (typeof record.timestamp !== "string" || !isIso8601UtcTimestamp(record.timestamp)) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_RECORD_TIMESTAMP_INVALID",
        severity: "error",
        message: "timestamp must be an ISO-8601 UTC timestamp.",
        path: joinPath(basePath, "/timestamp"),
      }),
    );
  }

  if (
    typeof record.toolVersion !== "string" ||
    record.toolVersion.trim().length === 0
  ) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_RECORD_TOOL_VERSION_INVALID",
        severity: "error",
        message: "toolVersion must be a non-empty string.",
        path: joinPath(basePath, "/toolVersion"),
      }),
    );
  }

  if (
    record.actor === undefined ||
    typeof record.actor.actorId !== "string" ||
    record.actor.actorId.trim().length === 0
  ) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_RECORD_ACTOR_INVALID",
        severity: "error",
        message: "actor is required.",
        path: joinPath(basePath, "/actor"),
      }),
    );
  }

  if (typeof record.firstImport !== "boolean") {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_RECORD_FIRST_IMPORT_INVALID",
        severity: "error",
        message: "firstImport must be a boolean.",
        path: joinPath(basePath, "/firstImport"),
      }),
    );
  } else if (record.firstImport && record.baselineRecordRef !== undefined) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_RECORD_BASELINE_FORBIDDEN_ON_FIRST_IMPORT",
        severity: "error",
        message: "baselineRecordRef must be absent when firstImport is true.",
        path: joinPath(basePath, "/baselineRecordRef"),
      }),
    );
  } else if (!record.firstImport && record.baselineRecordRef === undefined) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_RECORD_BASELINE_REQUIRED_ON_REIMPORT",
        severity: "error",
        message: "baselineRecordRef is required when firstImport is false.",
        path: joinPath(basePath, "/baselineRecordRef"),
      }),
    );
  }

  const status = record.status;
  if (
    status !== "previewed" &&
    status !== "rejected" &&
    status !== "partially-accepted" &&
    status !== "accepted" &&
    status !== "conflicted" &&
    status !== "stale" &&
    status !== "rolled-back"
  ) {
    issues.push(
      createValidationIssue({
        code: "TRANSFER_RECORD_STATUS_INVALID",
        severity: "error",
        message: "status must be a supported transfer record status.",
        path: joinPath(basePath, "/status"),
      }),
    );
  } else {
    if (TARGET_AFTER_REQUIRED_STATUSES.has(status) && record.targetAfter === undefined) {
      issues.push(
        createValidationIssue({
          code: "TRANSFER_RECORD_TARGET_AFTER_REQUIRED",
          severity: "error",
          message: "targetAfter is required for accepted transfer outcomes.",
          path: joinPath(basePath, "/targetAfter"),
        }),
      );
    }

    if (TARGET_AFTER_FORBIDDEN_STATUSES.has(status) && record.targetAfter !== undefined) {
      issues.push(
        createValidationIssue({
          code: "TRANSFER_RECORD_TARGET_AFTER_FORBIDDEN",
          severity: "error",
          message: "targetAfter must be absent for preview/reject/conflict/stale records.",
          path: joinPath(basePath, "/targetAfter"),
        }),
      );
    }

    if (status === "accepted" && (record.acceptedChanges?.length ?? 0) === 0) {
      issues.push(
        createValidationIssue({
          code: "TRANSFER_RECORD_ACCEPTED_CHANGES_REQUIRED",
          severity: "error",
          message: "accepted status requires non-empty acceptedChanges.",
          path: joinPath(basePath, "/acceptedChanges"),
        }),
      );
    }

    if (status === "rejected" && (record.rejectedChanges?.length ?? 0) === 0) {
      issues.push(
        createValidationIssue({
          code: "TRANSFER_RECORD_REJECTED_CHANGES_REQUIRED",
          severity: "error",
          message: "rejected status requires non-empty rejectedChanges.",
          path: joinPath(basePath, "/rejectedChanges"),
        }),
      );
    }

    if (status === "partially-accepted") {
      if ((record.acceptedChanges?.length ?? 0) === 0) {
        issues.push(
          createValidationIssue({
            code: "TRANSFER_RECORD_PARTIAL_ACCEPTED_CHANGES_REQUIRED",
            severity: "error",
            message: "partially-accepted status requires non-empty acceptedChanges.",
            path: joinPath(basePath, "/acceptedChanges"),
          }),
        );
      }
      if (
        (record.rejectedChanges?.length ?? 0) === 0 &&
        (record.conflicts?.length ?? 0) === 0
      ) {
        issues.push(
          createValidationIssue({
            code: "TRANSFER_RECORD_PARTIAL_REJECT_OR_CONFLICT_REQUIRED",
            severity: "error",
            message:
              "partially-accepted status requires rejectedChanges or conflicts to be non-empty.",
            path: joinPath(basePath, "/status"),
          }),
        );
      }
    }

    if (status === "conflicted" && (record.conflicts?.length ?? 0) === 0) {
      issues.push(
        createValidationIssue({
          code: "TRANSFER_RECORD_CONFLICTS_REQUIRED",
          severity: "error",
          message: "conflicted status requires non-empty conflicts.",
          path: joinPath(basePath, "/conflicts"),
        }),
      );
    }

    if (status === "rolled-back" && record.rollbackOf === undefined) {
      issues.push(
        createValidationIssue({
          code: "TRANSFER_RECORD_ROLLBACK_OF_REQUIRED",
          severity: "error",
          message: "rolled-back status requires rollbackOf.",
          path: joinPath(basePath, "/rollbackOf"),
        }),
      );
    }

    if (status !== "rolled-back" && record.rollbackOf !== undefined) {
      issues.push(
        createValidationIssue({
          code: "TRANSFER_RECORD_ROLLBACK_OF_FORBIDDEN",
          severity: "error",
          message: "rollbackOf is only permitted when status is rolled-back.",
          path: joinPath(basePath, "/rollbackOf"),
        }),
      );
    }
  }

  issues.push(
    ...validateTargetRevisionPair(record.targetBefore, record.targetAfter, record.status, basePath),
  );

  for (const refCheck of [
    validateSelfArtifactReference(
      record.recordId,
      record.baselineRecordRef,
      joinPath(basePath, "/baselineRecordRef/recordId"),
      "TRANSFER_RECORD_BASELINE_SELF_REFERENCE",
    ),
    validateSelfArtifactReference(
      record.recordId,
      record.rollbackOf,
      joinPath(basePath, "/rollbackOf/recordId"),
      "TRANSFER_RECORD_ROLLBACK_SELF_REFERENCE",
    ),
    validateSelfArtifactReference(
      record.recordId,
      record.supersedes,
      joinPath(basePath, "/supersedes/recordId"),
      "TRANSFER_RECORD_SUPERSEDES_SELF_REFERENCE",
    ),
  ]) {
    if (refCheck !== undefined) {
      issues.push(refCheck);
    }
  }

  const allRoadGeometryIds = new Set<UuidString>();
  for (const mapping of record.entityMappings ?? []) {
    if (typeof mapping.roadGeometryId === "string" && isValidUuid(mapping.roadGeometryId)) {
      allRoadGeometryIds.add(mapping.roadGeometryId);
    }
  }

  const roadSourceIds = new Set<UuidString>();
  (record.entityMappings ?? []).forEach((mapping, index) => {
    issues.push(
      ...validateEntityMapping(
        mapping,
        joinPath(basePath, `/entityMappings/${index}`),
        roadSourceIds,
        allRoadGeometryIds,
      ),
    );
  });

  if (record.validationRef !== undefined) {
    issues.push(
      ...validateDocumentReference(
        record.validationRef,
        joinPath(basePath, "/validationRef"),
        "validation-result",
      ).issues,
    );
  }

  if (record.unknownFieldStoreRef !== undefined) {
    issues.push(
      ...validateDocumentReference(
        record.unknownFieldStoreRef,
        joinPath(basePath, "/unknownFieldStoreRef"),
        "unknown-field-store",
      ).issues,
    );
  }

  const decisionIds = new Set<UuidString>();
  const decisionLists: Array<{
    readonly list: readonly TransferDecisionEntry[] | undefined;
    readonly name: string;
  }> = [
    { list: record.acceptedChanges, name: "acceptedChanges" },
    { list: record.rejectedChanges, name: "rejectedChanges" },
    { list: record.conflicts, name: "conflicts" },
  ];

  for (const { list, name } of decisionLists) {
    (list ?? []).forEach((decision, index) => {
      const itemPath = joinPath(basePath, `/${name}/${index}`);
      issues.push(...validateTransferDecision(decision, itemPath));
      if (typeof decision.decisionId === "string" && isValidUuid(decision.decisionId)) {
        if (decisionIds.has(decision.decisionId)) {
          issues.push(
            createValidationIssue({
              code: "TRANSFER_RECORD_DECISION_ID_COLLISION",
              severity: "error",
              message: "decisionId values must be unique across accepted/rejected/conflict lists.",
              path: `${itemPath}/decisionId`,
            }),
          );
        } else {
          decisionIds.add(decision.decisionId);
        }
      }
    });
  }

  if (record.extensions !== undefined) {
    issues.push(...validateExtensions(record.extensions, joinPath(basePath, "/extensions")).issues);
  }

  return createValidationResult(issues);
}
