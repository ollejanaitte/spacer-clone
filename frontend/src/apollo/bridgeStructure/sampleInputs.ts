/**
 * Sample inputs for verification/visual-slice purposes (Step 5 complete preset).
 * These are NOT design-adopted values: UNVERIFIED_DEVELOPMENT_ONLY only.
 * NUMERIC_DESIGN_AUTHORIZATION remains NOT_GRANTED.
 */

import type { ProjectModel } from "../../types";
import { BridgeSystem, buildContinuousLayout, sumSpanLengths } from "../contracts";
import {
  APPURTENANCE_SLOTS,
  type ApolloAppurtenanceConfigurationDraft,
  type ApolloAppurtenanceItemDraft,
} from "./appurtenanceTypes";
import {
  createDefaultAppurtenanceConfiguration,
  stableAppurtenanceId,
  withAppurtenanceSlotItem,
  withAppurtenanceSlotPresence,
} from "./appurtenanceModel";
import {
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
  withBridgeStructureInputDraft,
} from "./generateBsdd";
import { applyHaunchToAllGirders } from "./haunchModel";
import { PRESENCE_STATUS } from "./presence";
import { createDefaultRoadMarkingsConfiguration } from "./pavementModel";
import { LATERAL_ANGLE_CATALOG_ID } from "./lateralAngleTypes";
import { createEmptyBridgeStructureInputDraft } from "./validation";
import type { ApolloBridgeStructureInputDraft } from "./types";

export const SIMPLE_SINGLE_SPAN_SAMPLE_DISCLAIMER =
  "動作確認用サンプル値です。設計基準に基づく採用値・照査済み断面ではありません。正式設計には使用しないでください。SAMPLE_PRESET / UNVERIFIED_DEVELOPMENT_ONLY / NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED / DESIGN_OR_CONSTRUCTION_USE: PROHIBITED";

export const CONTINUOUS_GIRDER_SAMPLE_SPANS = [30, 35, 30] as const;

export const CONTINUOUS_GIRDER_SAMPLE_DISCLAIMER =
  "連続桁の動作確認用サンプル値です。設計基準に基づく採用値・照査済み断面ではありません。正式設計には使用しないでください。SAMPLE_PRESET / UNVERIFIED_DEVELOPMENT_ONLY";

export const CONTINUOUS_ANALYSIS_DISCLAIMER =
  "連続桁の解析・照査は未対応です。構造モデル生成と概算数量の確認のみ可能です。";

/** Catalog CAT-S5-* UNVERIFIED development placeholders (not formal standards). */
export const SAMPLE_PRESET_CATALOG = {
  curbWidthM: 0.5,
  curbHeightM: 0.25,
  wallRailingWidthM: 0.25,
  wallRailingHeightM: 1.1,
  haunchWidthM: 0.4,
  haunchHeightM: 0.15,
  appUnitWeightKNPerM3: 24.5,
  pavementThicknessM: 0.08,
  pavementUnitWeightKNPerM3: 22.5,
  lateralAngleLegAM: 0.075,
  lateralAngleLegBM: 0.075,
  lateralAngleThicknessM: 0.009,
} as const;

const BASIC_SIMPLE_SINGLE_FIELDS = {
  spanLength: 30.0,
  bridgeLength: 30.0,
  width: 10.5,
  girderCount: 4,
  girderSpacing: 3.0,
  girderDepth: 2.0,
  topFlangeWidth: 0.45,
  topFlangeThickness: 0.025,
  bottomFlangeWidth: 0.55,
  bottomFlangeThickness: 0.03,
  webThickness: 0.012,
  deckThickness: 0.22,
  crossBeamSpacing: 5.0,
  stiffenerSpacing: 2.5,
  swayBracingInterval: 1,
  steelUnitWeight: 77.0,
  rcUnitWeight: 24.5,
  lateralBracingEnabled: true,
  upperLateralBracingEnabled: true,
  bridgeSystem: "SIMPLE_SINGLE" as const,
  spans: [] as const,
  supports: [] as const,
};

function curbOffsetM(deckWidthM: number, curbWidthM: number, side: "LEFT" | "RIGHT"): number {
  const magnitude = deckWidthM / 2 - curbWidthM / 2;
  return side === "LEFT" ? -magnitude : magnitude;
}

