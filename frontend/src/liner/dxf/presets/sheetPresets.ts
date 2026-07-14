import { createPaperDefinition, type PaperDefinition } from "../../drawing/model/paper";
import type { CadLayerPresetId } from "./cadLayerPresets";

export type SheetPresetId = "common" | "a1-landscape" | "a3-landscape";

export type SheetPreset = {
  id: SheetPresetId;
  label: string;
  paper: PaperDefinition;
  defaultScale: {
    plan: string;
    profileHorizontal: string;
    profileVertical: string;
    crossSection: string;
  };
  textHeightMm: number;
  lineweightTier: readonly number[];
  layerPresetGroup: "formal-default";
  titleArea: {
    minXMm: number;
    minYMm: number;
    maxXMm: number;
    maxYMm: number;
  };
  defaultLayers: readonly CadLayerPresetId[];
};

const DEFAULT_LAYERS: readonly CadLayerPresetId[] = [
  "PLAN_CENTER",
  "PLAN_OFFSET",
  "PLAN_STATION",
  "PLAN_TEXT",
  "PLAN_BAND",
  "PROFILE_GRID",
  "PROFILE_DESIGN",
  "PROFILE_GROUND",
  "PROFILE_TEXT",
  "PROFILE_BAND",
  "CROSS_SHAPE",
  "CROSS_CENTER",
  "CROSS_DIM",
  "CROSS_TEXT",
  "SHEET_FRAME",
  "SHEET_TEXT",
];

function buildSheetPreset(
  id: SheetPresetId,
  label: string,
  size: PaperDefinition["size"],
  marginMm: number,
): SheetPreset {
  const paper = createPaperDefinition(size, "landscape", marginMm);
  return {
    id,
    label,
    paper,
    defaultScale: {
      plan: "1:500",
      profileHorizontal: "1:500",
      profileVertical: "1:100",
      crossSection: "1:100",
    },
    textHeightMm: 7,
    lineweightTier: [18, 25, 35, 50],
    layerPresetGroup: "formal-default",
    titleArea: {
      minXMm: paper.widthMm - 120 - marginMm,
      minYMm: marginMm,
      maxXMm: paper.widthMm - marginMm,
      maxYMm: marginMm + 40,
    },
    defaultLayers: DEFAULT_LAYERS,
  };
}

export const SHEET_PRESETS: Record<SheetPresetId, SheetPreset> = {
  common: buildSheetPreset("common", "Common A2 landscape", "A2", 10),
  "a1-landscape": buildSheetPreset("a1-landscape", "A1 landscape", "A1", 12),
  "a3-landscape": buildSheetPreset("a3-landscape", "A3 landscape", "A3", 8),
};

export function getSheetPreset(id: SheetPresetId): SheetPreset {
  return SHEET_PRESETS[id];
}

export function listSheetPresets(): SheetPreset[] {
  return [SHEET_PRESETS.common, SHEET_PRESETS["a1-landscape"], SHEET_PRESETS["a3-landscape"]];
}
