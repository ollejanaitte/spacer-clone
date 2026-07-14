import type { DrawingDocument, DrawingLayer, DrawingSheet, DrawingViewport } from "../model/document";
import { hasDrawingDiagnosticsError, type DrawingDiagnostic } from "../model/diagnostics";
import { isValidBounds2 } from "../model/geometry";
import { isValidPaperDefinition } from "../model/paper";
import { isValidAffineTransform2, transformBounds2 } from "../transforms/affineTransform2";
import type { DrawingPrimitive } from "../model/primitives";
import { validateStationAxis } from "../model/stationAxis";

export type DrawingValidationResult = {
  diagnostics: DrawingDiagnostic[];
  isValid: boolean;
};

function duplicateIdDiagnostic(kind: string, id: string, source: string): DrawingDiagnostic {
  return {
    severity: "error",
    code: `DRAWING_DUPLICATE_${kind.toUpperCase()}_ID`,
    message: `${kind} id must be unique: ${id}`,
    source,
  };
}

function invalidValueDiagnostic(code: string, message: string, source: string): DrawingDiagnostic {
  return {
    severity: "error",
    code,
    message,
    source,
  };
}

function validatePrimitive(primitive: DrawingPrimitive, source: string): DrawingDiagnostic[] {
  if (primitive.kind === "line") {
    return [
      ...validatePoint(primitive.start, `${source}.start`),
      ...validatePoint(primitive.end, `${source}.end`),
    ];
  }
  if (primitive.kind === "polyline") {
    const diagnostics: DrawingDiagnostic[] = [];
    if (primitive.points.length < 2) {
      diagnostics.push(invalidValueDiagnostic("DRAWING_POLYLINE_TOO_SHORT", "Polyline must contain at least two points.", source));
    }
    for (const [index, point] of primitive.points.entries()) {
      diagnostics.push(...validatePoint(point, `${source}.points[${index}]`));
    }
    return diagnostics;
  }
  if (primitive.kind === "arc") {
    return [
      ...validatePoint(primitive.center, `${source}.center`),
      ...(primitive.radius > 0 && Number.isFinite(primitive.radius)
        ? []
        : [invalidValueDiagnostic("DRAWING_ARC_INVALID_RADIUS", "Arc radius must be a finite positive number.", source)]),
    ];
  }
  if (primitive.kind === "text") {
    return [
      ...validatePoint(primitive.position, `${source}.position`),
      ...(primitive.heightMm > 0 && Number.isFinite(primitive.heightMm)
        ? []
        : [invalidValueDiagnostic("DRAWING_TEXT_INVALID_HEIGHT", "Text height must be a finite positive number.", source)]),
    ];
  }
  return [
    invalidValueDiagnostic("DRAWING_UNSUPPORTED_PRIMITIVE", `Unsupported primitive: ${(primitive as DrawingPrimitive).kind}`, source),
  ];
}

function validatePoint(point: { x: number; y: number }, source: string): DrawingDiagnostic[] {
  if (Number.isFinite(point.x) && Number.isFinite(point.y)) {
    return [];
  }

  return [invalidValueDiagnostic("DRAWING_POINT_INVALID", "Point coordinates must be finite numbers.", source)];
}

function validateLayer(layer: DrawingLayer, source: string): DrawingDiagnostic[] {
  const diagnostics: DrawingDiagnostic[] = [];
  for (const [index, primitive] of layer.primitives.entries()) {
    diagnostics.push(...validatePrimitive(primitive, `${source}.primitives[${index}]`));
  }
  return diagnostics;
}

function validateViewport(viewport: DrawingViewport, source: string): DrawingDiagnostic[] {
  const diagnostics: DrawingDiagnostic[] = [];
  if (!isValidBounds2(viewport.modelBounds)) {
    diagnostics.push(invalidValueDiagnostic("DRAWING_INVALID_MODEL_BOUNDS", "Viewport model bounds are invalid.", source));
  }
  if (!isValidBounds2(viewport.paperBounds)) {
    diagnostics.push(invalidValueDiagnostic("DRAWING_INVALID_PAPER_BOUNDS", "Viewport paper bounds are invalid.", source));
  }
  if (!isValidAffineTransform2(viewport.transform)) {
    diagnostics.push(invalidValueDiagnostic("DRAWING_INVALID_TRANSFORM", "Viewport transform is invalid.", source));
  }

  const transformed = transformBounds2(viewport.transform, viewport.modelBounds);
  if (!viewport.modelBounds.isEmpty && !transformed.isEmpty && !isValidBounds2(transformed)) {
    diagnostics.push(invalidValueDiagnostic("DRAWING_TRANSFORMED_BOUNDS_INVALID", "Transformed viewport bounds are invalid.", source));
  }

  const ids = new Set<string>();
  for (const [index, layer] of viewport.layers.entries()) {
    if (ids.has(layer.id)) {
      diagnostics.push(duplicateIdDiagnostic("layer", layer.id, `${source}.layers[${index}]`));
    }
    ids.add(layer.id);
    diagnostics.push(...validateLayer(layer, `${source}.layers[${index}]`));
  }

  return diagnostics;
}

function validateSheet(sheet: DrawingSheet, source: string): DrawingDiagnostic[] {
  const diagnostics: DrawingDiagnostic[] = [];
  if (!isValidPaperDefinition(sheet.paper)) {
    diagnostics.push(invalidValueDiagnostic("DRAWING_INVALID_PAPER", "Paper definition is invalid.", source));
  }
  const ids = new Set<string>();
  for (const [index, viewport] of sheet.viewports.entries()) {
    if (ids.has(viewport.id)) {
      diagnostics.push(duplicateIdDiagnostic("viewport", viewport.id, `${source}.viewports[${index}]`));
    }
    ids.add(viewport.id);
    diagnostics.push(...validateViewport(viewport, `${source}.viewports[${index}]`));
  }
  return diagnostics;
}

function validateStationAxes(document: DrawingDocument): DrawingDiagnostic[] {
  const diagnostics: DrawingDiagnostic[] = [];
  const ids = new Set<string>();
  for (const [index, axis] of document.stationAxes.entries()) {
    if (ids.has(axis.id)) {
      diagnostics.push(duplicateIdDiagnostic("stationAxis", axis.id, `stationAxes[${index}]`));
    }
    ids.add(axis.id);
    diagnostics.push(...validateStationAxis(axis));
  }
  return diagnostics;
}

export function validateDrawingDocument(document: DrawingDocument): DrawingValidationResult {
  const diagnostics: DrawingDiagnostic[] = [];

  if (typeof document.version !== "string" || document.version.length === 0) {
    diagnostics.push(invalidValueDiagnostic("DRAWING_INVALID_VERSION", "Document version must be a non-empty string.", "version"));
  }

  const sheetIds = new Set<string>();
  for (const [index, sheet] of document.sheets.entries()) {
    if (sheetIds.has(sheet.id)) {
      diagnostics.push(duplicateIdDiagnostic("sheet", sheet.id, `sheets[${index}]`));
    }
    sheetIds.add(sheet.id);
    diagnostics.push(...validateSheet(sheet, `sheets[${index}]`));
  }

  diagnostics.push(...validateStationAxes(document));

  return {
    diagnostics,
    isValid: diagnostics.length === 0 || !hasDrawingDiagnosticsError(diagnostics),
  };
}
