import type { BridgeFrameAnalysisDocument } from "./bridgeFrameAnalysisDocument";
import type { ContentChecksum } from "./contentChecksum";
import {
  contentChecksumsEqual,
  validateContentChecksum,
} from "./contentChecksum";
import {
  FRAME_ANALYSIS_RESULT_RESOURCE_SCHEMA_ID,
  validateSupportedContractVersion,
} from "./contractVersionRegistry";
import { isIso8601UtcTimestamp } from "./isoTimestamp";
import type { Provenance } from "./provenance";
import { validateProvenance } from "./provenance";
import type { RevisionId } from "./revision";
import { isPositiveRevisionId } from "./revision";
import type { SchemaId, SchemaVersion } from "./schemaIdentity";
import { isSemVerString } from "./schemaIdentity";
import { isValidUuid, type UuidString } from "./uuid";
import {
  createValidationIssue,
  createValidationResult,
  mergeValidationResults,
  type ValidationIssue,
  type ValidationResult,
  type ValidationSeverity,
} from "./validation";

export type FrameAnalysisResultStatus =
  | "PENDING"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "PARTIAL"
  | "INVALID"
  | "STALE"
  | "UNSUPPORTED";

export const FRAME_ANALYSIS_RESULT_STATUSES: readonly FrameAnalysisResultStatus[] = [
  "PENDING",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "PARTIAL",
  "INVALID",
  "STALE",
  "UNSUPPORTED",
] as const;

export type FrameAnalysisResultKind =
  | "nodeDisplacement"
  | "supportReaction"
  | "memberForce"
  | "stress"
  | "modal"
  | "buckling"
  | "diagnostics"
  | "linearStatic"
  | "eigen"
  | "responseSpectrum"
  | "influenceLine"
  | "movingLoad"
  | "timeHistory";

export const FRAME_ANALYSIS_RESULT_KINDS: readonly FrameAnalysisResultKind[] = [
  "nodeDisplacement",
  "supportReaction",
  "memberForce",
  "stress",
  "modal",
  "buckling",
  "timeHistory",
  "diagnostics",
  "linearStatic",
  "eigen",
  "responseSpectrum",
  "influenceLine",
  "movingLoad",
] as const;

export type FrameAnalysisLoadContextKind =
  | "loadCase"
  | "loadCombination"
  | "influenceLine"
  | "movingLoad"
  | "timeHistory";

export const FRAME_ANALYSIS_LOAD_CONTEXT_KINDS: readonly FrameAnalysisLoadContextKind[] = [
  "loadCase",
  "loadCombination",
  "influenceLine",
  "movingLoad",
  "timeHistory",
] as const;

export interface FrameAnalysisLoadContextEntry {
  readonly kind: FrameAnalysisLoadContextKind;
  readonly id: UuidString;
  readonly label?: string;
  readonly checksum?: ContentChecksum;
}

export interface FrameAnalysisLoadContext {
  readonly entries: readonly FrameAnalysisLoadContextEntry[];
  readonly requestChecksum?: ContentChecksum;
}

export interface FrameAnalysisResultDiagnostic {
  readonly code: string;
  readonly severity: ValidationSeverity;
  readonly producer: string;
  readonly message: string;
  readonly path?: string;
  readonly entityKind?: string;
  readonly entityId?: UuidString;
  readonly resultKind?: FrameAnalysisResultKind;
}

export type FrameAnalysisNumericValueMap = Readonly<Record<string, number>>;

export interface FrameAnalysisResultRow {
  readonly rowId: UuidString;
  readonly entityKind: string;
  readonly entityId: UuidString;
  readonly loadContextId?: UuidString;
  readonly quantity: string;
  readonly unit?: string;
  readonly values: FrameAnalysisNumericValueMap;
}

export interface FrameAnalysisResultPayloadEntry {
  readonly schemaVersion: SchemaVersion;
  readonly rows: readonly FrameAnalysisResultRow[];
}

export type FrameAnalysisResultPayloadCatalog = {
  readonly [Kind in FrameAnalysisResultKind]?: FrameAnalysisResultPayloadEntry;
};

