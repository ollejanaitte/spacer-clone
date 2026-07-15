import { isIso8601UtcTimestamp } from "./isoTimestamp";
import {
  createValidationIssue,
  createValidationResult,
  type ValidationResult,
} from "./validation";

export type ActorType = "user" | "system" | "tool";

export interface ActorRef {
  readonly actorId: string;
  readonly actorType: ActorType;
  readonly displayName?: string;
}

export interface ToolProvenance {
  readonly toolId: string;
  readonly toolVersion: string;
  readonly algorithmVersion?: string;
}

export interface Provenance {
  readonly createdAt: string;
  readonly createdBy: ActorRef;
  readonly updatedAt?: string;
  readonly updatedBy?: ActorRef;
  readonly producer: ToolProvenance;
}

function validateActorRef(
  actor: Partial<ActorRef> | undefined,
  path: string,
): ReturnType<typeof createValidationIssue>[] {
  const issues = [];
  if (actor === undefined) {
    issues.push(
      createValidationIssue({
        code: "ACTOR_MISSING",
        severity: "error",
        message: "Actor reference is required.",
        path,
      }),
    );
    return issues;
  }

  if (typeof actor.actorId !== "string" || actor.actorId.trim().length === 0) {
    issues.push(
      createValidationIssue({
        code: "ACTOR_ID_MISSING",
        severity: "error",
        message: "actorId must be a non-empty string.",
        path: `${path}/actorId`,
      }),
    );
  }

  if (actor.actorType !== "user" && actor.actorType !== "system" && actor.actorType !== "tool") {
    issues.push(
      createValidationIssue({
        code: "ACTOR_TYPE_INVALID",
        severity: "error",
        message: "actorType must be user, system, or tool.",
        path: `${path}/actorType`,
      }),
    );
  }

  return issues;
}

function validateToolProvenance(
  producer: Partial<ToolProvenance> | undefined,
  path: string,
): ReturnType<typeof createValidationIssue>[] {
  const issues = [];
  if (producer === undefined) {
    issues.push(
      createValidationIssue({
        code: "PRODUCER_MISSING",
        severity: "error",
        message: "Producer tool provenance is required.",
        path,
      }),
    );
    return issues;
  }

  if (typeof producer.toolId !== "string" || producer.toolId.trim().length === 0) {
    issues.push(
      createValidationIssue({
        code: "TOOL_ID_MISSING",
        severity: "error",
        message: "toolId must be a non-empty string.",
        path: `${path}/toolId`,
      }),
    );
  }

  if (typeof producer.toolVersion !== "string" || producer.toolVersion.trim().length === 0) {
    issues.push(
      createValidationIssue({
        code: "TOOL_VERSION_MISSING",
        severity: "error",
        message: "toolVersion must be a non-empty string.",
        path: `${path}/toolVersion`,
      }),
    );
  }

  return issues;
}

export function validateProvenance(
  provenance: Partial<Provenance> | undefined,
  path = "",
): ValidationResult {
  const issues = [];
  const basePath = path.length > 0 ? path : "";

  if (provenance === undefined) {
    issues.push(
      createValidationIssue({
        code: "PROVENANCE_MISSING",
        severity: "error",
        message: "Provenance is required.",
        path: basePath,
      }),
    );
    return createValidationResult(issues);
  }

  if (typeof provenance.createdAt !== "string" || !isIso8601UtcTimestamp(provenance.createdAt)) {
    issues.push(
      createValidationIssue({
        code: "PROVENANCE_CREATED_AT_INVALID",
        severity: "error",
        message: "createdAt must be an ISO-8601 UTC timestamp.",
        path: `${basePath}/createdAt`,
      }),
    );
  }

  issues.push(...validateActorRef(provenance.createdBy, `${basePath}/createdBy`));
  issues.push(...validateToolProvenance(provenance.producer, `${basePath}/producer`));

  if (provenance.updatedAt !== undefined) {
    if (!isIso8601UtcTimestamp(provenance.updatedAt)) {
      issues.push(
        createValidationIssue({
          code: "PROVENANCE_UPDATED_AT_INVALID",
          severity: "error",
          message: "updatedAt must be an ISO-8601 UTC timestamp when provided.",
          path: `${basePath}/updatedAt`,
        }),
      );
    }
    issues.push(...validateActorRef(provenance.updatedBy, `${basePath}/updatedBy`));
  } else if (provenance.updatedBy !== undefined) {
    issues.push(
      createValidationIssue({
        code: "PROVENANCE_UPDATED_BY_WITHOUT_TIMESTAMP",
        severity: "error",
        message: "updatedBy requires updatedAt.",
        path: `${basePath}/updatedBy`,
      }),
    );
  }

  return createValidationResult(issues);
}
