import type { BuildIntermediateInput } from "./core/pipeline/pipeline";
import type { CanonicalLinerIntermediateResult, ComputationDiagnostic } from "./core/types";
import type { FrameMappingOptions, FrameMappingResult } from "./mapper/frameModelMapper";
import type { HeadlessLinerFrameProjectInput, HeadlessLinerFrameProjectResult } from "./headless/createHeadlessLinerFrameProject";
import type { ProjectModel } from "../types";

/** Internal route identifiers for future liner UI navigation (not registered in App yet). */
export type LinerUiRouteId = "liner.setup" | "liner.preview" | "liner.mappingReview";

export const LINER_UI_ROUTE_IDS = [
  "liner.setup",
  "liner.preview",
  "liner.mappingReview",
] as const satisfies readonly LinerUiRouteId[];

/** URL paths under `/pro/liner/*`, matching existing pro-feature routing style. */
export const LINER_UI_ROUTE_PATHS: Record<LinerUiRouteId, string> = {
  "liner.setup": "/pro/liner/setup",
  "liner.preview": "/pro/liner/preview",
  "liner.mappingReview": "/pro/liner/mapping-review",
};

export type LinerUiPanelId =
  | "alignmentInput"
  | "stationTable"
  | "gridPreview"
  | "diagnostics"
  | "mappingReview"
  | "headlessGenerationSummary";

export const LINER_UI_PANEL_IDS = [
  "alignmentInput",
  "stationTable",
  "gridPreview",
  "diagnostics",
  "mappingReview",
  "headlessGenerationSummary",
] as const satisfies readonly LinerUiPanelId[];

/** Primary route for each panel region in the future liner window. */
export const LINER_UI_PANEL_ROUTE: Record<LinerUiPanelId, LinerUiRouteId> = {
  alignmentInput: "liner.setup",
  stationTable: "liner.setup",
  gridPreview: "liner.preview",
  diagnostics: "liner.preview",
  mappingReview: "liner.mappingReview",
  headlessGenerationSummary: "liner.mappingReview",
};

export type LinerUiWorkflowStep =
  | "editInput"
  | "computeIntermediate"
  | "reviewDiagnostics"
  | "generateFrameMapping"
  | "attachProjectExtension"
  | "runHeadlessValidation";

export const LINER_UI_WORKFLOW_STEPS = [
  "editInput",
  "computeIntermediate",
  "reviewDiagnostics",
  "generateFrameMapping",
  "attachProjectExtension",
  "runHeadlessValidation",
] as const satisfies readonly LinerUiWorkflowStep[];

export const LINER_UI_WORKFLOW_STEP_ORDER: readonly LinerUiWorkflowStep[] = LINER_UI_WORKFLOW_STEPS;

export type LinerUiStateOwner =
  | "ui"
  | "project"
  | "linerCore"
  | "linerMapper"
  | "linerSchema"
  | "analysis";

export type LinerUiStateSlice =
  | "draft"
  | "domain"
  | "intermediate"
  | "mapping"
  | "projectExtension"
  | "analysisResult"
  | "stale";

export type LinerUiStateBoundary = {
  slice: LinerUiStateSlice;
  owner: LinerUiStateOwner;
  persisted: boolean;
  description: string;
};

export const LINER_UI_STATE_BOUNDARIES: readonly LinerUiStateBoundary[] = [
  {
    slice: "draft",
    owner: "ui",
    persisted: false,
    description: "Ephemeral form edits and selection before commit to domain.",
  },
  {
    slice: "domain",
    owner: "project",
    persisted: true,
    description: "User-editable liner domain embedded in project.liner or standalone file.",
  },
  {
    slice: "intermediate",
    owner: "linerCore",
    persisted: false,
    description: "Canonical LinerIntermediateResult from buildIntermediateResult(); recompute on load.",
  },
  {
    slice: "mapping",
    owner: "linerMapper",
    persisted: false,
    description: "FrameModelMappingOutput from mapToFrameModel(); not stored until merge.",
  },
  {
    slice: "projectExtension",
    owner: "linerSchema",
    persisted: true,
    description: "project.liner metadata and linerTrace after attachLinerMappingToProject().",
  },
  {
    slice: "analysisResult",
    owner: "analysis",
    persisted: true,
    description: "Existing analysis results; unchanged unless user runs analysis after merge.",
  },
  {
    slice: "stale",
    owner: "ui",
    persisted: false,
    description: "UI flag when domain revision diverges from intermediate sourceRevision.",
  },
];

export type LinerFeatureModule = "core" | "mapper" | "schema" | "headless";

export type LinerFeatureCapabilityId =
  | "buildIntermediateResult"
  | "mapToFrameModel"
  | "attachLinerMappingToProject"
  | "createHeadlessLinerFrameProject";