export interface FrameAnalysisResultResource {
  readonly schemaId: SchemaId;
  readonly schemaVersion: SchemaVersion;
  readonly resultId: UuidString;
  readonly analysisRunId: UuidString;
  readonly sourceDocumentId: UuidString;
  readonly sourceDocumentVersion: RevisionId;
  readonly sourceContentChecksum: ContentChecksum;
  readonly status: FrameAnalysisResultStatus;
  readonly generatedAt: string;
  readonly solverName: string;
  readonly solverVersion: string;
  readonly analysisSettingsChecksum: ContentChecksum;
  readonly loadContext: FrameAnalysisLoadContext;
  readonly provenance: Provenance;
  readonly diagnostics: readonly FrameAnalysisResultDiagnostic[];
  readonly payload: FrameAnalysisResultPayloadCatalog;
  readonly transferPackageId?: UuidString;
  readonly transferRecordId?: UuidString;
  readonly modelRevision?: string;
  readonly resultChecksum?: ContentChecksum;
  readonly unitSystem?: string;
  readonly resultKinds?: readonly FrameAnalysisResultKind[];
}

function joinPath(basePath: string, suffix: string): string {
  return basePath.length > 0 ? `${basePath}${suffix}` : suffix;
}

function sortIssuesDeterministically(issues: readonly ValidationIssue[]): readonly ValidationIssue[] {
  return [...issues].sort((left, right) => {
    const leftKey = `${left.path}\u0000${left.code}\u0000${left.severity}\u0000${left.message}`;
    const rightKey = `${right.path}\u0000${right.code}\u0000${right.severity}\u0000${right.message}`;
    return leftKey.localeCompare(rightKey);
  });
}

function validateUuidField(
  value: unknown,
  path: string,
  code: string,
  message: string,
): ValidationIssue[] {
  if (typeof value === "string" && isValidUuid(value)) {
    return [];
  }
  return [
    createValidationIssue({
      code,
      severity: "error",
      message,
      path,
    }),
  ];
}

function validateOptionalUuidField(
  value: unknown,
  path: string,
  code: string,
  message: string,
): ValidationIssue[] {
  if (value === undefined) {
    return [];
  }
  return validateUuidField(value, path, code, message);
}

function validateNonEmptyStringField(
  value: unknown,
  path: string,
  code: string,
  message: string,
): ValidationIssue[] {
  if (typeof value === "string" && value.trim().length > 0) {
    return [];
  }
  return [
    createValidationIssue({
      code,
      severity: "error",
      message,
      path,
    }),
  ];
}

function validateLoadContext(
  loadContext: Partial<FrameAnalysisLoadContext> | undefined,
  basePath: string,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (loadContext === undefined) {
    return createValidationResult([
      createValidationIssue({
        code: "FRAME_RESULT_LOAD_CONTEXT_MISSING",
        severity: "error",
        message: "loadContext is required.",
        path: basePath,
      }),
    ]);
  }

  if (!Array.isArray(loadContext.entries)) {
    issues.push(
      createValidationIssue({
        code: "FRAME_RESULT_LOAD_CONTEXT_ENTRIES_INVALID",
        severity: "error",
        message: "loadContext.entries must be an array.",
        path: joinPath(basePath, "/entries"),
      }),
    );
  } else {
    const ids = new Set<string>();
    loadContext.entries.forEach((entry, index) => {
      const entryPath = joinPath(basePath, `/entries/${index}`);
      if (!FRAME_ANALYSIS_LOAD_CONTEXT_KINDS.includes(entry.kind)) {
        issues.push(
          createValidationIssue({
            code: "FRAME_RESULT_LOAD_CONTEXT_KIND_INVALID",
            severity: "error",
            message: "loadContext entry kind is not supported.",
            path: joinPath(entryPath, "/kind"),
          }),
        );
      }
      issues.push(
        ...validateUuidField(
          entry.id,
          joinPath(entryPath, "/id"),
          "FRAME_RESULT_LOAD_CONTEXT_ID_INVALID",
          "loadContext entry id must be a valid UUID.",
        ),
      );
      if (typeof entry.id === "string" && isValidUuid(entry.id)) {
        if (ids.has(entry.id)) {
          issues.push(
            createValidationIssue({
              code: "FRAME_RESULT_LOAD_CONTEXT_ID_DUPLICATE",
              severity: "error",
              message: "loadContext entry ids must be unique.",
              path: joinPath(entryPath, "/id"),
              entityId: entry.id,
            }),
          );
        }
        ids.add(entry.id);
      }
      if (entry.label !== undefined && (typeof entry.label !== "string" || entry.label.trim().length === 0)) {
        issues.push(
          createValidationIssue({
            code: "FRAME_RESULT_LOAD_CONTEXT_LABEL_INVALID",
            severity: "error",
            message: "loadContext entry label must be a non-empty string when provided.",
            path: joinPath(entryPath, "/label"),
          }),
        );
      }
      if (entry.checksum !== undefined) {
        issues.push(...validateContentChecksum(entry.checksum, joinPath(entryPath, "/checksum")).issues);
      }
    });
  }

  if (loadContext.requestChecksum !== undefined) {
    issues.push(
      ...validateContentChecksum(loadContext.requestChecksum, joinPath(basePath, "/requestChecksum")).issues,
    );
  }

  return createValidationResult(issues);
}

