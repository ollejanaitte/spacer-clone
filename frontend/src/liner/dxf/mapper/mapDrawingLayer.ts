import type { DrawingLayer } from "../../drawing/model/document";
import {
  DEFAULT_DXF_LAYER_0,
  DEFAULT_DXF_LINETYPE_CONTINUOUS,
  DEFAULT_DXF_TEXT_STYLE,
} from "../model/defaults";
import type { DxfLayer, DxfLinetype, DxfTables, DxfTextStyle } from "../model/types";
import {
  CAD_LINETYPE_DEFINITIONS,
  normalizeDrawingLineType,
  resolveCadLayerPreset,
  type CadLinetypeName,
} from "../presets/cadLayerPresets";
import { sanitizeDxfLayerName } from "../presets/sanitizeLayerName";

const DEFAULT_LAYER_COLOR = 7;

export function mapDrawingLayerToDxfLayer(layer: DrawingLayer): DxfLayer {
  const preset = resolveCadLayerPreset(layer.id, layer.name);
  const style = layer.style;
  const lineType = normalizeDrawingLineType(style?.lineType ?? preset?.lineType);
  const color = parseColorIndex(style?.color) ?? preset?.aciColor ?? DEFAULT_LAYER_COLOR;
  const name = sanitizeDxfLayerName(preset?.name ?? layer.name, "LAYER");

  return {
    name,
    color,
    lineType,
    lineweight: preset?.lineweight ?? lineweightFromStrokeMm(style?.strokeWidthMm),
    frozen: false,
    visible: layer.visible,
  };
}

export function buildDxfTablesFromDrawingLayers(layers: readonly DrawingLayer[]): DxfTables {
  const dxfLayers = layers.map((layer) => mapDrawingLayerToDxfLayer(layer));
  const layerNames = new Set(dxfLayers.map((layer) => layer.name));
  if (!layerNames.has(DEFAULT_DXF_LAYER_0.name)) {
    dxfLayers.push({ ...DEFAULT_DXF_LAYER_0 });
  }

  const lineTypes = collectLineTypes(dxfLayers);

  return {
    layers: sortByName(dxfLayers),
    linetypes: sortByName(lineTypes),
    textStyles: [{ ...DEFAULT_DXF_TEXT_STYLE }],
  };
}

function collectLineTypes(layers: readonly DxfLayer[]): DxfLinetype[] {
  const names = new Set<CadLinetypeName>([DEFAULT_DXF_LINETYPE_CONTINUOUS.name as CadLinetypeName]);
  for (const layer of layers) {
    names.add(normalizeDrawingLineType(layer.lineType));
  }

  return [...names]
    .sort((left, right) => left.localeCompare(right))
    .map((name) => {
      const definition = CAD_LINETYPE_DEFINITIONS[name];
      if (definition) {
        return { ...definition };
      }
      return { ...DEFAULT_DXF_LINETYPE_CONTINUOUS };
    });
}

function parseColorIndex(color: string | undefined): number | undefined {
  if (!color) {
    return undefined;
  }
  if (color.startsWith("#")) {
    return undefined;
  }
  const parsed = Number.parseInt(color, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function lineweightFromStrokeMm(strokeWidthMm: number | undefined): number | undefined {
  if (strokeWidthMm === undefined || !Number.isFinite(strokeWidthMm)) {
    return undefined;
  }
  return Math.max(0, Math.round(strokeWidthMm * 100));
}

function sortByName<T extends { name: string }>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => left.name.localeCompare(right.name));
}

export type { DxfLayer, DxfLinetype, DxfTextStyle };
