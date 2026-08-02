/**
 * SVG / DXF / HTML-sheet exporters from DrawingModel.
 * Development only — NOT A FABRICATION DRAWING
 */

import {
  assertDrawingExportable,
  drawingModelChecksum,
  type DrawingEntity,
  type DrawingModel,
} from "./drawingModel";
import { downloadTextFile } from "../quantity/quantityExport";

function yFlip(y: number, model: DrawingModel): number {
  // SVG y grows downward; model y grows upward from bottom flange.
  return model.viewport.maxY - (y - model.viewport.minY);
}

export function renderDrawingSvg(model: DrawingModel): string {
  assertDrawingExportable(model);
  const { minX, minY, maxX, maxY } = model.viewport;
  const width = maxX - minX;
  const height = maxY - minY;
  const parts: string[] = [];
  parts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${0} ${width} ${height}" width="1200" height="800" data-drawing-id="${model.drawingId}" data-checksum="${drawingModelChecksum(model)}" data-input-checksum="${model.inputChecksum}">`,
  );
  parts.push(`<title>${escapeXml(model.sheet.titleBlock.title)}</title>`);
  parts.push(`<desc>STANDARD SECTION DEVELOPMENT PREVIEW — NOT A FABRICATION DRAWING — NOT FOR DESIGN OR CONSTRUCTION</desc>`);
  parts.push(`<metadata><inputRevision>${escapeXml(model.inputRevision)}</inputRevision></metadata>`);

  const all = [...model.entities, ...model.dimensions, ...model.labels];
  for (const entity of all) {
    parts.push(renderEntity(entity, model));
  }
  parts.push(`</svg>`);
  return parts.join("\n");
}

function renderEntity(entity: DrawingEntity, model: DrawingModel): string {
  const g = entity.geometry;
  if (entity.type === "RECT") {
    const x = Number(g.x);
    const y = yFlip(Number(g.y) + Number(g.h), model);
    return `<rect id="${entity.entityId}" data-layer="${entity.layerId}" x="${x}" y="${y}" width="${g.w}" height="${g.h}" fill="none" stroke="#222" stroke-width="0.02"/>`;
  }
  if (entity.type === "LINE") {
    return `<line id="${entity.entityId}" data-layer="${entity.layerId}" x1="${g.x1}" y1="${yFlip(Number(g.y1), model)}" x2="${g.x2}" y2="${yFlip(Number(g.y2), model)}" stroke="#666" stroke-width="0.015" stroke-dasharray="${entity.style?.strokeDasharray ?? "none"}"/>`;
  }
  if (entity.type === "POLYLINE") {
    const pts = g.points as readonly number[];
    const pairs: string[] = [];
    for (let i = 0; i < pts.length; i += 2) {
      pairs.push(`${pts[i]},${yFlip(pts[i + 1]!, model)}`);
    }
    return `<polyline id="${entity.entityId}" data-layer="${entity.layerId}" points="${pairs.join(" ")}" fill="none" stroke="#111" stroke-width="0.02"/>`;
  }
  if (entity.type === "TEXT" || entity.type === "DIMENSION") {
    const y = yFlip(Number(g.y ?? g.y1), model);
    const x = Number(g.x ?? ((Number(g.x1) + Number(g.x2)) / 2));
    const text = String(g.text ?? "");
    const h = Number(g.height ?? 0.1);
    if (entity.type === "DIMENSION") {
      const y1 = yFlip(Number(g.y1), model);
      const y2 = yFlip(Number(g.y2), model);
      return `<g id="${entity.entityId}" data-layer="${entity.layerId}"><line x1="${g.x1}" y1="${y1}" x2="${g.x2}" y2="${y2}" stroke="#06c" stroke-width="0.01"/><text x="${x}" y="${y}" font-size="${h}" text-anchor="middle" fill="#06c">${escapeXml(text)}</text></g>`;
    }
    return `<text id="${entity.entityId}" data-layer="${entity.layerId}" x="${x}" y="${y}" font-size="${h}" text-anchor="middle" fill="${entity.layerId === "APOLLO_WARNING" ? "#b00020" : "#111"}">${escapeXml(text)}</text>`;
  }
  return "";
}

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