function validateDiagnostics(
  diagnostics: readonly Partial<FrameAnalysisResultDiagnostic>[] | undefined,
  basePath: string,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!Array.isArray(diagnostics)) {
    return createValidationResult([
      createValidationIssue({
        code: "FRAME_RESULT_DIAGNOSTICS_INVALID",
        severity: "error",
        message: "diagnostics must be an array.",
        path: basePath,
      }),
    ]);
  }

  diagnostics.forEach((diagnostic, index) => {
    const diagnosticPath = joinPath(basePath, `/${index}`);
    issues.push(
      ...validateNonEmptyStringField(
        diagnostic.code,
        joinPath(diagnosticPath, "/code"),
        "FRAME_RESULT_DIAGNOSTIC_CODE_INVALID",
        "diagnostic code must be a non-empty string.",
      ),
      ...validateNonEmptyStringField(
        diagnostic.producer,
        joinPath(diagnosticPath, "/producer"),
        "FRAME_RESULT_DIAGNOSTIC_PRODUCER_INVALID",
        "diagnostic producer must be a non-empty string.",
      ),
      ...validateNonEmptyStringField(
        diagnostic.message,
        joinPath(diagnosticPath, "/message"),
        "FRAME_RESULT_DIAGNOSTIC_MESSAGE_INVALID",
        "diagnostic message must be a non-empty string.",
      ),
    );

    if (!["error", "warning", "info"].includes(String(diagnostic.severity))) {
      issues.push(
        createValidationIssue({
          code: "FRAME_RESULT_DIAGNOSTIC_SEVERITY_INVALID",
          severity: "error",
          message: "diagnostic severity must be error, warning, or info.",
          path: joinPath(diagnosticPath, "/severity"),
        }),
      );
    }
    if (diagnostic.path !== undefined && (typeof diagnostic.path !== "string" || !diagnostic.path.startsWith("/"))) {
      issues.push(
        createValidationIssue({
          code: "FRAME_RESULT_DIAGNOSTIC_PATH_INVALID",
          severity: "error",
          message: "diagnostic path must be a JSON Pointer-like absolute path when provided.",
          path: joinPath(diagnosticPath, "/path"),
        }),
      );
    }
    issues.push(
      ...validateOptionalUuidField(
        diagnostic.entityId,
        joinPath(diagnosticPath, "/entityId"),
        "FRAME_RESULT_DIAGNOSTIC_ENTITY_ID_INVALID",
        "diagnostic entityId must be a valid UUID when provided.",
      ),
    );
    if (diagnostic.resultKind !== undefined && !FRAME_ANALYSIS_RESULT_KINDS.includes(diagnostic.resultKind)) {
      issues.push(
        createValidationIssue({
          code: "FRAME_RESULT_DIAGNOSTIC_RESULT_KIND_INVALID",
          severity: "error",
          message: "diagnostic resultKind is not supported.",
          path: joinPath(diagnosticPath, "/resultKind"),
        }),
      );
    }
  });

  return createValidationResult(issues);
}

