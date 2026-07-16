import type { ProjectModel } from "../../types";
import { pointAtStationOffset } from "../core/coordinate3d";
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

export type ViewerNodeCoordinateMismatch = {
  nodeId: string;
  gridPointId?: string;
  physicalDistance?: number;
  offset?: number;
  reason?: string;
  expected: { x: number; y: number; z: number };
  actual: { x: number; y: number; z: number };
};

export type CollectViewerNodeCoordinateMismatchesOptions = {
  tolerance?: number;
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

function coordinatesWithinTolerance(
  left: { x: number; y: number; z: number },
  right: { x: number; y: number; z: number },
  tolerance: number,
): boolean {
  return (
    Math.abs(left.x - right.x) <= tolerance
    && Math.abs(left.y - right.y) <= tolerance
    && Math.abs(left.z - right.z) <= tolerance
  );
}

/**
 * Compares Viewer3D project nodes against the public coordinate3d API using mapping-review linerTrace.
 */
export function collectViewerNodeCoordinateMismatches(
  draft: LinerDraft,
  review: LinerViewerAdapterResult,
  options: CollectViewerNodeCoordinateMismatchesOptions = {},
): ViewerNodeCoordinateMismatch[] {
  const tolerance = options.tolerance ?? 1e-6;
  const viewerProject = review.viewerProject;
  if (!viewerProject) {
    return [];
  }

  const nodeById = new Map(viewerProject.nodes.map((node) => [node.id, node]));
  const mismatches: ViewerNodeCoordinateMismatch[] = [];

  for (const trace of review.mappingResult.linerTrace) {
    if (trace.frameEntityType !== "node") {
      continue;
    }

    const node = nodeById.get(trace.frameEntityId);
    if (!node) {
      continue;
    }

    if (trace.physicalDistance === undefined || trace.offset === undefined) {
      continue;
    }

    const expected = pointAtStationOffset(draft, trace.physicalDistance, trace.offset);
    if (!expected.ok) {
      mismatches.push({
        nodeId: node.id,
        gridPointId: trace.gridPointId,
        physicalDistance: trace.physicalDistance,
        offset: trace.offset,
        reason: expected.error.code,
        expected: { x: Number.NaN, y: Number.NaN, z: Number.NaN },
        actual: { x: node.x, y: node.y, z: node.z },
      });
      continue;
    }

    const actual = { x: node.x, y: node.y, z: node.z };
    if (!coordinatesWithinTolerance(expected.value, actual, tolerance)) {
      mismatches.push({
        nodeId: node.id,
        gridPointId: trace.gridPointId,
        physicalDistance: trace.physicalDistance,
        offset: trace.offset,
        expected: {
          x: expected.value.x,
          y: expected.value.y,
          z: expected.value.z,
        },
        actual,
      });
    }
  }

  return mismatches;
}

/**
 * Compares Viewer3D project nodes against intermediate grid points from the same review build.
 */
export function collectViewerNodeGridMismatches(
  review: LinerViewerAdapterResult,
  options: CollectViewerNodeCoordinateMismatchesOptions = {},
): ViewerNodeCoordinateMismatch[] {
  const tolerance = options.tolerance ?? 1e-6;
  const viewerProject = review.viewerProject;
  if (!viewerProject) {
    return [];
  }

  const nodeById = new Map(viewerProject.nodes.map((node) => [node.id, node]));
  const gridPointById = new Map(
    review.intermediate.grid.points.map((point) => [point.id, point]),
  );
  const mismatches: ViewerNodeCoordinateMismatch[] = [];

  for (const trace of review.mappingResult.linerTrace) {
    if (trace.frameEntityType !== "node" || !trace.gridPointId) {
      continue;
    }

    const node = nodeById.get(trace.frameEntityId);
    const gridPoint = gridPointById.get(trace.gridPointId);
    if (!node || !gridPoint) {
      continue;
    }

    const expected = { x: gridPoint.x, y: gridPoint.y, z: gridPoint.z };
    const actual = { x: node.x, y: node.y, z: node.z };
    if (!coordinatesWithinTolerance(expected, actual, tolerance)) {
      mismatches.push({
        nodeId: node.id,
        gridPointId: trace.gridPointId,
        physicalDistance: trace.physicalDistance,
        offset: trace.offset,
        expected,
        actual,
      });
    }
  }

  return mismatches;
}
