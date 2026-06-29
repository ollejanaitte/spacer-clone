import type { ProjectModel } from "../../types";
import { createIssue, LINER_DIAGNOSTIC_CODES } from "../core/diagnostics";
import { buildIntermediateResult } from "../core/pipeline/pipeline";
import type { CanonicalLinerIntermediateResult, ComputationDiagnostic } from "../core/types";
import {
  LINER_HEADLESS_ANALYSIS_SETTINGS,
  LINER_HEADLESS_FIXTURE_MATERIAL_IDS,
  LINER_HEADLESS_FIXTURE_SECTION_IDS,
  LINER_HEADLESS_PLACEHOLDER_LOAD_CASE,
  applyLinerHeadlessFixtureMemberRules,
  createHeadlessLinerFrameProject,
  type HeadlessLinerFrameProjectResult,
} from "../headless";
import type { FrameMappingOptions, FrameMappingResult } from "../mapper/frameModelMapper";
import { toLinerUiDiagnosticDisplay, type LinerUiDiagnosticDisplay } from "../uiPreparation";
import type { LinerDraft } from "./linerUiAdapter";

export type LinerMappingReviewSummary = {
  nodeCount: number;
  memberCount: number;
  supportCount: number;
  traceCount: number;
  diagnosticCount: number;
  validationReady: boolean;
};

export type LinerViewerAdapterResult = {
  intermediate: CanonicalLinerIntermediateResult;
  mappingResult: FrameMappingResult;
  headless: HeadlessLinerFrameProjectResult;
  viewerProject: ProjectModel | null;
  diagnostics: LinerUiDiagnosticDisplay[];
  summary: LinerMappingReviewSummary;
};

export type BuildLinerViewerReviewOptions = {
  mappingOptions?: FrameMappingOptions;
  generatedAt?: string;
};

const DEFAULT_VIEWER_REVIEW_MAPPING_OPTIONS: FrameMappingOptions = {
  materialIds: Object.values(LINER_HEADLESS_FIXTURE_MATERIAL_IDS),
  sectionIds: Object.values(LINER_HEADLESS_FIXTURE_SECTION_IDS),
};

export function buildLinerViewerReviewFromDraft(
  draft: LinerDraft,
  baseProject: ProjectModel,
  options: BuildLinerViewerReviewOptions = {},
): LinerViewerAdapterResult {
  const inputDiagnostics = collectViewerInputDiagnostics(draft);
  const intermediate = applyLinerHeadlessFixtureMemberRules(
    buildIntermediateResult(toViewerSafeDraft(draft)),
  );
  const headless = createHeadlessLinerFrameProject({
    intermediate,
    baseProject: createViewerReviewBaseProject(baseProject),
    mappingOptions: {
      ...DEFAULT_VIEWER_REVIEW_MAPPING_OPTIONS,
      ...options.mappingOptions,
    },
    options: {
      generatedAt: options.generatedAt,
    },
  });
  const diagnostics = [...inputDiagnostics, ...headless.diagnostics];
  const viewerProject = inputDiagnostics.some((diagnostic) => diagnostic.level === "error")
    ? null
    : headless.project;

  return {
    intermediate,
    mappingResult: headless.mappingResult,
    headless: {
      ...headless,
      project: viewerProject,
      diagnostics,
      validationReady: headless.validationReady && viewerProject !== null,
    },
    viewerProject,
    diagnostics: diagnostics.map(toLinerUiDiagnosticDisplay),
    summary: {
      nodeCount: headless.mappingResult.nodes.length,
      memberCount: headless.mappingResult.members.length,
      supportCount: headless.mappingResult.supports.length,
      traceCount: headless.mappingResult.linerTrace.length,
      diagnosticCount: diagnostics.length,
      validationReady: headless.validationReady && viewerProject !== null,
    },
  };
}

function createViewerReviewBaseProject(project: ProjectModel): ProjectModel {
  return {
    ...project,
    loadCases:
      project.loadCases.length > 0
        ? project.loadCases
        : [{ ...LINER_HEADLESS_PLACEHOLDER_LOAD_CASE }],
    analysisSettings: {
      ...LINER_HEADLESS_ANALYSIS_SETTINGS,
      ...project.analysisSettings,
      solver: project.analysisSettings.solver ?? LINER_HEADLESS_ANALYSIS_SETTINGS.solver,
    },
  };
}

function toViewerSafeDraft(draft: LinerDraft): LinerDraft {
  if (isPositiveFiniteNumber(draft.sampleInterval)) {
    return draft;
  }

  return {
    ...draft,
    sampleInterval: 1,
  };
}

function collectViewerInputDiagnostics(draft: LinerDraft): ComputationDiagnostic[] {
  if (isPositiveFiniteNumber(draft.sampleInterval)) {
    return [];
  }

  return [
    createIssue("error", LINER_DIAGNOSTIC_CODES.gridSpacingInvalid, {
      messageKey: "liner.errors.grid_spacing",
      entityType: "linerDraft",
      field: "sampleInterval",
    }),
  ];
}

function isPositiveFiniteNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