function validatePayloadEntry(
  entry: Partial<FrameAnalysisResultPayloadEntry>,
  basePath: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (typeof entry.schemaVersion !== "string" || !isSemVerString(entry.schemaVersion)) {
    issues.push(
      createValidationIssue({
        code: "FRAME_RESULT_PAYLOAD_SCHEMA_VERSION_INVALID",
        severity: "error",
        message: "payload entry schemaVersion must be a valid SemVer string.",
        path: joinPath(basePath, "/schemaVersion"),
      }),
    );
  }

  if (!Array.isArray(entry.rows)) {
    issues.push(
      createValidationIssue({
        code: "FRAME_RESULT_PAYLOAD_ROWS_INVALID",
        severity: "error",
        message: "payload entry rows must be an array.",
        path: joinPath(basePath, "/rows"),
      }),
    );
    return issues;
  }

  entry.rows.forEach((row, index) => {
    const rowPath = joinPath(basePath, `/rows/${index}`);
    issues.push(
      ...validateUuidField(row.rowId, joinPath(rowPath, "/rowId"), "FRAME_RESULT_ROW_ID_INVALID", "rowId must be a valid UUID."),
      ...validateUuidField(row.entityId, joinPath(rowPath, "/entityId"), "FRAME_RESULT_ROW_ENTITY_ID_INVALID", "row entityId must be a valid UUID."),
      ...validateOptionalUuidField(row.loadContextId, joinPath(rowPath, "/loadContextId"), "FRAME_RESULT_ROW_LOAD_CONTEXT_ID_INVALID", "row loadContextId must be a valid UUID when provided."),
      ...validateNonEmptyStringField(row.entityKind, joinPath(rowPath, "/entityKind"), "FRAME_RESULT_ROW_ENTITY_KIND_INVALID", "row entityKind must be a non-empty string."),
      ...validateNonEmptyStringField(row.quantity, joinPath(rowPath, "/quantity"), "FRAME_RESULT_ROW_QUANTITY_INVALID", "row quantity must be a non-empty string."),
    );
    if (row.unit !== undefined && (typeof row.unit !== "string" || row.unit.trim().length === 0)) {
      issues.push(
        createValidationIssue({
          code: "FRAME_RESULT_ROW_UNIT_INVALID",
          severity: "error",
          message: "row unit must be a non-empty string when provided.",
          path: joinPath(rowPath, "/unit"),
        }),
      );
    }
    if (typeof row.values !== "object" || row.values === null || Array.isArray(row.values)) {
      issues.push(
        createValidationIssue({
          code: "FRAME_RESULT_ROW_VALUES_INVALID",
          severity: "error",
          message: "row values must be a numeric object.",
          path: joinPath(rowPath, "/values"),
        }),
      );
      return;
    }
    Object.entries(row.values).forEach(([key, value]) => {
      if (key.trim().length === 0) {
        issues.push(
          createValidationIssue({
            code: "FRAME_RESULT_ROW_VALUE_KEY_INVALID",
            severity: "error",
            message: "row value keys must be non-empty strings.",
            path: joinPath(rowPath, "/values"),
          }),
        );
      }
      if (typeof value !== "number" || !Number.isFinite(value)) {
        issues.push(
          createValidationIssue({
            code: "FRAME_RESULT_NUMERIC_VALUE_INVALID",
            severity: "error",
            message: "result numeric values must be finite numbers.",
            path: joinPath(rowPath, `/values/${key}`),
          }),
        );
      }
    });
  });

  return issues;
}

function validatePayloadCatalog(
  payload: Partial<FrameAnalysisResultPayloadCatalog> | undefined,
  resultKinds: readonly FrameAnalysisResultKind[] | undefined,
  basePath: string,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return createValidationResult([
      createValidationIssue({
        code: "FRAME_RESULT_PAYLOAD_INVALID",
        severity: "error",
        message: "payload must be a result-kind keyed catalog.",
        path: basePath,
      }),
    ]);
  }

  Object.keys(payload).forEach((key) => {
    if (!FRAME_ANALYSIS_RESULT_KINDS.includes(key as FrameAnalysisResultKind)) {
      issues.push(
        createValidationIssue({
          code: "FRAME_RESULT_PAYLOAD_KIND_UNSUPPORTED",
          severity: "error",
          message: "payload contains an unsupported result kind.",
          path: joinPath(basePath, `/${key}`),
        }),
      );
    }
  });

  FRAME_ANALYSIS_RESULT_KINDS.forEach((kind) => {
    const entry = payload[kind];
    if (entry !== undefined) {
      issues.push(...validatePayloadEntry(entry, joinPath(basePath, `/${kind}`)));
    }
  });

  if (resultKinds !== undefined) {
    resultKinds.forEach((kind, index) => {
      if (!FRAME_ANALYSIS_RESULT_KINDS.includes(kind)) {
        issues.push(
          createValidationIssue({
            code: "FRAME_RESULT_KIND_INVALID",
            severity: "error",
            message: "resultKinds contains an unsupported result kind.",
            path: joinPath(basePath.replace(/\/payload$/, ""), `/resultKinds/${index}`),
          }),
        );
        return;
      }
      if (payload[kind] === undefined) {
        issues.push(
          createValidationIssue({
            code: "FRAME_RESULT_KIND_PAYLOAD_MISSING",
            severity: "error",
            message: "Each declared resultKind must have a matching payload entry.",
            path: joinPath(basePath.replace(/\/payload$/, ""), `/resultKinds/${index}`),
          }),
        );
      }
    });
  }

  return createValidationResult(issues);
}

