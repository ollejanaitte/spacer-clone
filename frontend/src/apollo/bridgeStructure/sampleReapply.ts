/**
 * Step 5-R R1: sample reapply detection, diff, and atomic transaction (DEC-S5-0002).
 * Silent overwrite is prohibited for edited / existing projects.
 */

import type { ProjectModel } from "../../types";
import { createDefaultProject } from "../../data/defaultProject";
import { saveApolloWorkspaceEntry } from "../workspace";
import {
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
  withBridgeStructureInputDraft,
} from "./generateBsdd";
import {
  applyAndGenerateContinuousGirderSample,
  applyAndGenerateSimpleSingleSpanSample,
  applyContinuousGirderSampleInput,
  applySimpleSingleSpanSampleInput,
  buildCompleteSampleDraft,
  CONTINUOUS_GIRDER_SAMPLE_SPANS,
  SAMPLE_PRESET_CATALOG,
  SIMPLE_SINGLE_SPAN_SAMPLE_INPUT,
} from "./sampleInputs";
import { createEmptyBridgeStructureInputDraft } from "./validation";
import type { ApolloBridgeStructureInputDraft } from "./types";
import { BridgeSystem, buildContinuousLayout, sumSpanLengths } from "../contracts";

export type SampleKind = "SIMPLE_SINGLE" | "CONTINUOUS";

export type ReapplyDetectionKind =
  | "NEW_EMPTY_PROJECT"
  | "EXISTING_UNCHANGED_SAMPLE"
  | "EXISTING_EDITED_PROJECT"
  | "EXISTING_OTHER_PROJECT"
  | "DIRTY_UNSAVED";

export type SampleReapplyCategory =
  | "bridge_basics"
  | "girders_deck"
  | "haunch_appurtenances"
  | "cross_beam_frame_laterals"
  | "pavement_markings"
  | "materials_unit_weights"
  | "loads"
  | "visibility_settings"
  | "other";

export type SampleReapplyChangeType = "changed" | "added" | "removed";

export type SampleReapplyDiffEntry = {
  readonly path: string;
  readonly category: SampleReapplyCategory;
  readonly changeType: SampleReapplyChangeType;
  readonly before: unknown;
  readonly after: unknown;
  readonly safety: "UNVERIFIED_DEVELOPMENT_ONLY";
};

export type SampleReapplyDiffSummary = {
  readonly changedFieldCount: number;
  readonly addedEntityCount: number;
  readonly removedEntityCount: number;
  readonly byCategory: Readonly<Record<SampleReapplyCategory, number>>;
  readonly entries: readonly SampleReapplyDiffEntry[];
  readonly currentProjectName: string;
  readonly sampleName: string;
};

export type SampleReapplyChoice = "cancel" | "create_new" | "replace";

export type SampleReapplyDetection = {
  readonly kind: ReapplyDetectionKind;
  readonly requiresConfirmation: boolean;
  readonly sampleKind: SampleKind;
  readonly currentProjectName: string;
  readonly sampleName: string;
  readonly diff: SampleReapplyDiffSummary;
};

