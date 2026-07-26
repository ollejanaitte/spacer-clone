import type { FrameAnalysisResultResource } from "../contracts/frameAnalysisResultResource";
import type { AnalysisResult, EndForce } from "../types";
import {
  evaluateIf3ResultGate,
  type If3AvailabilityStatus,
  type If3ResultGateInput,
  type If3ResultGateResult,
} from "./if3ResultGate";
import {
  buildResultViewModel,
  type ResponseSpectrumSelection,
  type ResultViewModel,
} from "./resultViewModel";

export type If3ResultViewModelInput = If3ResultGateInput & {
  readonly loadCaseId: string;
  readonly responseSpectrumSelection?: ResponseSpectrumSelection;
  readonly loadCaseIdByContextId?: Readonly<Record<string, string>>;
};

export type If3ResultViewModelResult = {
  readonly gate: If3ResultGateResult;
  readonly viewModel: ResultViewModel | null;
};

export function buildIf3ResultViewModel(input: If3ResultViewModelInput): If3ResultViewModelResult {
  const gate = evaluateIf3ResultGate(input);
  if (!gate.authoritativeOutputAllowed || input.resource == null) {
    return { gate, viewModel: null };
  }

  const legacyResult = extractLinearStaticAnalysisResultFromResource(
    input.resource,
    input.loadCaseIdByContextId,
  );
  const viewModel = buildResultViewModel(
    legacyResult,
    input.loadCaseId,
    input.responseSpectrumSelection,
  );
  if (viewModel == null) {
    return { gate, viewModel: null };
  }

  return {
    gate,
    viewModel: applyResourceResultId(viewModel, input.resource.resultId),
  };
}

export function extractLinearStaticAnalysisResultFromResource(
  resource: FrameAnalysisResultResource,
  loadCaseIdByContextId?: Readonly<Record<string, string>>,
): AnalysisResult {
  const loadCaseLabelByContextId = buildLoadCaseLabelLookup(resource, loadCaseIdByContextId);
  const displacements =
    resource.payload.nodeDisplacement?.rows.map((row) => ({
      loadCaseId: resolveLoadCaseId(row.loadContextId, loadCaseLabelByContextId),
      nodeId: row.entityId,
      ux: row.values.ux ?? 0,
      uy: row.values.uy ?? 0,
      uz: row.values.uz ?? 0,
      rx: row.values.rx ?? 0,
      ry: row.values.ry ?? 0,
      rz: row.values.rz ?? 0,
    })) ?? [];
  const reactions =
    resource.payload.supportReaction?.rows.map((row) => ({
      loadCaseId: resolveLoadCaseId(row.loadContextId, loadCaseLabelByContextId),
      nodeId: row.entityId,
      fx: row.values.fx ?? 0,
      fy: row.values.fy ?? 0,
      fz: row.values.fz ?? 0,
      mx: row.values.mx ?? 0,
      my: row.values.my ?? 0,
      mz: row.values.mz ?? 0,
      constrainedDofs: [],
    })) ?? [];
  const memberEndForces =
    resource.payload.memberForce?.rows.map((row) => ({
      loadCaseId: resolveLoadCaseId(row.loadContextId, loadCaseLabelByContextId),
      memberId: row.entityId,
      coordinateSystem: "local" as const,
      i: parseEndForce(row.values, "i"),
      j: parseEndForce(row.values, "j"),
    })) ?? [];

  return {
    projectId: resource.sourceDocumentId,
    schemaVersion: "1.0.0",
    analysisSummary: {
      analysisType: "linear_static",
      status: "success",
      startedAt: resource.generatedAt,
      finishedAt: resource.generatedAt,
      durationMs: 0,
      nodeCount: displacements.length,
      memberCount: memberEndForces.length,
      loadCaseCount: resource.loadContext.entries.length,
      totalDof: 0,
      freeDof: 0,
      constrainedDof: 0,
      solver: "scipy_sparse",
    },
    displacements,
    reactions,
    memberEndForces,
    errors: [],
    warnings: [],
  };
}

function buildLoadCaseLabelLookup(
  resource: FrameAnalysisResultResource,
  loadCaseIdByContextId?: Readonly<Record<string, string>>,
): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const entry of resource.loadContext.entries) {
    if (entry.kind !== "loadCase") {
      continue;
    }
    const explicit = loadCaseIdByContextId?.[entry.id];
    lookup.set(entry.id, explicit ?? entry.label ?? entry.id);
  }
  return lookup;
}

function resolveLoadCaseId(
  loadContextId: string | undefined,
  lookup: Map<string, string>,
): string {
  if (loadContextId == null) {
    return "";
  }
  return lookup.get(loadContextId) ?? loadContextId;
}

function parseEndForce(values: Readonly<Record<string, number>>, end: "i" | "j"): EndForce {
  return {
    fx: values[`${end}.fx`] ?? 0,
    fy: values[`${end}.fy`] ?? 0,
    fz: values[`${end}.fz`] ?? 0,
    mx: values[`${end}.mx`] ?? 0,
    my: values[`${end}.my`] ?? 0,
    mz: values[`${end}.mz`] ?? 0,
  };
}

function applyResourceResultId(viewModel: ResultViewModel, resultId: string): ResultViewModel {
  return {
    ...viewModel,
    resultId,
    displacements: { ...viewModel.displacements, resultId },
    reactions: { ...viewModel.reactions, resultId },
    memberForces: { ...viewModel.memberForces, resultId },
    eigenModes: viewModel.eigenModes ? { ...viewModel.eigenModes, resultId } : null,
    responseSpectrum: viewModel.responseSpectrum
      ? {
          ...viewModel.responseSpectrum,
          resultId,
          displacements: { ...viewModel.responseSpectrum.displacements, resultId },
          reactions: { ...viewModel.responseSpectrum.reactions, resultId },
          memberSectionForces: {
            ...viewModel.responseSpectrum.memberSectionForces,
            resultId,
          },
          memberForces: { ...viewModel.responseSpectrum.memberForces, resultId },
        }
      : null,
    influence: viewModel.influence ? { ...viewModel.influence, resultId } : null,
  };
}

export type { If3AvailabilityStatus };
