import type { DrawingStyle } from "../../drawing/model/primitives";

export type CadLayerPresetId =
  | "PLAN_CENTER"
  | "PLAN_OFFSET"
  | "PLAN_STATION"
  | "PLAN_TEXT"
  | "PLAN_BAND"
  | "PROFILE_GRID"
  | "PROFILE_DESIGN"
  | "PROFILE_GROUND"
  | "PROFILE_TEXT"
  | "PROFILE_BAND"
  | "CROSS_SHAPE"
  | "CROSS_CENTER"
  | "CROSS_DIM"
  | "CROSS_TEXT"
  | "SHEET_FRAME"
  | "SHEET_TEXT";

export type CadLinetypeName = "CONTINUOUS" | "CENTER" | "DASHED" | "HIDDEN";

export type CadLayerPreset = {
  id: CadLayerPresetId;
  name: CadLayerPresetId;
  aciColor: number;
  lineType: CadLinetypeName;
  /** DXF lineweight in 100ths of mm (group code 370). */
  lineweight: number;
  strokeWidthMm: number;
};

export const CAD_LAYER_PRESETS: Record<CadLayerPresetId, CadLayerPreset> = {
  PLAN_CENTER: {
    id: "PLAN_CENTER",
    name: "PLAN_CENTER",
    aciColor: 1,
    lineType: "CONTINUOUS",
    lineweight: 50,
    strokeWidthMm: 0.5,
  },
  PLAN_OFFSET: {
    id: "PLAN_OFFSET",
    name: "PLAN_OFFSET",
    aciColor: 3,
    lineType: "CONTINUOUS",
    lineweight: 35,
    strokeWidthMm: 0.35,
  },
  PLAN_STATION: {
    id: "PLAN_STATION",
    name: "PLAN_STATION",
    aciColor: 5,
    lineType: "CENTER",
    lineweight: 25,
    strokeWidthMm: 0.25,
  },
  PLAN_TEXT: {
    id: "PLAN_TEXT",
    name: "PLAN_TEXT",
    aciColor: 7,
    lineType: "CONTINUOUS",
    lineweight: 25,
    strokeWidthMm: 0.25,
  },
  PLAN_BAND: {
    id: "PLAN_BAND",
    name: "PLAN_BAND",
    aciColor: 7,
    lineType: "CONTINUOUS",
    lineweight: 25,
    strokeWidthMm: 0.25,
  },
  PROFILE_GRID: {
    id: "PROFILE_GRID",
    name: "PROFILE_GRID",
    aciColor: 8,
    lineType: "HIDDEN",
    lineweight: 18,
    strokeWidthMm: 0.18,
  },
  PROFILE_DESIGN: {
    id: "PROFILE_DESIGN",
    name: "PROFILE_DESIGN",
    aciColor: 1,
    lineType: "CONTINUOUS",
    lineweight: 50,
    strokeWidthMm: 0.5,
  },
  PROFILE_GROUND: {
    id: "PROFILE_GROUND",
    name: "PROFILE_GROUND",
    aciColor: 3,
    lineType: "DASHED",
    lineweight: 35,
    strokeWidthMm: 0.35,
  },
  PROFILE_TEXT: {
    id: "PROFILE_TEXT",
    name: "PROFILE_TEXT",
    aciColor: 7,
    lineType: "CONTINUOUS",
    lineweight: 25,
    strokeWidthMm: 0.25,
  },
  PROFILE_BAND: {
    id: "PROFILE_BAND",
    name: "PROFILE_BAND",
    aciColor: 7,
    lineType: "CONTINUOUS",
    lineweight: 25,
    strokeWidthMm: 0.25,
  },
  CROSS_SHAPE: {
    id: "CROSS_SHAPE",
    name: "CROSS_SHAPE",
    aciColor: 1,
    lineType: "CONTINUOUS",
    lineweight: 50,
    strokeWidthMm: 0.5,
  },
  CROSS_CENTER: {
    id: "CROSS_CENTER",
    name: "CROSS_CENTER",
    aciColor: 5,
    lineType: "CENTER",
    lineweight: 25,
    strokeWidthMm: 0.25,
  },
  CROSS_DIM: {
    id: "CROSS_DIM",
    name: "CROSS_DIM",
    aciColor: 6,
    lineType: "CONTINUOUS",
    lineweight: 18,
    strokeWidthMm: 0.18,
  },
  CROSS_TEXT: {
    id: "CROSS_TEXT",
    name: "CROSS_TEXT",
    aciColor: 7,
    lineType: "CONTINUOUS",
    lineweight: 25,
    strokeWidthMm: 0.25,
  },
  SHEET_FRAME: {
    id: "SHEET_FRAME",
    name: "SHEET_FRAME",
    aciColor: 7,
    lineType: "CONTINUOUS",
    lineweight: 35,
    strokeWidthMm: 0.35,
  },
  SHEET_TEXT: {
    id: "SHEET_TEXT",
    name: "SHEET_TEXT",
    aciColor: 7,
    lineType: "CONTINUOUS",
    lineweight: 25,
    strokeWidthMm: 0.25,
  },
};

