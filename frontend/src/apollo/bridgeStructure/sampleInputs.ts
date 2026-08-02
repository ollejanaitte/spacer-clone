/**
 * Simple single-span sample input for verification/visual-slice purposes.
 * These are NOT design-adopted values: they are only for manual verification
 * and automated test fixtures. Unit weights stay USER_PROVIDED_UNVERIFIED and
 * must never be adopted under the default NOT_GRANTED authority.
 */

import type { ProjectModel } from "../../types";
import { withBridgeStructureInputDraft } from "./generateBsdd";
import { createEmptyBridgeStructureInputDraft } from "./validation";
import type { ApolloBridgeStructureInputDraft } from "./types";

export const SIMPLE_SINGLE_SPAN_SAMPLE_DISCLAIMER =
  "動作確認用サンプル値です。設計基準に基づく採用値・照査済み断面ではありません。正式設計には使用しないでください。";

export const SIMPLE_SINGLE_SPAN_SAMPLE_INPUT: ApolloBridgeStructureInputDraft = {
  schemaVersion: "1.0.0",
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
  lateralBracingEnabled: false,
  bridgeSystem: "SIMPLE_SINGLE",
  spans: [],
  supports: [],
  generatedAt: null,
};

/**
 * Fill the persisted bridge structure input with the sample values.
 * Sets generatedAt to null so the structure is STALE until the user
 * explicitly presses "構造を生成". Does NOT auto-generate.
 */
export function applySimpleSingleSpanSampleInput(project: ProjectModel): ProjectModel {
  return withBridgeStructureInputDraft(project, () => ({
    ...SIMPLE_SINGLE_SPAN_SAMPLE_INPUT,
    generatedAt: null,
  }));
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
 * structure. This is an input-assist: it only fills bridgeLength when it is
 * currently unset, so existing (possibly legacy) bridgeLength values are never
 * silently overwritten. Returns null when no derivation applies.
 */
export function deriveSingleSpanModelLength(
  draft: ApolloBridgeStructureInputDraft,
): number | null {
  if (draft.bridgeLength !== null || draft.spanLength === null) {
    return null;
  }
  return draft.spanLength;
}