/** Minimal ASCII DXF (R12-ish) — units recorded as mm (1 m = 1000). */
export function renderDrawingDxf(model: DrawingModel): string {
  assertDrawingExportable(model);
  const toMm = (m: number) => m * 1000;
  const lines: string[] = [];
  const push = (code: number, value: string | number) => {
    lines.push(String(code), String(value));
  };
  push(0, "SECTION");
  push(2, "HEADER");
  push(9, "$INSUNITS");
  push(70, 4); // mm
  push(9, "$MEASUREMENT");
  push(70, 1);
  push(0, "ENDSEC");
  push(0, "SECTION");
  push(2, "TABLES");
  push(0, "TABLE");
  push(2, "LAYER");
  push(70, model.layers.length);
  for (const layer of model.layers) {
    push(0, "LAYER");
    push(2, layer);
    push(70, 0);
    push(62, 7);
    push(6, "CONTINUOUS");
  }
  push(0, "ENDTAB");
  push(0, "ENDSEC");
  push(0, "SECTION");
  push(2, "ENTITIES");

  const emitLine = (layer: string, x1: number, y1: number, x2: number, y2: number) => {
    push(0, "LINE");
    push(8, layer);
    push(10, toMm(x1));
    push(20, toMm(y1));
    push(30, 0);
    push(11, toMm(x2));
    push(21, toMm(y2));
    push(31, 0);
  };
  const emitText = (layer: string, x: number, y: number, height: number, text: string) => {
    // ASCII fallback for unstable CJK in minimal DXF
    const ascii = text.replace(/[^\x20-\x7E]/g, "?");
    push(0, "TEXT");
    push(8, layer);
    push(10, toMm(x));
    push(20, toMm(y));
    push(30, 0);
    push(40, toMm(height));
    push(1, ascii);
  };

  for (const entity of [...model.entities, ...model.dimensions, ...model.labels]) {
    const g = entity.geometry;
    if (entity.type === "LINE" || entity.type === "DIMENSION") {
      emitLine(entity.layerId, Number(g.x1), Number(g.y1), Number(g.x2), Number(g.y2));
      if (entity.type === "DIMENSION") {
        emitText(
          entity.layerId,
          (Number(g.x1) + Number(g.x2)) / 2,
          (Number(g.y1) + Number(g.y2)) / 2,
          0.08,
          String(g.text ?? ""),
        );
      }
    } else if (entity.type === "RECT") {
      const x = Number(g.x);
      const y = Number(g.y);
      const w = Number(g.w);
      const h = Number(g.h);
      emitLine(entity.layerId, x, y, x + w, y);
      emitLine(entity.layerId, x + w, y, x + w, y + h);
      emitLine(entity.layerId, x + w, y + h, x, y + h);
      emitLine(entity.layerId, x, y + h, x, y);
    } else if (entity.type === "POLYLINE") {
      const pts = g.points as readonly number[];
      for (let i = 0; i + 3 < pts.length; i += 2) {
        emitLine(entity.layerId, pts[i]!, pts[i + 1]!, pts[i + 2]!, pts[i + 3]!);
      }
    } else if (entity.type === "TEXT") {
      emitText(entity.layerId, Number(g.x), Number(g.y), Number(g.height ?? 0.1), String(g.text ?? ""));
    }
  }

  push(0, "ENDSEC");
  push(0, "EOF");
  return `${lines.join("\n")}\n`;
}

export function renderDrawingPdfHtml(model: DrawingModel): string {
  assertDrawingExportable(model);
  const svg = renderDrawingSvg(model);
  return `<!DOCTYPE html>
<html lang="ja"><head><meta charset="utf-8"/>
<title>${escapeXml(model.drawingId)}</title>
<style>
@page { size: A3 landscape; margin: 12mm; }
body { font-family: "Noto Sans JP", sans-serif; margin: 0; }
.warning { color:#b00020; font-weight:700; margin:8px 12px; }
.titleblock { display:flex; justify-content:space-between; padding:8px 12px; border-bottom:1px solid #333; font-size:12px; }
svg { width:100%; height:auto; }
</style></head>
<body>
<div class="warning">STANDARD SECTION — DEVELOPMENT PREVIEW — NOT A FABRICATION DRAWING — NOT FOR DESIGN OR CONSTRUCTION — NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED</div>
<div class="titleblock">
  <div>${escapeXml(model.sheet.titleBlock.title)} / ${escapeXml(model.sheet.titleBlock.subtitle)}</div>
  <div>project: ${escapeXml(model.projectId)} | rev: ${escapeXml(model.inputRevision)} | ck: ${model.inputChecksum.slice(0, 12)} | A3 landscape</div>
</div>
${svg}
</body></html>`;
}

export function downloadDrawingSvg(model: DrawingModel): void {
  downloadTextFile(
    `apollo-standard-section_${model.projectId}_r${model.inputChecksum.slice(0, 8)}.svg`,
    renderDrawingSvg(model),
    "image/svg+xml;charset=utf-8",
  );
}

export function downloadDrawingDxf(model: DrawingModel): void {
  downloadTextFile(
    `apollo-standard-section_${model.projectId}_r${model.inputChecksum.slice(0, 8)}.dxf`,
    renderDrawingDxf(model),
    "application/dxf;charset=utf-8",
  );
}

export function downloadDrawingPdfHtml(model: DrawingModel): void {
  downloadTextFile(
    `apollo-standard-section_${model.projectId}_r${model.inputChecksum.slice(0, 8)}.html`,
    renderDrawingPdfHtml(model),
    "text/html;charset=utf-8",
  );
}

export function openDrawingPreview(model: DrawingModel): void {
  const html = renderDrawingPdfHtml(model);
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
