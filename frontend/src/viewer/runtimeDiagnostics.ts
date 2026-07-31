import type { ApolloVisualizationModel } from "../apollo/visualization";
import type {
  ApolloVisualizationCounts,
  CameraPreset,
  ViewerFallbackReason,
  ViewerGpuMode,
  ViewerMode,
  ViewerVisibility,
  ViewerWebGlDiagnostics,
} from "./types";

export const UNAVAILABLE_LABEL = "Unavailable";

type MutableApolloVisualizationCounts = {
  -readonly [K in keyof ApolloVisualizationCounts]: ApolloVisualizationCounts[K];
};

export function createUnavailableWebGlDiagnostics(): ViewerWebGlDiagnostics {
  return {
    available: false,
    renderer: UNAVAILABLE_LABEL,
    vendor: UNAVAILABLE_LABEL,
    version: UNAVAILABLE_LABEL,
    shadingLanguageVersion: UNAVAILABLE_LABEL,
    unmaskedRenderer: UNAVAILABLE_LABEL,
    unmaskedVendor: UNAVAILABLE_LABEL,
  };
}

export function deriveApolloVisualizationCounts(
  model: ApolloVisualizationModel | null | undefined,
): ApolloVisualizationCounts | null {
  if (!model) return null;

  const counts: MutableApolloVisualizationCounts = {
    lineElementCount: model.elements.length,
    solidCount: model.solidGeometryParameters.length,
    girderCount: 0,
    crossBeamCount: 0,
    bracingCount: 0,
    deckCount: 0,
    bearingCount: 0,
    markerCount: 0,
    warningCount: model.warnings.length,
  };

  for (const solid of model.solidGeometryParameters) {
    switch (solid.kind) {
      case "girder":
        counts.girderCount += 1;
        break;
      case "cross_beam":
        counts.crossBeamCount += 1;
        break;
      case "bracing":
        counts.bracingCount += 1;
        break;
      case "deck":
        counts.deckCount += 1;
        break;
      case "bearing":
        counts.bearingCount += 1;
        break;
      case "pier_marker":
      case "abutment_marker":
        counts.markerCount += 1;
        break;
    }
  }

  return { ...counts };
}

export function classifyFallbackReason(mode: ViewerMode, fallbackReason: ViewerFallbackReason): ViewerFallbackReason {
  if (mode === "fallback2d" && fallbackReason === "none") {
    return "webgl-init-failed";
  }
  if (mode === "line-only" && fallbackReason === "none") {
    return "line-only-compatibility";
  }
  return fallbackReason;
}

export function describeViewerMode(mode: ViewerMode): string {
  switch (mode) {
    case "three":
      return "WebGL 3D";
    case "line-only":
      return "line-only compatibility";
    case "fallback2d":
      return "2D fallback";
  }
}

export function describeFallbackReason(reason: ViewerFallbackReason): string {
  switch (reason) {
    case "webgl-init-failed":
      return "WebGL renderer initialization failed";
    case "renderer-error":
      return "Renderer error while drawing the 3D scene";
    case "line-only-compatibility":
      return "3D solid rendering switched to line-only compatibility mode";
    case "none":
      return "None";
  }
}

export function describeSolidVisibilityAssessment(
  counts: ApolloVisualizationCounts | null,
  visibility: ViewerVisibility,
  mode: ViewerMode,
  fallbackReason: ViewerFallbackReason,
): string {
  if (!counts) return UNAVAILABLE_LABEL;
  if (counts.solidCount === 0) return "A. solid data count = 0";
  if (visibility.apolloSolidModel === false) return "B. solid data count > 0, visibility OFF";
  if (mode === "line-only" || mode === "fallback2d") {
    return fallbackReason === "renderer-error"
      ? "E. renderer error"
      : "C. solid data count > 0, WebGL fallback";
  }
  return "Visible expected in current 3D mode";
}

export function describeCameraPreset(preset: CameraPreset | "free"): string {
  switch (preset) {
    case "xy":
      return "平面";
    case "yz":
      return "正面";
    case "xz":
      return "側面";
    case "iso":
      return "アイソメ";
    case "free":
      return "free";
  }
}

export function normalizeViewerGpuMode(value: unknown): ViewerGpuMode {
  switch (value) {
    case "normal":
    case "compat-gpu-blocklist":
    case "compat-angle-gl":
    case "legacy-desktop-gl":
    case "browser":
    case "Unavailable":
      return value;
    default:
      return "Unavailable";
  }
}
