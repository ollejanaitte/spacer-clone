import { buildMemberForceReportCsv } from "./memberForceReport";
import { buildResultCsvExports } from "./resultCsvExport";
import { buildResultPdfReport, type ResultPdfReport } from "./resultPdfReport";
import {
  evaluateIf3ResultGate,
  isRawAnalysisResultCandidate,
  resolveTransientIf3AvailabilityStatus,
  type If3AvailabilityStatus,
  type If3ResultGateInput,
  type If3ResultGateResult,
} from "../results/if3ResultGate";
import { extractLinearStaticAnalysisResultFromResource } from "../results/if3ResultViewModel";
import type { FrameAnalysisResultResource } from "../contracts/frameAnalysisResultResource";
import type { AnalysisResult, ProjectModel, ResultExports } from "../types";

export type If3ExportGateInput = If3ResultGateInput & {
  readonly project?: ProjectModel;
  readonly activeLoadCase?: string;
  readonly loadCaseIdByContextId?: Readonly<Record<string, string>>;
};

export type If3ExportGateResult = If3ResultGateResult;

export class If3ExportBlockedError extends Error {
  readonly gate: If3ExportGateResult;

  constructor(gate: If3ExportGateResult) {
    super("IF3 authoritative export is blocked.");
    this.name = "If3ExportBlockedError";
    this.gate = gate;
  }
}

export function evaluateIf3ExportGate(input: If3ExportGateInput): If3ExportGateResult {
  return evaluateIf3ResultGate(input);
}

export function buildAppIf3ExportGateInput(input: {
  readonly if3Result: FrameAnalysisResultResource | null;
  readonly project: ProjectModel;
  readonly activeLoadCase: string;
  readonly availabilityStatus?: If3AvailabilityStatus;
}): If3ExportGateInput {
  return {
    resource: input.if3Result,
    availabilityStatus:
      input.availabilityStatus ??
      (input.if3Result ? resolveTransientIf3AvailabilityStatus(input.if3Result) : "MISSING"),
    project: input.project,
    activeLoadCase: input.activeLoadCase,
  };
}

export function canAuthorizeAppResultExport(if3Result: FrameAnalysisResultResource | null): boolean {
  if (if3Result == null) {
    return false;
  }
  return evaluateIf3ExportGate({
    resource: if3Result,
    availabilityStatus: resolveTransientIf3AvailabilityStatus(if3Result),
  }).authoritativeOutputAllowed;
}

export function isRawOnlyAppExportState(input: {
  readonly if3Result: FrameAnalysisResultResource | null;
  readonly rawResult: AnalysisResult | null;
}): boolean {
  return input.rawResult != null && input.if3Result == null;
}

export function buildIf3ResultCsvExports(input: If3ExportGateInput): ResultExports {
  requireAuthoritativeExportGate(input);
  const legacyResult = extractLegacyResult(input.resource!, input.loadCaseIdByContextId);
  return buildResultCsvExports(legacyResult);
}

export function buildIf3MemberForceReportCsv(input: If3ExportGateInput): string {
  requireAuthoritativeExportGate(input);
  const legacyResult = extractLegacyResult(input.resource!, input.loadCaseIdByContextId);
  return buildMemberForceReportCsv(legacyResult);
}

export function buildIf3ResultPdfReport(
  input: If3ExportGateInput & { readonly generatedAt?: string },
): ResultPdfReport {
  const gate = requireAuthoritativeExportGate(input);
  if (input.project == null) {
    throw new If3ExportBlockedError({
      ...gate,
      authoritativeOutputAllowed: false,
      diagnostics: [
        ...gate.diagnostics,
        {
          code: "MISSING_PROJECT_CONTEXT",
          severity: "error",
          producer: "if3-d.export-gate",
          message: "ProjectModel is required for authoritative PDF export.",
        },
      ],
    });
  }
  const legacyResult = extractLegacyResult(input.resource!, input.loadCaseIdByContextId);
  return buildResultPdfReport(
    input.project,
    legacyResult,
    input.activeLoadCase ?? "",
    input.generatedAt,
  );
}

export function rejectRawAnalysisResultForExport(candidate: unknown): If3ExportGateResult {
  return evaluateIf3ExportGate({
    resource: candidate as FrameAnalysisResultResource | null,
  });
}

function requireAuthoritativeExportGate(input: If3ExportGateInput): If3ExportGateResult {
  if (input.resource != null && isRawAnalysisResultCandidate(input.resource)) {
    const gate = evaluateIf3ExportGate({ ...input, resource: input.resource });
    throw new If3ExportBlockedError(gate);
  }
  const gate = evaluateIf3ExportGate(input);
  if (!gate.authoritativeOutputAllowed || input.resource == null) {
    throw new If3ExportBlockedError(gate);
  }
  return gate;
}

function extractLegacyResult(
  resource: FrameAnalysisResultResource,
  loadCaseIdByContextId?: Readonly<Record<string, string>>,
): AnalysisResult {
  return extractLinearStaticAnalysisResultFromResource(resource, loadCaseIdByContextId);
}
