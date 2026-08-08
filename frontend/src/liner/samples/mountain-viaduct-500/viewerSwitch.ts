/**
 * Main 3D viewer — model / layer switch (MAIN3D P05).
 *
 * Pure state logic for the main 3D viewer:
 *   - model mode: which display mode is active (frame / road / bridge /
 *     terrain / integrated).
 *   - layer visibility: which layers are toggled on.
 *
 * Switching a model maps to a canonical layer preset; toggling a layer only
 * flips visibility (never recomputes the scene).
 */
import type { SceneLayer } from "./scene";
import { DEFAULT_LAYER_STATE } from "./scene";

export type ViewerModelMode =
  | "frame"
  | "road"
  | "bridge"
  | "terrain"
  | "integrated";

export const VIEWER_MODEL_MODES: ViewerModelMode[] = [
  "frame",
  "road",
  "bridge",
  "terrain",
  "integrated",
];

export interface ViewerLayerState {
  terrain: boolean;
  road: boolean;
  superstructure: boolean;
  substructure: boolean;
  frame: boolean;
}

const ALL_OFF: ViewerLayerState = {
  terrain: false,
  road: false,
  superstructure: false,
  substructure: false,
  frame: false,
};

/** Canonical layer preset per model mode. */
export function layerStateForMode(mode: ViewerModelMode): ViewerLayerState {
  switch (mode) {
    case "frame":
      return { ...ALL_OFF, frame: true };
    case "road":
      return { ...ALL_OFF, road: true };
    case "bridge":
      return { ...ALL_OFF, superstructure: true, substructure: true };
    case "terrain":
      return { ...ALL_OFF, terrain: true };
    case "integrated":
      return { ...DEFAULT_LAYER_STATE };
  }
}

/** Toggle a single layer; returns a new layer state (immutable). */
export function toggleLayer(
  state: ViewerLayerState,
  layer: SceneLayer,
): ViewerLayerState {
  return { ...state, [layer]: !state[layer] };
}

/** Number of visible layers (for the UI badge). */
export function visibleLayerCount(state: ViewerLayerState): number {
  return Object.values(state).filter(Boolean).length;
}

/** Label for a model mode. */
export function modelModeLabel(mode: ViewerModelMode): string {
  switch (mode) {
    case "frame":
      return "フレーム";
    case "road":
      return "道路";
    case "bridge":
      return "橋梁";
    case "terrain":
      return "地形";
    case "integrated":
      return "統合モデル";
  }
}

/** Label for a layer. */
export function layerLabel(layer: SceneLayer): string {
  switch (layer) {
    case "terrain":
      return "地形";
    case "road":
      return "道路面";
    case "superstructure":
      return "上部工";
    case "substructure":
      return "下部工（橋脚・橋台）";
    case "frame":
      return "骨組み";
  }
}