const BASIC_PATHS: ReadonlyArray<{
  path: string;
  category: SampleReapplyCategory;
  pick: (d: ApolloBridgeStructureInputDraft) => unknown;
}> = [
  { path: "spanLength", category: "bridge_basics", pick: (d) => d.spanLength },
  { path: "bridgeLength", category: "bridge_basics", pick: (d) => d.bridgeLength },
  { path: "width", category: "bridge_basics", pick: (d) => d.width },
  { path: "girderCount", category: "girders_deck", pick: (d) => d.girderCount },
  { path: "girderSpacing", category: "girders_deck", pick: (d) => d.girderSpacing },
  { path: "girderDepth", category: "girders_deck", pick: (d) => d.girderDepth },
  { path: "deckThickness", category: "girders_deck", pick: (d) => d.deckThickness },
  { path: "crossBeamSpacing", category: "cross_beam_frame_laterals", pick: (d) => d.crossBeamSpacing },
  { path: "swayBracingInterval", category: "cross_beam_frame_laterals", pick: (d) => d.swayBracingInterval },
  { path: "lateralBracingEnabled", category: "cross_beam_frame_laterals", pick: (d) => d.lateralBracingEnabled },
  { path: "upperLateralBracingEnabled", category: "cross_beam_frame_laterals", pick: (d) => d.upperLateralBracingEnabled },
  { path: "steelUnitWeight", category: "materials_unit_weights", pick: (d) => d.steelUnitWeight },
  { path: "rcUnitWeight", category: "materials_unit_weights", pick: (d) => d.rcUnitWeight },
  { path: "pavement.presence", category: "pavement_markings", pick: (d) => d.pavementConfiguration.presence },
  {
    path: "pavement.thickness",
    category: "pavement_markings",
    pick: (d) => d.pavementConfiguration.item?.thickness ?? null,
  },
  {
    path: "roadMarkings.enabled",
    category: "pavement_markings",
    pick: (d) => d.roadMarkingsConfiguration.enabled,
  },
  {
    path: "lateralAngle.enabled",
    category: "cross_beam_frame_laterals",
    pick: (d) => d.lateralAngleSection.enabled,
  },
  {
    path: "lateralAngle.legA",
    category: "cross_beam_frame_laterals",
    pick: (d) => d.lateralAngleSection.legA,
  },
  {
    path: "crossFrame.pattern",
    category: "cross_beam_frame_laterals",
    pick: (d) => d.crossFrameAttachment.pattern,
  },
  {
    path: "crossFrame.upperAttachmentDepth",
    category: "cross_beam_frame_laterals",
    pick: (d) => d.crossFrameAttachment.upperAttachmentDepthFromGirderTop,
  },
  {
    path: "crossFrame.lowerAttachmentDepth",
    category: "cross_beam_frame_laterals",
    pick: (d) => d.crossFrameAttachment.lowerAttachmentDepthFromGirderTop,
  },
  {
    path: "appurtenance.providedCount",
    category: "haunch_appurtenances",
    pick: (d) => d.appurtenanceConfiguration.slots.filter((s) => s.presence === "PROVIDED").length,
  },
  {
    path: "haunch.providedCount",
    category: "haunch_appurtenances",
    pick: (d) => d.haunchConfiguration.girders.filter((g) => g.presence === "PROVIDED").length,
  },
  { path: "bridgeSystem", category: "bridge_basics", pick: (d) => d.bridgeSystem },
  { path: "generatedAt", category: "other", pick: (d) => d.generatedAt },
];

const EMPTY_CATEGORY_COUNTS = (): Record<SampleReapplyCategory, number> => ({
  bridge_basics: 0,
  girders_deck: 0,
  haunch_appurtenances: 0,
  cross_beam_frame_laterals: 0,
  pavement_markings: 0,
  materials_unit_weights: 0,
  loads: 0,
  visibility_settings: 0,
  other: 0,
});

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}

function isEmptyBridgeInput(draft: ApolloBridgeStructureInputDraft): boolean {
  const empty = createEmptyBridgeStructureInputDraft();
  return BASIC_PATHS.every((entry) => valuesEqual(entry.pick(draft), entry.pick(empty)));
}

function sampleNameFor(kind: SampleKind): string {
  return kind === "CONTINUOUS"
    ? `連続桁サンプル [${CONTINUOUS_GIRDER_SAMPLE_SPANS.join(", ")}]`
    : "動作確認用サンプル（単純桁）";
}

