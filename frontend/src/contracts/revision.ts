import type { ContentChecksum } from "./contentChecksum";
import { validateContentChecksum } from "./contentChecksum";
import { isSemVerString, requireSchemaVersion, type SchemaVersion } from "./schemaIdentity";
import { isIso8601UtcTimestamp } from "./isoTimestamp";
import { isValidUuid, type UuidString } from "./uuid";
import {
  createValidationIssue,
  createValidationResult,
  type ValidationIssue,
  type ValidationResult,
} from "./validation";
import type { ActorRef, ToolProvenance } from "./provenance";

export const REVISION_METADATA_SCHEMA_VERSION = requireSchemaVersion("0.1.0");

export type RevisionId = number & { readonly __brand: "RevisionId" };

export interface RevisionMetadata {
  readonly schemaVersion: SchemaVersion;
  readonly documentId: UuidString;
  readonly revisionId: RevisionId;
  readonly createdAt: string;
  readonly contentChecksum: ContentChecksum;
  readonly parentRevisionIds?: readonly RevisionId[];
  readonly baseRevisionId?: RevisionId;
  readonly sequence?: number;
  readonly actor?: ActorRef;
  readonly tool?: ToolProvenance;
  readonly reason?: string;
  readonly migrationRecordRef?: string;
}

export function asRevisionId(value: number): RevisionId | undefined {
  return isPositiveRevisionId(value) ? (value as RevisionId) : undefined;
}

export function requireRevisionId(value: number): RevisionId {
  const parsed = asRevisionId(value);
  if (parsed === undefined) {
    throw new Error("revisionId must be a positive integer.");
  }
  return parsed;
}

export function isPositiveRevisionId(value: unknown): value is RevisionId {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function validateParentRevisionIds(
  parentRevisionIds: readonly unknown[] | undefined,
  path: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (parentRevisionIds === undefined) {
    return issues;
  }

  if (!Array.isArray(parentRevisionIds)) {
    issues.push(
      createValidationIssue({
        code: "REVISION_PARENT_IDS_INVALID",
        severity: "error",
        message: "parentRevisionIds must be an array when provided.",
        path,
      }),
    );
    return issues;
  }

  parentRevisionIds.forEach((parentId, index) => {
    if (!isPositiveRevisionId(parentId)) {
      issues.push(
        createValidationIssue({
          code: "REVISION_PARENT_ID_INVALID",
          severity: "error",
          message: "Each parent revision id must be a positive integer.",
          path: `${path}/${index}`,
        }),
      );
    }
  });

  return issues;
}

export function validateRevisionMetadata(
  metadata: Partial<RevisionMetadata> | undefined,
  path = "",
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const basePath = path.length > 0 ? path : "";

  if (metadata === undefined) {
    issues.push(
      createValidationIssue({
        code: "REVISION_METADATA_MISSING",
        severity: "error",
        message: "Revision metadata is required.",
        path: basePath,
      }),
    );
    return createValidationResult(issues);
  }

  if (
    typeof metadata.schemaVersion !== "string" ||
    !isSemVerString(metadata.schemaVersion)
  ) {
    issues.push(
      createValidationIssue({
        code: "REVISION_SCHEMA_VERSION_INVALID",
        severity: "error",
        message: "schemaVersion must be a valid SemVer string.",
        path: `${basePath}/schemaVersion`,
      }),
    );
  }

  if (typeof metadata.documentId !== "string" || !isValidUuid(metadata.documentId)) {
    issues.push(
      createValidationIssue({
        code: "REVISION_DOCUMENT_ID_INVALID",
        severity: "error",
        message: "documentId must be a valid UUID.",
        path: `${basePath}/documentId`,
      }),
    );
  }

  if (!isPositiveRevisionId(metadata.revisionId)) {
    issues.push(
      createValidationIssue({
        code: "REVISION_ID_INVALID",
        severity: "error",
        message: "revisionId must be a positive integer.",
        path: `${basePath}/revisionId`,
      }),
    );
  }

  if (typeof metadata.createdAt !== "string" || !isIso8601UtcTimestamp(metadata.createdAt)) {
    issues.push(
      createValidationIssue({
        code: "REVISION_CREATED_AT_INVALID",
        severity: "error",
        message: "createdAt must be an ISO-8601 UTC timestamp.",
        path: `${basePath}/createdAt`,
      }),
    );
  }

  issues.push(
    ...validateContentChecksum(metadata.contentChecksum, `${basePath}/contentChecksum`).issues,
  );

  issues.push(
    ...validateParentRevisionIds(metadata.parentRevisionIds, `${basePath}/parentRevisionIds`),
  );

  if (metadata.baseRevisionId !== undefined && !isPositiveRevisionId(metadata.baseRevisionId)) {
    issues.push(
      createValidationIssue({
        code: "REVISION_BASE_ID_INVALID",
        severity: "error",
        message: "baseRevisionId must be a positive integer when provided.",
        path: `${basePath}/baseRevisionId`,
      }),
    );
  }

  if (metadata.sequence !== undefined) {
    if (!Number.isInteger(metadata.sequence) || metadata.sequence < 0) {
      issues.push(
        createValidationIssue({
          code: "REVISION_SEQUENCE_INVALID",
          severity: "error",
          message: "sequence must be a non-negative integer when provided.",
          path: `${basePath}/sequence`,
        }),
      );
    }
  }

  if (metadata.actor !== undefined) {
    if (typeof metadata.actor.actorId !== "string" || metadata.actor.actorId.trim().length === 0) {
      issues.push(
        createValidationIssue({
          code: "REVISION_ACTOR_ID_MISSING",
          severity: "error",
          message: "actor.actorId must be a non-empty string when actor is provided.",
          path: `${basePath}/actor/actorId`,
        }),
      );
    }
  }

  if (metadata.tool !== undefined) {
    if (typeof metadata.tool.toolId !== "string" || metadata.tool.toolId.trim().length === 0) {
      issues.push(
        createValidationIssue({
          code: "REVISION_TOOL_ID_MISSING",
          severity: "error",
          message: "tool.toolId must be a non-empty string when tool is provided.",
          path: `${basePath}/tool/toolId`,
        }),
      );
    }
    if (
      typeof metadata.tool.toolVersion !== "string" ||
      metadata.tool.toolVersion.trim().length === 0
    ) {
      issues.push(
        createValidationIssue({
          code: "REVISION_TOOL_VERSION_MISSING",
          severity: "error",
          message: "tool.toolVersion must be a non-empty string when tool is provided.",
          path: `${basePath}/tool/toolVersion`,
        }),
      );
    }
  }

  return createValidationResult(issues);
}