function railingOffsetM(deckWidthM: number, railingWidthM: number, side: "LEFT" | "RIGHT"): number {
  const magnitude = deckWidthM / 2 - railingWidthM / 2;
  return side === "LEFT" ? -magnitude : magnitude;
}

function buildCompleteAppurtenanceConfiguration(
  projectScopeId: string,
  bridgeLengthM: number,
  deckWidthM: number,
): ApolloAppurtenanceConfigurationDraft {
  let configuration = createDefaultAppurtenanceConfiguration();
  const providedSlots = [
    "LEFT_CURB",
    "RIGHT_CURB",
    "LEFT_WALL_RAILING",
    "RIGHT_WALL_RAILING",
  ] as const;
  const noneSlots = ["MEDIAN", "OPTIONAL_BARRIER"] as const;

  for (const slot of noneSlots) {
    configuration = withAppurtenanceSlotPresence(
      configuration,
      slot,
      PRESENCE_STATUS.EXPLICIT_NONE,
      projectScopeId,
    );
  }

  for (const slot of providedSlots) {
    const isCurb = slot === "LEFT_CURB" || slot === "RIGHT_CURB";
    const side = slot.startsWith("LEFT") ? "LEFT" : "RIGHT";
    const width = isCurb ? SAMPLE_PRESET_CATALOG.curbWidthM : SAMPLE_PRESET_CATALOG.wallRailingWidthM;
    const height = isCurb
      ? SAMPLE_PRESET_CATALOG.curbHeightM
      : SAMPLE_PRESET_CATALOG.wallRailingHeightM;
    const transverseOffset = isCurb
      ? curbOffsetM(deckWidthM, width, side)
      : railingOffsetM(deckWidthM, width, side);
    const item: ApolloAppurtenanceItemDraft = {
      appurtenanceId: stableAppurtenanceId(projectScopeId, slot),
      startStation: 0,
      endStation: bridgeLengthM,
      transverseOffset,
      crossSectionShape: "RECT",
      width,
      height,
      materialRef: null,
      unitWeight: SAMPLE_PRESET_CATALOG.appUnitWeightKNPerM3,
    };
    configuration = withAppurtenanceSlotPresence(
      configuration,
      slot,
      PRESENCE_STATUS.PROVIDED,
      projectScopeId,
    );
    configuration = withAppurtenanceSlotItem(configuration, slot, item);
  }

  // Ensure every slot was visited (defaults remain NOT_PROVIDED only if missed).
  for (const slot of APPURTENANCE_SLOTS) {
    const entry = configuration.slots.find((s) => s.slot === slot);
    if (!entry) continue;
  }

  return configuration;
}

function buildCompleteSampleDraft(
  projectScopeId: string,
  base: ApolloBridgeStructureInputDraft,
): ApolloBridgeStructureInputDraft {
  const bridgeLength = base.bridgeLength ?? BASIC_SIMPLE_SINGLE_FIELDS.bridgeLength;
  const width = base.width ?? BASIC_SIMPLE_SINGLE_FIELDS.width;
  const girderCount = base.girderCount ?? BASIC_SIMPLE_SINGLE_FIELDS.girderCount;
  return {
    ...base,
    appurtenanceConfiguration: buildCompleteAppurtenanceConfiguration(
      projectScopeId,
      bridgeLength,
      width,
    ),
    haunchConfiguration: applyHaunchToAllGirders(girderCount, projectScopeId, {
      startStation: 0,
      endStation: bridgeLength,
      shapeType: "RECT",
      topWidth: SAMPLE_PRESET_CATALOG.haunchWidthM,
      bottomWidth: SAMPLE_PRESET_CATALOG.haunchWidthM,
      height: SAMPLE_PRESET_CATALOG.haunchHeightM,
      materialRef: null,
    }),
    pavementConfiguration: {
      presence: PRESENCE_STATUS.PROVIDED,
      item: {
        thickness: SAMPLE_PRESET_CATALOG.pavementThicknessM,
        unitWeight: SAMPLE_PRESET_CATALOG.pavementUnitWeightKNPerM3,
        startStation: 0,
        endStation: bridgeLength,
      },
    },
    roadMarkingsConfiguration: {
      ...createDefaultRoadMarkingsConfiguration(),
      enabled: true,
    },
    lateralAngleSection: {
      enabled: true,
      legA: SAMPLE_PRESET_CATALOG.lateralAngleLegAM,
      legB: SAMPLE_PRESET_CATALOG.lateralAngleLegBM,
      thickness: SAMPLE_PRESET_CATALOG.lateralAngleThicknessM,
      catalogId: LATERAL_ANGLE_CATALOG_ID,
    },
    generatedAt: null,
  };
}