function buildCandidateDraft(project: ProjectModel, kind: SampleKind): ApolloBridgeStructureInputDraft {
  if (kind === "CONTINUOUS") {
    const layout = buildContinuousLayout(CONTINUOUS_GIRDER_SAMPLE_SPANS);
    return buildCompleteSampleDraft(project.project.id, {
      ...SIMPLE_SINGLE_SPAN_SAMPLE_INPUT,
      bridgeSystem: BridgeSystem.CONTINUOUS,
      spanLength: null,
      bridgeLength: sumSpanLengths(layout.spans),
      spans: layout.spans,
      supports: layout.supports,
      generatedAt: null,
    });
  }
  return buildCompleteSampleDraft(project.project.id, {
    ...SIMPLE_SINGLE_SPAN_SAMPLE_INPUT,
    generatedAt: null,
  });
}

export function diffProjectForSampleReapply(
  current: ProjectModel,
  candidate: ProjectModel,
  sampleKind: SampleKind,
): SampleReapplyDiffSummary {
  const currentDraft = getBridgeStructureInputDraft(current);
  const candidateDraft = getBridgeStructureInputDraft(candidate);
  const entries: SampleReapplyDiffEntry[] = [];
  const byCategory = EMPTY_CATEGORY_COUNTS();

  for (const field of BASIC_PATHS) {
    const before = field.pick(currentDraft);
    const after = field.pick(candidateDraft);
    if (valuesEqual(before, after)) continue;
    const changeType: SampleReapplyChangeType =
      before == null && after != null ? "added" : after == null && before != null ? "removed" : "changed";
    entries.push({
      path: field.path,
      category: field.category,
      changeType,
      before,
      after,
      safety: "UNVERIFIED_DEVELOPMENT_ONLY",
    });
    byCategory[field.category] += 1;
  }

  return {
    changedFieldCount: entries.filter((e) => e.changeType === "changed").length,
    addedEntityCount: entries.filter((e) => e.changeType === "added").length,
    removedEntityCount: entries.filter((e) => e.changeType === "removed").length,
    byCategory,
    entries,
    currentProjectName: current.project.name || current.project.id,
    sampleName: sampleNameFor(sampleKind),
  };
}

export function detectSampleReapply(
  project: ProjectModel,
  sampleKind: SampleKind = "SIMPLE_SINGLE",
  options?: { readonly dirtyUnsaved?: boolean },
): SampleReapplyDetection {
  const currentDraft = getBridgeStructureInputDraft(project);
  const candidateProject = withBridgeStructureInputDraft(project, () =>
    buildCandidateDraft(project, sampleKind),
  );
  const diff = diffProjectForSampleReapply(project, candidateProject, sampleKind);

  if (options?.dirtyUnsaved) {
    return {
      kind: "DIRTY_UNSAVED",
      requiresConfirmation: true,
      sampleKind,
      currentProjectName: diff.currentProjectName,
      sampleName: diff.sampleName,
      diff,
    };
  }

  if (isEmptyBridgeInput(currentDraft)) {
    return {
      kind: "NEW_EMPTY_PROJECT",
      requiresConfirmation: false,
      sampleKind,
      currentProjectName: diff.currentProjectName,
      sampleName: diff.sampleName,
      diff,
    };
  }

  if (diff.entries.length === 0) {
    return {
      kind: "EXISTING_UNCHANGED_SAMPLE",
      requiresConfirmation: true,
      sampleKind,
      currentProjectName: diff.currentProjectName,
      sampleName: diff.sampleName,
      diff,
    };
  }

  const systemMismatch =
    (sampleKind === "SIMPLE_SINGLE" && currentDraft.bridgeSystem === BridgeSystem.CONTINUOUS) ||
    (sampleKind === "CONTINUOUS" && currentDraft.bridgeSystem !== BridgeSystem.CONTINUOUS);

  return {
    kind: systemMismatch ? "EXISTING_OTHER_PROJECT" : "EXISTING_EDITED_PROJECT",
    requiresConfirmation: true,
    sampleKind,
    currentProjectName: diff.currentProjectName,
    sampleName: diff.sampleName,
    diff,
  };
}

