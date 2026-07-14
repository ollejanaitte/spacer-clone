import type { DrawingDiagnostic } from "./diagnostics";
import type { Bounds2 } from "./geometry";
import type { DrawingPrimitive, DrawingStyle } from "./primitives";
import type { PaperDefinition } from "./paper";
import type { StationAxis } from "./stationAxis";
import type { AffineTransform2 } from "../transforms/affineTransform2";

export type DrawingViewportKind = "plan" | "profile" | "cross_section" | "band";

export type DrawingCoordinateSpace = "model" | "paper";

export type DrawingLayer = {
  id: string;
  name: string;
  visible: boolean;
  coordinateSpace?: DrawingCoordinateSpace;
  style?: DrawingStyle;
  primitives: DrawingPrimitive[];
};

export type DrawingViewport = {
  id: string;
  kind: DrawingViewportKind;
  modelBounds: Bounds2;
  paperBounds: Bounds2;
  transform: AffineTransform2;
  layers: DrawingLayer[];
  stationAxisId?: string;
};

export type DrawingSheet = {
  id: string;
  name: string;
  paper: PaperDefinition;
  viewports: DrawingViewport[];
};

export type DrawingDocument = {
  version: string;
  sheets: DrawingSheet[];
  diagnostics: DrawingDiagnostic[];
  stationAxes: StationAxis[];
};

export function createEmptyDrawingLayer(id: string, name = id): DrawingLayer {
  return {
    id,
    name,
    visible: true,
    primitives: [],
  };
}
