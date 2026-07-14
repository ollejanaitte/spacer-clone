import { serializeDxfDocument } from "../serializer/serializeDxfDocument";
import type {
  DrawingDocument,
  DrawingLayer,
  DrawingViewport,
} from "../../drawing/model/document";
import type { Point2 } from "../../drawing/model/geometry";
import type { DrawingPrimitive } from "../../drawing/model/primitives";
import {
  isIdentityAffineTransform2,
  transformPointToModel,
} from "../../drawing/transforms/invertAffineTransform2";
import { createDxfDiagnostic, type DxfDiagnostic } from "../model/diagnostics";
import { DEFAULT_DXF_HEADER } from "../model/defaults";
import type { DxfDocument, DxfDocumentOptions, DxfEntity, DxfLayer } from "../model/types";
import { dxfMeasurementForUnits, DEFAULT_DXF_UNITS } from "../model/units";
import { sortDxfEntities } from "../validation/validateDxfDocument";
import {
  drawingStyleFromCadPreset,
  resolveCadLayerPreset,
} from "../presets/cadLayerPresets";
import { sanitizeDxfLayerName } from "../presets/sanitizeLayerName";
import { buildDxfTablesFromDrawingLayers } from "./mapDrawingLayer";
import { mapDrawingPrimitiveToDxfEntities } from "./mapDrawingPrimitive";

export type MapDrawingDocumentToDxfResult = {
  document: DxfDocument;
  diagnostics: DxfDiagnostic[];
};

export type MapDrawingDocumentToDxfOptions = DxfDocumentOptions & {
  /** When true (default), apply CAD semantic layer presets. */
  applyCadLayerPresets?: boolean;
  /** Convert paper-space primitives into model coordinates (default true). */
  convertPaperToModel?: boolean;
};

export function mapDrawingDocumentToDxf(
  drawingDocument: DrawingDocument,
  options: MapDrawingDocumentToDxfOptions = {},
): MapDrawingDocumentToDxfResult {
  const units = options.header?.units ?? DEFAULT_DXF_UNITS;
  const applyCadLayerPresets = options.applyCadLayerPresets !== false;
  const convertPaperToModel = options.convertPaperToModel !== false;
  const diagnostics: DxfDiagnostic[] = [];
  const layers = collectExportLayers(drawingDocument, {
    applyCadLayerPresets,
    convertPaperToModel,
    diagnostics,
  });
  const layerNameById = new Map(layers.map((layer) => [layer.id, layer.name]));
  const entities: DxfEntity[] = [];

  for (const layer of layers) {
    if (!layer.visible) {
      continue;
    }
    for (const primitive of layer.primitives) {
      const withLayer = {
        ...primitive,
        layerId: primitive.layerId ?? layer.id,
      };
      const mapped = mapDrawingPrimitiveToDxfEntities(withLayer, layerNameById, units);
      entities.push(...mapped.entities);
      diagnostics.push(...mapped.diagnostics);
    }
  }

  const missingLayerIds = collectMissingLayerIds(drawingDocument, layerNameById);
  for (const layerId of missingLayerIds) {
    diagnostics.push(
      createDxfDiagnostic(
        "warning",
        "DXF_LAYER_FALLBACK",
        `Primitive references missing layer id ${layerId}; mapped to layer 0`,
        { layerName: "0" },
      ),
    );
  }

  const tables = buildDxfTablesFromDrawingLayers(layers);
  const header = {
    acadVer: options.header?.acadVer ?? DEFAULT_DXF_HEADER.acadVer,
    dwgCodepage: options.header?.dwgCodepage ?? DEFAULT_DXF_HEADER.dwgCodepage,
    units,
    measurement: options.header?.measurement ?? dxfMeasurementForUnits(units),
  };

  return {
    document: {
      header,
      tables,
      entities: sortDxfEntities(entities),
      diagnostics: [...drawingDocument.diagnostics.map(adaptDrawingDiagnostic), ...diagnostics],
    },
    diagnostics: [...drawingDocument.diagnostics.map(adaptDrawingDiagnostic), ...diagnostics],
  };
}

function collectExportLayers(
  document: DrawingDocument,
  options: {
    applyCadLayerPresets: boolean;
    convertPaperToModel: boolean;
    diagnostics: DxfDiagnostic[];
  },
): DrawingLayer[] {
  const byId = new Map<string, DrawingLayer>();

  for (const sheet of document.sheets) {
    const geometryViewport = sheet.viewports.find(
      (viewport) => viewport.kind === "plan" || viewport.kind === "profile" || viewport.kind === "cross_section",
    );

    for (const viewport of sheet.viewports) {
      for (const layer of viewport.layers) {
        const prepared = prepareLayerForExport(layer, viewport, geometryViewport, options);
        if (!byId.has(prepared.id)) {
          byId.set(prepared.id, prepared);
        } else {
          const existing = byId.get(prepared.id)!;
          existing.primitives.push(...prepared.primitives.map((primitive) => ({ ...primitive })));
        }
      }
    }
  }

  return [...byId.values()].sort((left, right) => left.id.localeCompare(right.id));
}