export type LinerFeatureCapability = {
  id: LinerFeatureCapabilityId;
  module: LinerFeatureModule;
  workflowStep: LinerUiWorkflowStep;
  entryPoint: string;
  phase: "P1-1" | "P1-3" | "P1-4" | "P1-5";
};

/** Future UI actions map to existing P1-1 through P1-5 entry points only. */
export const LINER_FEATURE_CAPABILITIES: readonly LinerFeatureCapability[] = [
  {
    id: "buildIntermediateResult",
    module: "core",
    workflowStep: "computeIntermediate",
    entryPoint: "buildIntermediateResult",
    phase: "P1-1",
  },
  {
    id: "mapToFrameModel",
    module: "mapper",
    workflowStep: "generateFrameMapping",
    entryPoint: "mapToFrameModel",
    phase: "P1-3",
  },
  {
    id: "attachLinerMappingToProject",
    module: "schema",
    workflowStep: "attachProjectExtension",
    entryPoint: "attachLinerMappingToProject",
    phase: "P1-4",
  },
  {
    id: "createHeadlessLinerFrameProject",
    module: "headless",
    workflowStep: "runHeadlessValidation",
    entryPoint: "createHeadlessLinerFrameProject",
    phase: "P1-5",
  },
];

/** i18n group names only; Japanese strings live in frontend/src/i18n/ja.ts under `liner.*`. */
export const LINER_I18N_KEY_GROUPS = [
  "liner.toolbar",
  "liner.window",
  "liner.panels",
  "liner.workflow",
  "liner.actions",
  "liner.status",
  "liner.diagnostics",
  "liner.errors",
] as const;

export type LinerI18nKeyGroup = (typeof LINER_I18N_KEY_GROUPS)[number];

export function assertUniqueLinerI18nKeyGroups(): void {
  const seen = new Set<string>();
  for (const group of LINER_I18N_KEY_GROUPS) {
    if (seen.has(group)) {
      throw new Error(`Duplicate liner i18n key group: ${group}`);
    }
    seen.add(group);
  }
}

export type LinerUiStaleReason = "domainChanged" | "computeInProgress" | "computeFailed" | "mappingOutdated";

export type LinerUiReadiness = "draft" | "computing" | "ready" | "stale" | "error";

/** Diagnostics originate in core/headless; UI displays translated messageKey only. */
export type LinerUiDiagnosticDisplay = Pick<
  ComputationDiagnostic,
  "level" | "code" | "messageKey" | "entityPath" | "entityId" | "station" | "physicalDistance"
>;

export type LinerUiAdapterInput = {
  domain: BuildIntermediateInput;
  intermediate: CanonicalLinerIntermediateResult | null;
  mapping: FrameMappingResult | null;
  project: ProjectModel | null;
  readiness: LinerUiReadiness;
  staleReason: LinerUiStaleReason | null;
  diagnostics: LinerUiDiagnosticDisplay[];
};

export type LinerUiAdapterOutput = {
  headless: HeadlessLinerFrameProjectResult | null;
  mappingOptions: FrameMappingOptions;
  headlessInput: HeadlessLinerFrameProjectInput | null;
};

export function resolveLinerUiRoutePath(routeId: LinerUiRouteId): string {
  return LINER_UI_ROUTE_PATHS[routeId];
}

export function resolveLinerUiRouteId(pathname: string): LinerUiRouteId | null {
  for (const routeId of LINER_UI_ROUTE_IDS) {
    if (pathname === LINER_UI_ROUTE_PATHS[routeId]) {
      return routeId;
    }
  }
  return null;
}

export function getLinerUiStateBoundary(slice: LinerUiStateSlice): LinerUiStateBoundary {
  const boundary = LINER_UI_STATE_BOUNDARIES.find((entry) => entry.slice === slice);
  if (!boundary) {
    throw new Error(`Unknown liner UI state slice: ${slice}`);
  }
  return boundary;
}

export function getLinerFeatureCapability(id: LinerFeatureCapabilityId): LinerFeatureCapability {
  const capability = LINER_FEATURE_CAPABILITIES.find((entry) => entry.id === id);
  if (!capability) {
    throw new Error(`Unknown liner feature capability: ${id}`);
  }
  return capability;
}

export function toLinerUiDiagnosticDisplay(
  diagnostic: ComputationDiagnostic,
): LinerUiDiagnosticDisplay {
  return {
    level: diagnostic.level,
    code: diagnostic.code,
    messageKey: diagnostic.messageKey,
    entityPath: diagnostic.entityPath,
    entityId: diagnostic.entityId,
    station: diagnostic.station,
    physicalDistance: diagnostic.physicalDistance,
  };
}
