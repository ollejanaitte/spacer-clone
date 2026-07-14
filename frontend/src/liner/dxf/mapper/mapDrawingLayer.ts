import type { DrawingLayer } from "../../drawing/model/document";
import {
  DEFAULT_DXF_LAYER_0,
  DEFAULT_DXF_LINETYPE_CONTINUOUS,
  DEFAULT_DXF_TEXT_STYLE,
} from "../model/defaults";
import type { DxfLayer, DxfLinetype, DxfTables, DxfTextStyle } from "../model/types";

const DEFAULT_LAYER_COLOR = 7;

export function mapDrawingLayerToDxfLayer(layer: DrawingLayer): DxfLayer {
  const style = layer.style;
  return {
    name: layer.name,
    color: parseColorIndex(style?.color) ?? DEFAULT_LAYER_COLOR,
    lineType: style?.lineType ?? DEFAULT_DXF_LAYER_0.lineType,
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
  const names = new Set<string>([DEFAULT_DXF_LINETYPE_CONTINUOUS.name]);
  for (const layer of layers) {
    if (layer.lineType) {
      names.add(layer.lineType);
    }
  }

  return [...names]
    .sort((left, right) => left.localeCompare(right))
    .map((name) => {
      if (name === DEFAULT_DXF_LINETYPE_CONTINUOUS.name) {
        return { ...DEFAULT_DXF_LINETYPE_CONTINUOUS };
      }
      return {
        name,
        description: name,
        patternLength: 0,
        elements: [],
      };
    });
}

function parseColorIndex(color: string | undefined): number | undefined {
  if (!color) {
    return undefined;
  }
  const parsed = Number.parseInt(color, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function sortByName<T extends { name: string }>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => left.name.localeCompare(right.name));
}

export type { DxfLayer, DxfLinetype, DxfTextStyle };