/** Map legacy / builder layer ids or names to CAD preset ids. */
export const DRAWING_LAYER_TO_CAD_PRESET: Record<string, CadLayerPresetId> = {
  plan: "PLAN_CENTER",
  "plan-layer": "PLAN_CENTER",
  "plan-annotation": "PLAN_TEXT",
  "plan-annotation-layer": "PLAN_TEXT",
  "plan-band": "PLAN_BAND",
  "plan-band-layer": "PLAN_BAND",
  profile: "PROFILE_DESIGN",
  "profile-layer": "PROFILE_DESIGN",
  "profile-annotation": "PROFILE_TEXT",
  "profile-annotation-layer": "PROFILE_TEXT",
  band: "PROFILE_BAND",
  "band-layer": "PROFILE_BAND",
  "cross-section": "CROSS_SHAPE",
  "cross-section-layer": "CROSS_SHAPE",
  "cross-section-centerline": "CROSS_CENTER",
  "cross-section-centerline-layer": "CROSS_CENTER",
  PLAN_CENTER: "PLAN_CENTER",
  PLAN_OFFSET: "PLAN_OFFSET",
  PLAN_STATION: "PLAN_STATION",
  PLAN_TEXT: "PLAN_TEXT",
  PLAN_BAND: "PLAN_BAND",
  PROFILE_GRID: "PROFILE_GRID",
  PROFILE_DESIGN: "PROFILE_DESIGN",
  PROFILE_GROUND: "PROFILE_GROUND",
  PROFILE_TEXT: "PROFILE_TEXT",
  PROFILE_BAND: "PROFILE_BAND",
  CROSS_SHAPE: "CROSS_SHAPE",
  CROSS_CENTER: "CROSS_CENTER",
  CROSS_DIM: "CROSS_DIM",
  CROSS_TEXT: "CROSS_TEXT",
  SHEET_FRAME: "SHEET_FRAME",
  SHEET_TEXT: "SHEET_TEXT",
};

export function resolveCadLayerPreset(
  layerId: string | undefined,
  layerName: string | undefined,
): CadLayerPreset | undefined {
  const candidates = [layerId, layerName].filter((value): value is string => Boolean(value));
  for (const candidate of candidates) {
    const presetId = DRAWING_LAYER_TO_CAD_PRESET[candidate];
    if (presetId) {
      return CAD_LAYER_PRESETS[presetId];
    }
  }
  return undefined;
}

export function drawingStyleFromCadPreset(preset: CadLayerPreset): DrawingStyle {
  return {
    id: preset.id,
    color: String(preset.aciColor),
    lineType: preset.lineType,
    strokeWidthMm: preset.strokeWidthMm,
  };
}

export const CAD_LINETYPE_DEFINITIONS: Record<
  CadLinetypeName,
  { name: CadLinetypeName; description: string; patternLength: number; elements: readonly number[] }
> = {
  CONTINUOUS: {
    name: "CONTINUOUS",
    description: "Solid line",
    patternLength: 0,
    elements: [],
  },
  CENTER: {
    name: "CENTER",
    description: "Center ____ _ ____ _",
    patternLength: 2.0,
    elements: [1.25, -0.25, 0.25, -0.25],
  },
  DASHED: {
    name: "DASHED",
    description: "Dashed __ __",
    patternLength: 0.75,
    elements: [0.5, -0.25],
  },
  HIDDEN: {
    name: "HIDDEN",
    description: "Hidden __ __",
    patternLength: 0.375,
    elements: [0.25, -0.125],
  },
};

export function normalizeDrawingLineType(lineType: string | undefined): CadLinetypeName {
  if (!lineType) {
    return "CONTINUOUS";
  }
  const upper = lineType.toUpperCase();
  if (upper === "CENTER") {
    return "CENTER";
  }
  if (upper === "DASHED" || upper === "DASH") {
    return "DASHED";
  }
  if (upper === "HIDDEN" || upper === "DOT") {
    return "HIDDEN";
  }
  if (upper === "CONTINUOUS") {
    return "CONTINUOUS";
  }
  return "CONTINUOUS";
}
