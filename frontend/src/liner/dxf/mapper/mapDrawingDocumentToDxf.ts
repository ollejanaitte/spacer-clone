import { serializeDxfDocument } from "../serializer/serializeDxfDocument";
import type { DrawingDocument, DrawingLayer } from "../../drawing/model/document";
import { createDxfDiagnostic, type DxfDiagnostic } from "../model/diagnostics";
import { DEFAULT_DXF_HEADER } from "../model/defaults";
import type { DxfDocument, DxfDocumentOptions, DxfEntity } from "../model/types";
import { dxfMeasurementForUnits, DEFAULT_DXF_UNITS } from "../model/units";
import { sortDxfEntities } from "../validation/validateDxfDocument";
import { buildDxfTablesFromDrawingLayers } from "./mapDrawingLayer";
import { mapDrawingPrimitiveToDxfEntities } from "./mapDrawingPrimitive";

export type MapDrawingDocumentToDxfResult = {
  document: DxfDocument;
  diagnostics: DxfDiagnostic[];
};

export function mapDrawingDocumentToDxf(
  drawingDocument: DrawingDocument,
  options: DxfDocumentOptions = {},
): MapDrawingDocumentToDxfResult {
  const units = options.header?.units ?? DEFAULT_DXF_UNITS;
  const diagnostics: DxfDiagnostic[] = [];
  const layers = collectDrawingLayers(drawingDocument);
  const layerNameById = new Map(layers.map((layer) => [layer.id, layer.name]));
  const entities: DxfEntity[] = [];

  for (const layer of layers) {
    if (!layer.visible) {
      continue;
    }
    for (const primitive of layer.primitives) {
      const mapped = mapDrawingPrimitiveToDxfEntities(primitive, layerNameById, units);
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

function collectDrawingLayers(document: DrawingDocument): DrawingLayer[] {
  const byId = new Map<string, DrawingLayer>();
  for (const sheet of document.sheets) {
    for (const viewport of sheet.viewports) {
      for (const layer of viewport.layers) {
        if (!byId.has(layer.id)) {
          byId.set(layer.id, {
            id: layer.id,
            name: layer.name,
            visible: layer.visible,
            style: layer.style ? { ...layer.style } : undefined,
            primitives: layer.primitives.map((primitive) => ({ ...primitive })),
          });
        } else {
          const existing = byId.get(layer.id)!;
          existing.primitives.push(...layer.primitives.map((primitive) => ({ ...primitive })));
        }
      }
    }
  }
  return [...byId.values()].sort((left, right) => left.id.localeCompare(right.id));
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
  options: DxfDocumentOptions = {},
): { dxf: string; diagnostics: DxfDiagnostic[] } {
  const { document } = mapDrawingDocumentToDxf(drawingDocument, options);
  const serialized = serializeDxfDocument(document);
  return {
    dxf: serialized.dxf,
    diagnostics: [...serialized.diagnostics],
  };
}