/**
 * Basic numeric fields for the simple single-span sample (before project-scoped IDs).
 * Appurtenance/haunch are filled at apply time via buildCompleteSampleDraft.
 */
export const SIMPLE_SINGLE_SPAN_SAMPLE_INPUT: ApolloBridgeStructureInputDraft = {
  ...createEmptyBridgeStructureInputDraft(),
  ...BASIC_SIMPLE_SINGLE_FIELDS,
  spans: [],
  supports: [],
  generatedAt: null,
};

/**
 * Fill the persisted bridge structure input with the **complete** sample preset
 * (basics + appurtenances + haunch + laterals). Sets generatedAt to null (STALE)
 * until generate. Does NOT auto-generate (DEC-S5-0001 secondary path).
 */
export function applySimpleSingleSpanSampleInput(project: ProjectModel): ProjectModel {
  return withBridgeStructureInputDraft(project, () =>
    buildCompleteSampleDraft(project.project.id, {
      ...SIMPLE_SINGLE_SPAN_SAMPLE_INPUT,
      generatedAt: null,
    }),
  );
}

const CONTINUOUS_GIRDER_SAMPLE_INPUT: ApolloBridgeStructureInputDraft = (() => {
  const layout = buildContinuousLayout(CONTINUOUS_GIRDER_SAMPLE_SPANS);
  return {
    ...SIMPLE_SINGLE_SPAN_SAMPLE_INPUT,
    bridgeSystem: BridgeSystem.CONTINUOUS,
    spanLength: null,
    bridgeLength: sumSpanLengths(layout.spans),
    spans: layout.spans,
    supports: layout.supports,
    generatedAt: null,
  };
})();

/**
 * Complete continuous girder sample [30, 35, 30]. Inputs only; does not auto-generate.
 */
export function applyContinuousGirderSampleInput(project: ProjectModel): ProjectModel {
  return withBridgeStructureInputDraft(project, () =>
    buildCompleteSampleDraft(project.project.id, {
      ...CONTINUOUS_GIRDER_SAMPLE_INPUT,
      generatedAt: null,
    }),
  );
}

export type SampleApplyGenerateResult =
  | { readonly ok: true; readonly project: ProjectModel }
  | { readonly ok: false; readonly project: ProjectModel; readonly diagnostics: readonly string[] };

/**
 * DEC-S5-0001 primary path: apply complete preset then run generation pipeline.
 */
export function applyAndGenerateSimpleSingleSpanSample(
  project: ProjectModel,
): SampleApplyGenerateResult {
  const applied = applySimpleSingleSpanSampleInput(project);
  const input = getBridgeStructureInputDraft(applied);
  const generated = generateBridgeStructureFromInput(applied, input);
  if (!generated.ok) {
    return { ok: false, project: applied, diagnostics: generated.diagnostics };
  }
  return { ok: true, project: generated.project };
}

export function applyAndGenerateContinuousGirderSample(
  project: ProjectModel,
): SampleApplyGenerateResult {
  const applied = applyContinuousGirderSampleInput(project);
  const input = getBridgeStructureInputDraft(applied);
  const generated = generateBridgeStructureFromInput(applied, input);
  if (!generated.ok) {
    return { ok: false, project: applied, diagnostics: generated.diagnostics };
  }
  return { ok: true, project: generated.project };
}

/**
 * Reset all bridge structure input fields to empty (null) and mark STALE.
 */
export function clearBridgeStructureInput(project: ProjectModel): ProjectModel {
  return withBridgeStructureInputDraft(project, () => ({
    ...createEmptyBridgeStructureInputDraft(),
    generatedAt: null,
  }));
}

/**
 * Derive the structural model length from the span length for a single-span
 * structure. Input-assist only; never silently overwrites existing bridgeLength.
 */
export function deriveSingleSpanModelLength(
  draft: ApolloBridgeStructureInputDraft,
): number | null {
  if (draft.bridgeLength !== null || draft.spanLength === null) {
    return null;
  }
  return draft.spanLength;
}
