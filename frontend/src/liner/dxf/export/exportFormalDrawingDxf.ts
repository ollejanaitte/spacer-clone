import type { DrawingDocument } from "../../drawing/model/document";
import { createDxfDiagnostic, type DxfDiagnostic } from "../model/diagnostics";
import {
  drawingDocumentToDxfString,
  type MapDrawingDocumentToDxfOptions,
} from "../mapper/mapDrawingDocumentToDxf";
import type { SheetPresetId } from "../presets/sheetPresets";
import { getSheetPreset } from "../presets/sheetPresets";

export type FormalDrawingDxfKind = "plan" | "profile-band" | "cross-section";

export type FormalDrawingDxfExportResult = {
  kind: FormalDrawingDxfKind;
  fileName: string;
  dxf: string;
  diagnostics: DxfDiagnostic[];
  entityCount: number;
  byteLength: number;
};

export type FormalDrawingDxfExportOptions = MapDrawingDocumentToDxfOptions & {
  projectId?: string;
  timestamp?: Date;
  sheetPresetId?: SheetPresetId;
};

export function exportFormalDrawingDxf(
  kind: FormalDrawingDxfKind,
  document: DrawingDocument,
  options: FormalDrawingDxfExportOptions = {},
): FormalDrawingDxfExportResult {
  if (options.sheetPresetId) {
    void getSheetPreset(options.sheetPresetId);
  }

  const { dxf, diagnostics } = drawingDocumentToDxfString(document, options);
  const nextDiagnostics = [...diagnostics];
  const entityCount = countEntities(dxf);
  const fileName = buildFormalDrawingDxfFileName(kind, options);

  if (!dxf || entityCount === 0) {
    nextDiagnostics.push(
      createDxfDiagnostic(
        "error",
        "DXF_EXPORT_EMPTY",
        `Formal ${kind} DXF export produced no entities`,
      ),
    );
  }

  return {
    kind,
    fileName,
    dxf,
    diagnostics: nextDiagnostics,
    entityCount,
    byteLength: new TextEncoder().encode(dxf).length,
  };
}

export function buildFormalDrawingDxfFileName(
  kind: FormalDrawingDxfKind,
  options: Pick<FormalDrawingDxfExportOptions, "projectId" | "timestamp"> = {},
): string {
  const stamp = formatTimestamp(options.timestamp ?? new Date());
  const projectPart = options.projectId
    ? `${sanitizeFileToken(options.projectId)}-`
    : "";
  return `liner-${projectPart}${kind}-${stamp}.dxf`;
}

export function canExportFormalDrawingDxf(document: DrawingDocument): boolean {
  for (const sheet of document.sheets) {
    for (const viewport of sheet.viewports) {
      for (const layer of viewport.layers) {
        if (layer.visible && layer.primitives.length > 0) {
          return true;
        }
      }
    }
  }
  return false;
}

export function downloadFormalDrawingDxf(result: FormalDrawingDxfExportResult): void {
  if (!result.dxf || result.entityCount === 0) {
    return;
  }
  const blob = new Blob([result.dxf], { type: "application/dxf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = result.fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function formatTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

function sanitizeFileToken(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 64) || "project";
}

function countEntities(dxf: string): number {
  if (!dxf) {
    return 0;
  }
  const entitiesSection = dxf.split(/\n2\nENTITIES\n/)[1];
  if (!entitiesSection) {
    return 0;
  }
  const body = entitiesSection.split(/\n0\nENDSEC\n/)[0] ?? "";
  const matches = body.match(/(?:^|\n)0\n(LINE|LWPOLYLINE|ARC|CIRCLE|TEXT)\n/g);
  return matches?.length ?? 0;
}