export type SampleReapplyTransactionResult =
  | {
      readonly ok: true;
      readonly choice: "replace" | "create_new";
      readonly project: ProjectModel;
      readonly preservedWorkspaceId?: string;
    }
  | {
      readonly ok: false;
      readonly choice: "cancel" | "replace" | "create_new";
      readonly project: ProjectModel;
      readonly diagnostics: readonly string[];
      readonly rolledBack: boolean;
    };

function applyInputOnly(project: ProjectModel, kind: SampleKind): ProjectModel {
  return kind === "CONTINUOUS"
    ? applyContinuousGirderSampleInput(project)
    : applySimpleSingleSpanSampleInput(project);
}

function applyAndGenerate(project: ProjectModel, kind: SampleKind) {
  return kind === "CONTINUOUS"
    ? applyAndGenerateContinuousGirderSample(project)
    : applyAndGenerateSimpleSingleSpanSample(project);
}

/**
 * Atomic replace: snapshot → apply → generate → commit, or rollback on failure.
 * Generation failure restores the pre-transaction project fully.
 */
export function executeSampleReapplyReplace(
  project: ProjectModel,
  sampleKind: SampleKind = "SIMPLE_SINGLE",
  options?: { readonly forceGenerateFailure?: boolean },
): SampleReapplyTransactionResult {
  const snapshot = structuredClone(project);
  try {
    if (options?.forceGenerateFailure) {
      // Controlled fixture path for E2E/unit rollback tests.
      applyInputOnly(project, sampleKind);
      throw new Error("controlled-generation-failure");
    }
    const result = applyAndGenerate(project, sampleKind);
    if (!result.ok) {
      return {
        ok: false,
        choice: "replace",
        project: snapshot,
        diagnostics: result.diagnostics,
        rolledBack: true,
      };
    }
    return { ok: true, choice: "replace", project: result.project };
  } catch (error) {
    return {
      ok: false,
      choice: "replace",
      project: snapshot,
      diagnostics: [error instanceof Error ? error.message : String(error)],
      rolledBack: true,
    };
  }
}

/**
 * Create a new project with sample applied+generated; preserve current via workspace.
 */
export function executeSampleReapplyCreateNew(
  project: ProjectModel,
  sampleKind: SampleKind = "SIMPLE_SINGLE",
): SampleReapplyTransactionResult {
  const snapshot = structuredClone(project);
  try {
    const entries = saveApolloWorkspaceEntry(snapshot);
    const preserved = entries[0];
    const fresh = createDefaultProject();
    const withId: ProjectModel = {
      ...fresh,
      project: {
        ...fresh.project,
        id: `apollo-sample-${crypto.randomUUID()}`,
        name: sampleNameFor(sampleKind),
        description: `Sample reapply create-new (${SAMPLE_PRESET_CATALOG.pavementThicknessM}m pavement catalog placeholder — UNVERIFIED)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
    const result = applyAndGenerate(withId, sampleKind);
    if (!result.ok) {
      return {
        ok: false,
        choice: "create_new",
        project: snapshot,
        diagnostics: result.diagnostics,
        rolledBack: true,
      };
    }
    return {
      ok: true,
      choice: "create_new",
      project: result.project,
      preservedWorkspaceId: preserved?.workspaceId,
    };
  } catch (error) {
    return {
      ok: false,
      choice: "create_new",
      project: snapshot,
      diagnostics: [error instanceof Error ? error.message : String(error)],
      rolledBack: true,
    };
  }
}

/** Direct apply when detection says confirmation is not required (empty project). */
export function executeSampleReapplyDirect(
  project: ProjectModel,
  sampleKind: SampleKind = "SIMPLE_SINGLE",
): SampleReapplyTransactionResult {
  const snapshot = structuredClone(project);
  const result = applyAndGenerate(project, sampleKind);
  if (!result.ok) {
    return {
      ok: false,
      choice: "replace",
      project: snapshot,
      diagnostics: result.diagnostics,
      rolledBack: true,
    };
  }
  return { ok: true, choice: "replace", project: result.project };
}
