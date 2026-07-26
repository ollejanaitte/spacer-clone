import type { BridgeFrameAnalysisDocument } from "../contracts/bridgeFrameAnalysisDocument";
import type {
  FrameAnalysisResultDiagnostic,
  FrameAnalysisResultResource,
} from "../contracts/frameAnalysisResultResource";
import {
  validateFrameAnalysisResultResource,
  type FrameAnalysisResultStatus,
} from "../contracts/frameAnalysisResultResource";
import type { AnalysisResult } from "../types";

export const IF3_AVAILABILITY_STATUSES = [
  "VALID",
  "STALE",
  "MISSING",
  "INVALID",
  "UNSUPPORTED",
  "FAILED",
  "PARTIAL",
  "RUNNING",
  "PENDING",
] as const;

export type If3AvailabilityStatus = (typeof IF3_AVAILABILITY_STATUSES)[number];
export type If3ConsumerState = If3AvailabilityStatus;

export type If3ResultRef = {
  readonly resultId: string;
  readonly resultChecksum?: string;
  readonly analysisRunId?: string;
};

export type If3ResultGateInput = {
  readonly resource?: FrameAnalysisResultResource | null;
  readonly availabilityStatus?: If3AvailabilityStatus | null;
  readonly availabilityDiagnostics?: readonly FrameAnalysisResultDiagnostic[];
  readonly sourceDocument?: Pick<
    BridgeFrameAnalysisDocument,
    "documentId" | "revisionId" | "contentChecksum"
  >;
};

export type If3ResultGateResult = {
  readonly state: If3ConsumerState;
  readonly diagnostics: readonly FrameAnalysisResultDiagnostic[];
  readonly authoritativeOutputAllowed: boolean;
  readonly resultRef: If3ResultRef | null;
};

const AUTHORITATIVE_ALLOW_STATUSES = new Set<If3AvailabilityStatus>(["VALID"]);
const RESOURCE_SUCCEEDED_STATUS: FrameAnalysisResultStatus = "SUCCEEDED";

export function resolveTransientIf3AvailabilityStatus(
  resource: FrameAnalysisResultResource | null | undefined,
): If3AvailabilityStatus {
  if (resource == null) {
    return "MISSING";
  }
  switch (resource.status) {
    case "SUCCEEDED":
      return "VALID";
    case "FAILED":
      return "FAILED";
    case "PARTIAL":
      return "PARTIAL";
    case "INVALID":
      return "INVALID";
    case "UNSUPPORTED":
      return "UNSUPPORTED";
    case "STALE":
      return "STALE";
    case "RUNNING":
      return "RUNNING";
    case "PENDING":
      return "PENDING";
    default:
      return "INVALID";
  }
}

export function isRawAnalysisResultCandidate(value: unknown): value is AnalysisResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.projectId === "string" &&
    !("resultId" in record) &&
    !("schemaId" in record) &&
    Array.isArray(record.displacements)
  );
}

export function evaluateIf3ResultGate(input: If3ResultGateInput): If3ResultGateResult {
  const availabilityDiagnostics = input.availabilityDiagnostics ?? [];
  const availabilityStatus = resolveAvailabilityStatus(input);

  if (input.resource != null && isRawAnalysisResultCandidate(input.resource)) {
    return blockedGate({
      state: "INVALID",
      diagnostics: sortDiagnostics([
        ...availabilityDiagnostics,
        consumerDiagnostic(
          "RAW_ANALYSIS_RESULT_REJECTED",
          "Raw AnalysisResult cannot be used as an authoritative IF3 consumer input.",
        ),
      ]),
    });
  }

  if (input.resource == null) {
    return blockedGate({
      state: availabilityStatus ?? "MISSING",
      diagnostics: sortDiagnostics([
        ...availabilityDiagnostics,
        consumerDiagnostic(
          "MISSING_RESULT_ID",
          "FrameAnalysisResultResource is required for authoritative consumption.",
        ),
      ]),
    });
  }

  const validation = validateFrameAnalysisResultResource(
    input.resource,
    "",
    input.sourceDocument,
  );
  const validationDiagnostics = validationIssuesToDiagnostics(validation.issues);
  const resourceDiagnostics = input.resource.diagnostics ?? [];
  const diagnostics = sortDiagnostics([
    ...availabilityDiagnostics,
    ...validationDiagnostics,
    ...resourceDiagnostics,
  ]);

  const state = availabilityStatus ?? mapResourceStatusToConsumerState(input.resource.status);
  const resultRef: If3ResultRef = {
    resultId: input.resource.resultId,
    resultChecksum: input.resource.resultChecksum?.hexDigest,
    analysisRunId: input.resource.analysisRunId,
  };

  const authoritativeOutputAllowed =
    AUTHORITATIVE_ALLOW_STATUSES.has(state) &&
    input.resource.status === RESOURCE_SUCCEEDED_STATUS &&
    validation.status === "valid";

  return {
    state,
    diagnostics,
    authoritativeOutputAllowed,
    resultRef,
  };
}

function resolveAvailabilityStatus(input: If3ResultGateInput): If3AvailabilityStatus | null {
  if (input.availabilityStatus != null) {
    return input.availabilityStatus;
  }
  if (input.resource == null) {
    return "MISSING";
  }
  return mapResourceStatusToConsumerState(input.resource.status);
}

function mapResourceStatusToConsumerState(
  status: FrameAnalysisResultStatus,
): If3ConsumerState {
  switch (status) {
    case "SUCCEEDED":
      return "VALID";
    case "STALE":
      return "STALE";
    case "FAILED":
      return "FAILED";
    case "PARTIAL":
      return "PARTIAL";
    case "INVALID":
      return "INVALID";
    case "UNSUPPORTED":
      return "UNSUPPORTED";
    case "RUNNING":
      return "RUNNING";
    case "PENDING":
      return "PENDING";
    default:
      return "INVALID";
  }
}

function blockedGate(input: {
  state: If3ConsumerState;
  diagnostics: readonly FrameAnalysisResultDiagnostic[];
}): If3ResultGateResult {
  return {
    state: input.state,
    diagnostics: input.diagnostics,
    authoritativeOutputAllowed: false,
    resultRef: null,
  };
}

function consumerDiagnostic(code: string, message: string): FrameAnalysisResultDiagnostic {
  return {
    code,
    severity: "error",
    producer: "if3-d.consumer-gate",
    message,
  };
}

function validationIssuesToDiagnostics(
  issues: readonly { code: string; severity: "error" | "warning" | "info"; message: string; path: string }[],
): FrameAnalysisResultDiagnostic[] {
  return issues.map((issue) => ({
    code: issue.code,
    severity: issue.severity,
    producer: "if3-d.consumer-gate",
    message: issue.message,
    path: issue.path,
  }));
}

function sortDiagnostics(
  diagnostics: readonly FrameAnalysisResultDiagnostic[],
): FrameAnalysisResultDiagnostic[] {
  return [...diagnostics].sort((left, right) => {
    const leftKey = `${left.code}\u0000${left.severity}\u0000${left.producer}\u0000${left.message}\u0000${left.path ?? ""}`;
    const rightKey = `${right.code}\u0000${right.severity}\u0000${right.producer}\u0000${right.message}\u0000${right.path ?? ""}`;
    return leftKey.localeCompare(rightKey);
  });
}