function validateSourceBinding(
  resource: Partial<FrameAnalysisResultResource>,
  sourceDocument: Pick<BridgeFrameAnalysisDocument, "documentId" | "revisionId" | "contentChecksum"> | undefined,
  basePath: string,
): ValidationResult {
  if (sourceDocument === undefined) {
    return createValidationResult([]);
  }

  const issues: ValidationIssue[] = [];

  if (resource.sourceDocumentId !== sourceDocument.documentId) {
    issues.push(
      createValidationIssue({
        code: "FRAME_RESULT_SOURCE_DOCUMENT_MISMATCH",
        severity: "error",
        message: "sourceDocumentId must match BridgeFrameAnalysisDocument.documentId.",
        path: joinPath(basePath, "/sourceDocumentId"),
      }),
    );
  }
  if (resource.sourceDocumentVersion !== sourceDocument.revisionId) {
    issues.push(
      createValidationIssue({
        code: "FRAME_RESULT_SOURCE_VERSION_MISMATCH",
        severity: "error",
        message: "sourceDocumentVersion must match BridgeFrameAnalysisDocument.revisionId.",
        path: joinPath(basePath, "/sourceDocumentVersion"),
      }),
    );
  }
  if (
    resource.sourceContentChecksum !== undefined &&
    !contentChecksumsEqual(resource.sourceContentChecksum, sourceDocument.contentChecksum)
  ) {
    issues.push(
      createValidationIssue({
        code: "FRAME_RESULT_SOURCE_CHECKSUM_MISMATCH",
        severity: "error",
        message: "sourceContentChecksum must match BridgeFrameAnalysisDocument.contentChecksum.",
        path: joinPath(basePath, "/sourceContentChecksum"),
      }),
    );
  }

  return createValidationResult(issues);
}

