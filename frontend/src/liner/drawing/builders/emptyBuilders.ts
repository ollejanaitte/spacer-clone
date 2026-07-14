import { createEmptyBounds2 } from "../model/geometry";
import { createDrawingDiagnostic } from "../model/diagnostics";
import { createEmptyDrawingLayer, type DrawingSheet, type DrawingViewport } from "../model/document";
import { createPaperDefinition, paperContentBoundsMm } from "../model/paper";
import { identityAffineTransform2 } from "../transforms/affineTransform2";
import type {
  BuildDrawingContext,
  DrawingBuilder,
  DrawingBuilderOutput,
  DrawingSettings,
} from "./types";
import { getPaperForKind } from "./types";

function buildEmptyViewport(kind: DrawingViewport["kind"], context: BuildDrawingContext): DrawingViewport {
  const paper = getPaperForKind(context.settings, kind);
  return {
    id: `${kind}-viewport`,
    kind,
    modelBounds: createEmptyBounds2(),
    paperBounds: paperContentBoundsMm(paper),
    transform: identityAffineTransform2(),
    layers: [createEmptyDrawingLayer(`${kind}-layer`)],
    stationAxisId: context.settings.stationAxes[0]?.id,
  };
}

function buildEmptySheet(kind: DrawingViewport["kind"], context: BuildDrawingContext): DrawingSheet {
  const paper = getPaperForKind(context.settings, kind);
  return {
    id: `${kind}-sheet`,
    name: kind,
    paper,
    viewports: [buildEmptyViewport(kind, context)],
  };
}

function buildEmpty(kind: DrawingViewport["kind"]): DrawingBuilder {
  return {
    kind,
    build(context: BuildDrawingContext): DrawingBuilderOutput {
      const diagnostics = [
        createDrawingDiagnostic(
          "info",
          "DRAWING_BUILDER_EMPTY",
          `No primitives were generated for ${kind}.`,
          { source: kind },
        ),
      ];

      return {
        sheet: buildEmptySheet(kind, context),
        diagnostics,
      };
    },
  };
}

export function createEmptyPlanDrawingBuilder(): DrawingBuilder {
  return buildEmpty("plan");
}

export function createEmptyProfileDrawingBuilder(): DrawingBuilder {
  return buildEmpty("profile");
}

export function createEmptyCrossSectionDrawingBuilder(): DrawingBuilder {
  return buildEmpty("cross_section");
}

export function createEmptyBandDrawingBuilder(): DrawingBuilder {
  return buildEmpty("band");
}

export function createDefaultDrawingSettings(): DrawingSettings {
  return {
    version: "0.1.0",
    planPaper: createPaperDefinition("A1", "landscape", 10),
    profilePaper: createPaperDefinition("A1", "landscape", 10),
    crossSectionPaper: createPaperDefinition("A2", "landscape", 10),
    bandPaper: createPaperDefinition("A3", "landscape", 10),
    stationAxes: [],
    selectedCrossSectionStation: undefined,
  };
}