function prepareLayerForExport(
  layer: DrawingLayer,
  viewport: DrawingViewport,
  geometryViewport: DrawingViewport | undefined,
  options: {
    applyCadLayerPresets: boolean;
    convertPaperToModel: boolean;
    diagnostics: DxfDiagnostic[];
  },
): DrawingLayer {
  const preset = options.applyCadLayerPresets
    ? resolveCadLayerPreset(layer.id, layer.name)
    : undefined;
  const style = preset
    ? { ...drawingStyleFromCadPreset(preset), ...layer.style, color: String(preset.aciColor), lineType: preset.lineType }
    : layer.style
      ? { ...layer.style }
      : undefined;

  const rawName = preset?.name ?? layer.name;
  const sanitizedName = sanitizeDxfLayerName(rawName, "LAYER");
  if (sanitizedName !== rawName) {
    options.diagnostics.push(
      createDxfDiagnostic(
        "warning",
        "DXF_LAYER_SANITIZED",
        `Layer name "${rawName}" sanitized to "${sanitizedName}"`,
        { layerName: sanitizedName },
      ),
    );
  }

  const primitives = options.convertPaperToModel
    ? layer.primitives.map((primitive) =>
        transformPrimitiveCoordinates(primitive, viewport, geometryViewport, layer.coordinateSpace),
      )
    : layer.primitives.map((primitive) => ({ ...primitive }));

  return {
    id: layer.id,
    name: sanitizedName,
    visible: layer.visible,
    coordinateSpace: options.convertPaperToModel ? "model" : layer.coordinateSpace,
    style,
    primitives,
  };
}

function transformPrimitiveCoordinates(
  primitive: DrawingPrimitive,
  viewport: DrawingViewport,
  geometryViewport: DrawingViewport | undefined,
  coordinateSpace: DrawingLayer["coordinateSpace"],
): DrawingPrimitive {
  if (coordinateSpace !== "paper") {
    return { ...primitive };
  }

  const mapPoint = (point: Point2): Point2 => {
    if (isIdentityAffineTransform2(viewport.transform) && geometryViewport) {
      return placePaperPointNearGeometry(point, viewport, geometryViewport);
    }
    return transformPointToModel(point, viewport.transform, "paper");
  };

  switch (primitive.kind) {
    case "line":
      return { ...primitive, start: mapPoint(primitive.start), end: mapPoint(primitive.end) };
    case "polyline":
      return { ...primitive, points: primitive.points.map(mapPoint) };
    case "arc":
      return { ...primitive, center: mapPoint(primitive.center) };
    case "text":
      return { ...primitive, position: mapPoint(primitive.position) };
    case "dimension":
      return {
        ...primitive,
        start: mapPoint(primitive.start),
        end: mapPoint(primitive.end),
        textPosition: primitive.textPosition ? mapPoint(primitive.textPosition) : undefined,
      };
    default: {
      const exhaustive: never = primitive;
      return exhaustive;
    }
  }
}

/**
 * Place identity-transform paper layers (bands) below the geometry model bounds.
 * Paper mm → model meters using geometry fit scale when available.
 */
function placePaperPointNearGeometry(
  point: Point2,
  bandViewport: DrawingViewport,
  geometryViewport: DrawingViewport,
): Point2 {
  const scaleX = Math.abs(geometryViewport.transform.a) || 1;
  const modelWidth = Math.max(
    geometryViewport.modelBounds.maxX - geometryViewport.modelBounds.minX,
    1,
  );
  const paperWidth = Math.max(
    bandViewport.paperBounds.maxX - bandViewport.paperBounds.minX,
    1,
  );
  const metersPerPaperMm = modelWidth / paperWidth;
  const x =
    geometryViewport.modelBounds.minX
    + (point.x - bandViewport.paperBounds.minX) * metersPerPaperMm;
  const bandHeightM =
    (bandViewport.paperBounds.maxY - bandViewport.paperBounds.minY) * metersPerPaperMm;
  const y =
    geometryViewport.modelBounds.minY
    - 2
    - bandHeightM
    + (bandViewport.paperBounds.maxY - point.y) * metersPerPaperMm;
  // Prefer geometry scale when it looks like mm/m fit.
  if (scaleX > 0.01 && scaleX < 100) {
    return {
      x:
        geometryViewport.modelBounds.minX
        + (point.x - bandViewport.paperBounds.minX) / scaleX,
      y:
        geometryViewport.modelBounds.minY
        - 2
        - (bandViewport.paperBounds.maxY - point.y) / scaleX,
    };
  }
  return { x, y };
}

function collectMissingLayerIds(
  document: DrawingDocument,
  layerNameById: ReadonlyMap<string, string>,
): string[] {
  const missing = new Set<string>();
  for (const sheet of document.sheets) {
    for (const viewport of sheet.viewports) {
      for (const layer of viewport.layers) {
        for (const primitive of layer.primitives) {
          if (primitive.layerId && !layerNameById.has(primitive.layerId)) {
            missing.add(primitive.layerId);
          }
        }
      }
    }
  }
  return [...missing].sort((left, right) => left.localeCompare(right));
}

function adaptDrawingDiagnostic(diagnostic: DrawingDocument["diagnostics"][number]): DxfDiagnostic {
  return createDxfDiagnostic(diagnostic.severity, diagnostic.code, diagnostic.message, {
    source: diagnostic.source,
  });
}

export function drawingDocumentToDxfString(
  drawingDocument: DrawingDocument,
  options: MapDrawingDocumentToDxfOptions = {},
): { dxf: string; diagnostics: DxfDiagnostic[] } {
  const { document } = mapDrawingDocumentToDxf(drawingDocument, options);
  const serialized = serializeDxfDocument(document);
  return {
    dxf: serialized.dxf,
    diagnostics: [...serialized.diagnostics],
  };
}

export type { DxfLayer };
