import type { CanonicalLinerIntermediateResult } from "../../core/types";
import type { DrawingDiagnostic } from "../model/diagnostics";
import type { DrawingSheet, DrawingViewport, DrawingViewportKind } from "../model/document";
import type { PaperDefinition } from "../model/paper";
import type { StationAxis } from "../model/stationAxis";

export type FormalPlanType = "road_shape" | "centerline_only";

export type DrawingSettings = {
  version: string;
  planPaper: PaperDefinition;
  profilePaper: PaperDefinition;
  crossSectionPaper: PaperDefinition;
  bandPaper: PaperDefinition;
  stationAxes: StationAxis[];
  selectedCrossSectionStation?: number;
  /** Type A = road_shape (default), Type B = centerline_only */
  planType?: FormalPlanType;
};

export type BuildDrawingContext = {
  result: CanonicalLinerIntermediateResult;
  settings: DrawingSettings;
};

export type DrawingBuilderOutput = {
  sheet: DrawingSheet;
  diagnostics: DrawingDiagnostic[];
};

export interface DrawingBuilder {
  readonly kind: DrawingViewportKind;
  build(context: BuildDrawingContext): DrawingBuilderOutput;
}

export type DrawingBuilderMap = {
  plan: DrawingBuilder;
  profile: DrawingBuilder;
  cross_section: DrawingBuilder;
  band: DrawingBuilder;
};

export function getPaperForKind(
  settings: DrawingSettings,
  kind: DrawingViewportKind,
): PaperDefinition {
  if (kind === "plan") {
    return settings.planPaper;
  }
  if (kind === "profile") {
    return settings.profilePaper;
  }
  if (kind === "cross_section") {
    return settings.crossSectionPaper;
  }
  return settings.bandPaper;
}
