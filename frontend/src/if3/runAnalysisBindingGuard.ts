import { contentChecksumsEqual, parseContentChecksum } from "../contracts/contentChecksum";
import { isSemVerString } from "../contracts/schemaIdentity";
import { parseUuid } from "../contracts/uuid";
import type { ProjectModel } from "../types";
import type { RunAnalysisIf3Metadata } from "./buildRunAnalysisIf3Metadata";
import { resolveProjectModelSourceDocument } from "./projectModelSourceBinding";

export type RunAnalysisIf3BindingValidationResult =
  | { ok: true; value: RunAnalysisIf3Metadata }
  | { ok: false; code: string; message: string };

export class RunAnalysisIf3BindingError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "RunAnalysisIf3BindingError";
    this.code = code;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export function validateRunAnalysisIf3Metadata(metadata: unknown): RunAnalysisIf3BindingValidationResult {
  if (!isPlainObject(metadata)) {
    return {
      ok: false,
      code: "BINDING_UNBOUND",
      message: "IF3 binding metadata is missing.",
    };
  }

  const hasSourceDocumentId = typeof metadata.sourceDocumentId === "string" && metadata.sourceDocumentId.length > 0;
  const hasSourceDocumentVersion = metadata.sourceDocumentVersion !== undefined;
  const hasSourceContentChecksum = metadata.sourceContentChecksum !== undefined;
  if (!hasSourceDocumentId && !hasSourceDocumentVersion && !hasSourceContentChecksum) {
    return {
      ok: false,
      code: "BINDING_UNBOUND",
      message: "IF3 source binding triple is unbound (missing document id, version, and checksum).",
    };
  }

  const sourceDocumentId = parseUuid(
    typeof metadata.sourceDocumentId === "string" ? metadata.sourceDocumentId : "",
  );
  if (sourceDocumentId === undefined) {
    return {
      ok: false,
      code: "BINDING_SOURCE_DOCUMENT_ID_INVALID",
      message: "sourceDocumentId must be a valid UUID.",
    };
  }

  if (!isPositiveInteger(metadata.sourceDocumentVersion)) {
    return {
      ok: false,
      code: "BINDING_SOURCE_DOCUMENT_VERSION_INVALID",
      message: "sourceDocumentVersion must be a positive integer.",
    };
  }

  const sourceContentChecksum = isPlainObject(metadata.sourceContentChecksum)
    ? parseContentChecksum({
        algorithm: String(metadata.sourceContentChecksum.algorithm ?? ""),
        hexDigest: String(metadata.sourceContentChecksum.hexDigest ?? ""),
      })
    : undefined;
  if (sourceContentChecksum === undefined) {
    return {
      ok: false,
      code: "BINDING_SOURCE_CONTENT_CHECKSUM_INVALID",
      message: "sourceContentChecksum must be a valid sha256 content checksum.",
    };
  }

  if (!isPlainObject(metadata.analysisSettings)) {
    return {
      ok: false,
      code: "BINDING_ANALYSIS_SETTINGS_INVALID",
      message: "analysisSettings must be an object.",
    };
  }

  if (!isPlainObject(metadata.loadContext) || !Array.isArray(metadata.loadContext.entries)) {
    return {
      ok: false,
      code: "BINDING_LOAD_CONTEXT_INVALID",
      message: "loadContext.entries must be an array.",
    };
  }

  const solverName = metadata.solverName;
  if (typeof solverName !== "string" || solverName.trim().length === 0) {
    return {
      ok: false,
      code: "BINDING_SOLVER_NAME_INVALID",
      message: "solverName must be a non-empty string.",
    };
  }

  const solverVersion = metadata.solverVersion;
  if (typeof solverVersion !== "string" || !isSemVerString(solverVersion)) {
    return {
      ok: false,
      code: "BINDING_SOLVER_VERSION_INVALID",
      message: "solverVersion must be a SemVer string.",
    };
  }

  return {
    ok: true,
    value: metadata as RunAnalysisIf3Metadata,
  };
}

export function assertAuthoritativeIf3Binding(metadata: unknown): asserts metadata is RunAnalysisIf3Metadata {
  const validation = validateRunAnalysisIf3Metadata(metadata);
  if (!validation.ok) {
    throw new RunAnalysisIf3BindingError(validation.code, validation.message);
  }
}

export function evaluateBindingAgainstProject(
  metadata: RunAnalysisIf3Metadata,
  project: ProjectModel,
): RunAnalysisIf3BindingValidationResult {
  const expected = resolveProjectModelSourceDocument(project);

  if (metadata.sourceDocumentId !== expected.documentId) {
    return {
      ok: false,
      code: "BINDING_DOCUMENT_MISMATCH",
      message: "sourceDocumentId does not match the current project binding.",
    };
  }

  if (metadata.sourceDocumentVersion !== expected.revisionId) {
    return {
      ok: false,
      code: "BINDING_VERSION_MISMATCH",
      message: "sourceDocumentVersion does not match the current project binding.",
    };
  }

  if (!contentChecksumsEqual(metadata.sourceContentChecksum, expected.contentChecksum)) {
    return {
      ok: false,
      code: "BINDING_CHECKSUM_STALE",
      message: "sourceContentChecksum is stale relative to the current project binding.",
    };
  }

  return { ok: true, value: metadata };
}

export function assertBindingAgainstProject(
  metadata: RunAnalysisIf3Metadata,
  project: ProjectModel,
): void {
  const evaluation = evaluateBindingAgainstProject(metadata, project);
  if (!evaluation.ok) {
    throw new RunAnalysisIf3BindingError(evaluation.code, evaluation.message);
  }
}