export function validateFrameAnalysisResultResource(
  resource: Partial<FrameAnalysisResultResource> | undefined,
  path = "",
  sourceDocument?: Pick<BridgeFrameAnalysisDocument, "documentId" | "revisionId" | "contentChecksum">,
): ValidationResult {
  const basePath = path.length > 0 ? path : "";

  if (resource === undefined) {
    return createValidationResult([
      createValidationIssue({
        code: "FRAME_RESULT_RESOURCE_MISSING",
        severity: "error",
        message: "FrameAnalysisResultResource is required.",
        path: basePath,
      }),
    ]);
  }

  const issues: ValidationIssue[] = [];

  if (resource.schemaId !== FRAME_ANALYSIS_RESULT_RESOURCE_SCHEMA_ID) {
    issues.push(
      createValidationIssue({
        code: "FRAME_RESULT_SCHEMA_ID_INVALID",
        severity: "error",
        message: `schemaId must be "${FRAME_ANALYSIS_RESULT_RESOURCE_SCHEMA_ID}".`,
        path: joinPath(basePath, "/schemaId"),
      }),
    );
  }
  issues.push(
    ...validateUuidField(resource.resultId, joinPath(basePath, "/resultId"), "FRAME_RESULT_ID_INVALID", "resultId must be a valid UUID."),
    ...validateUuidField(resource.analysisRunId, joinPath(basePath, "/analysisRunId"), "FRAME_RESULT_ANALYSIS_RUN_ID_INVALID", "analysisRunId must be a valid UUID."),
    ...validateUuidField(resource.sourceDocumentId, joinPath(basePath, "/sourceDocumentId"), "FRAME_RESULT_SOURCE_DOCUMENT_ID_INVALID", "sourceDocumentId must be a valid UUID."),
    ...validateOptionalUuidField(resource.transferPackageId, joinPath(basePath, "/transferPackageId"), "FRAME_RESULT_TRANSFER_PACKAGE_ID_INVALID", "transferPackageId must be a valid UUID when provided."),
    ...validateOptionalUuidField(resource.transferRecordId, joinPath(basePath, "/transferRecordId"), "FRAME_RESULT_TRANSFER_RECORD_ID_INVALID", "transferRecordId must be a valid UUID when provided."),
    ...validateNonEmptyStringField(resource.solverName, joinPath(basePath, "/solverName"), "FRAME_RESULT_SOLVER_NAME_INVALID", "solverName must be a non-empty string."),
  );

  if (typeof resource.solverVersion !== "string" || !isSemVerString(resource.solverVersion)) {
    issues.push(
      createValidationIssue({
        code: "FRAME_RESULT_SOLVER_VERSION_INVALID",
        severity: "error",
        message: "solverVersion must be a valid SemVer string.",
        path: joinPath(basePath, "/solverVersion"),
      }),
    );
  }
  if (!isPositiveRevisionId(resource.sourceDocumentVersion)) {
    issues.push(
      createValidationIssue({
        code: "FRAME_RESULT_SOURCE_DOCUMENT_VERSION_INVALID",
        severity: "error",
        message: "sourceDocumentVersion must be a positive integer revision id.",
        path: joinPath(basePath, "/sourceDocumentVersion"),
      }),
    );
  }
  if (typeof resource.generatedAt !== "string" || !isIso8601UtcTimestamp(resource.generatedAt)) {
    issues.push(
      createValidationIssue({
        code: "FRAME_RESULT_GENERATED_AT_INVALID",
        severity: "error",
        message: "generatedAt must be an ISO-8601 UTC timestamp.",
        path: joinPath(basePath, "/generatedAt"),
      }),
    );
  }
  if (!FRAME_ANALYSIS_RESULT_STATUSES.includes(resource.status as FrameAnalysisResultStatus)) {
    issues.push(
      createValidationIssue({
        code: "FRAME_RESULT_STATUS_INVALID",
        severity: "error",
        message: "status is not a supported FrameAnalysisResultResource status.",
        path: joinPath(basePath, "/status"),
      }),
    );
  }
  if (resource.resultKinds !== undefined && !Array.isArray(resource.resultKinds)) {
    issues.push(
      createValidationIssue({
        code: "FRAME_RESULT_KINDS_INVALID",
        severity: "error",
        message: "resultKinds must be an array when provided.",
        path: joinPath(basePath, "/resultKinds"),
      }),
    );
  }

  const merged = mergeValidationResults(
    createValidationResult(issues),
    validateSupportedContractVersion(
      FRAME_ANALYSIS_RESULT_RESOURCE_SCHEMA_ID,
      resource.schemaVersion,
      basePath,
    ),
    validateContentChecksum(resource.sourceContentChecksum, joinPath(basePath, "/sourceContentChecksum")),
    validateContentChecksum(resource.analysisSettingsChecksum, joinPath(basePath, "/analysisSettingsChecksum")),
    resource.resultChecksum === undefined
      ? createValidationResult([])
      : validateContentChecksum(resource.resultChecksum, joinPath(basePath, "/resultChecksum")),
    validateLoadContext(resource.loadContext, joinPath(basePath, "/loadContext")),
    validateProvenance(resource.provenance, joinPath(basePath, "/provenance")),
    validateDiagnostics(resource.diagnostics, joinPath(basePath, "/diagnostics")),
    validatePayloadCatalog(
      resource.payload,
      Array.isArray(resource.resultKinds) ? resource.resultKinds : undefined,
      joinPath(basePath, "/payload"),
    ),
    validateSourceBinding(resource, sourceDocument, basePath),
  );

  return createValidationResult(sortIssuesDeterministically(merged.issues), {
    ...(merged.evaluatedRevision !== undefined ? { evaluatedRevision: merged.evaluatedRevision } : {}),
    ...(merged.evaluatedChecksum !== undefined ? { evaluatedChecksum: merged.evaluatedChecksum } : {}),
    ...(merged.ruleSetVersion !== undefined ? { ruleSetVersion: merged.ruleSetVersion } : {}),
  });
}

export function isFrameAnalysisResultResource(
  value: unknown,
  sourceDocument?: Pick<BridgeFrameAnalysisDocument, "documentId" | "revisionId" | "contentChecksum">,
): value is FrameAnalysisResultResource {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  return validateFrameAnalysisResultResource(
    value as Partial<FrameAnalysisResultResource>,
    "",
    sourceDocument,
  ).status === "valid";
}
