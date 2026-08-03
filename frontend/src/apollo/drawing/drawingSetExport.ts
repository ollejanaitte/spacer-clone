/**
 * SVG / DXF / HTML-PDF exporters for DrawingSetModel sheets.
 * DEVELOPMENT ONLY — NOT A FABRICATION DRAWING
 */

import { downloadTextFile } from "../quantity/quantityExport";
import {
  assertDrawingSetExportable,
  drawingSetChecksum,
  type DrawingSetEntity,
  type DrawingSetModel,
  type SheetModel,
  type ViewModel,
} from "./drawingSetModel";
import {
  assertMemberScheduleExportable,
  buildMemberScheduleModel,
  memberScheduleToCsv,
  memberScheduleToJson,
} from "./memberScheduleModel";
import type { ProjectModel } from "../../types";

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function yFlip(y: number, minY: number, maxY: number): number {
  return maxY - (y - minY);
}

function renderViewSvg(view: ViewModel, offsetX: number, offsetY: number, targetW: number, targetH: number): string {
  const { minX, minY, maxX, maxY } = view.viewport;
  const vw = Math.max(maxX - minX, 1e-6);
  const vh = Math.max(maxY - minY, 1e-6);
  const scale = Math.min(targetW / vw, targetH / vh);
  const parts: string[] = [];
  parts.push(`<g id="${view.viewId}" data-view-type="${view.viewType}" transform="translate(${offsetX},${offsetY}) scale(${scale}) translate(${-minX},${0})">`);
  const all = [...view.entities, ...view.dimensions, ...view.labels];
  for (const entity of all) {
    parts.push(renderEntity(entity, minY, maxY));
  }
  parts.push(`</g>`);
  return parts.join("\n");
}

function renderEntity(entity: DrawingSetEntity, minY: number, maxY: number): string {
  const g = entity.geometry;
  const yf = (y: number) => yFlip(y, minY, maxY);
  if (entity.type === "RECT") {
    const x = Number(g.x);
    const y = yf(Number(g.y) + Number(g.h));
    return `<rect id="${entity.entityId}" data-layer="${entity.layerId}" data-source="${entity.sourceEntityId}" x="${x}" y="${y}" width="${g.w}" height="${g.h}" fill="none" stroke="#222" stroke-width="0.03"/>`;
  }
  if (entity.type === "LINE") {
    const dash = entity.style?.strokeDasharray ? ` stroke-dasharray="${entity.style.strokeDasharray}"` : "";
    return `<line id="${entity.entityId}" data-layer="${entity.layerId}" data-source="${entity.sourceEntityId}" x1="${g.x1}" y1="${yf(Number(g.y1))}" x2="${g.x2}" y2="${yf(Number(g.y2))}" stroke="#444" stroke-width="0.025"${dash}/>`;
  }
  if (entity.type === "POLYLINE") {
    const pts = g.points as readonly number[];
    const pairs: string[] = [];
    for (let i = 0; i < pts.length; i += 2) {
      pairs.push(`${pts[i]},${yf(pts[i + 1]!)}`);
    }
    return `<polyline id="${entity.entityId}" data-layer="${entity.layerId}" data-source="${entity.sourceEntityId}" points="${pairs.join(" ")}" fill="none" stroke="#111" stroke-width="0.025"/>`;
  }
  if (entity.type === "TEXT" || entity.type === "DIMENSION") {
    const y = yf(Number(g.y ?? g.y1));
    const x = Number(g.x ?? (Number(g.x1) + Number(g.x2)) / 2);
    const text = String(g.text ?? "");
    const h = Number(g.height ?? 0.15);
    if (entity.type === "DIMENSION") {
      const y1 = yf(Number(g.y1));
      const y2 = yf(Number(g.y2));
      return `<g id="${entity.entityId}" data-layer="${entity.layerId}" data-source="${entity.sourceEntityId}"><line x1="${g.x1}" y1="${y1}" x2="${g.x2}" y2="${y2}" stroke="#06c" stroke-width="0.015"/><text x="${x}" y="${y}" font-size="${h}" text-anchor="middle" fill="#06c">${escapeXml(text)}</text></g>`;
    }
    const fill = entity.layerId === "APOLLO_WARNING" ? "#b00020" : "#111";
    return `<text id="${entity.entityId}" data-layer="${entity.layerId}" data-source="${entity.sourceEntityId}" x="${x}" y="${y}" font-size="${h}" text-anchor="middle" fill="${fill}">${escapeXml(text)}</text>`;
  }
  return "";
}

export function renderSheetSvg(model: DrawingSetModel, sheet: SheetModel): string {
  assertDrawingSetExportable(model);
  const width = 1600;
  const height = 1100;
  const parts: string[] = [];
  parts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" data-drawing-number="${sheet.drawingNumber}" data-sheet-checksum="${sheet.checksum}" data-drawing-set-checksum="${drawingSetChecksum(model)}" data-input-checksum="${model.inputChecksum}">`,
  );
  parts.push(`<title>${escapeXml(sheet.title)}</title>`);
  parts.push(
    `<desc>DEVELOPMENT GENERAL ARRANGEMENT — NOT A DESIGN-APPROVED OR FABRICATION DRAWING — NOT FOR CONSTRUCTION — NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED</desc>`,
  );
  parts.push(
    `<metadata><inputRevision>${escapeXml(model.inputRevision)}</inputRevision><drawingSetId>${escapeXml(model.drawingSetId)}</drawingSetId></metadata>`,
  );
  parts.push(`<rect x="10" y="10" width="${width - 20}" height="${height - 20}" fill="none" stroke="#000" stroke-width="2" data-layer="APOLLO_BORDER"/>`);
  parts.push(
    `<text x="40" y="40" font-size="18" fill="#b00020" data-layer="APOLLO_WARNING">DEVELOPMENT GENERAL ARRANGEMENT — NOT A DESIGN-APPROVED OR FABRICATION DRAWING — NOT FOR CONSTRUCTION</text>`,
  );
  parts.push(
    `<text x="40" y="65" font-size="14" data-layer="APOLLO_TITLE">${escapeXml(sheet.drawingNumber)} ${escapeXml(sheet.title)}</text>`,
  );
  parts.push(
    `<text x="40" y="85" font-size="11" data-layer="APOLLO_TEXT">rev=${escapeXml(model.inputRevision.slice(0, 24))} | inputCk=${model.inputChecksum.slice(0, 12)} | sheetCk=${sheet.checksum.slice(0, 12)} | ${sheet.paperSize} ${sheet.orientation}</text>`,
  );

  const viewSlots = [
    { x: 40, y: 110, w: 900, h: 420 },
    { x: 40, y: 560, w: 900, h: 420 },
    { x: 980, y: 110, w: 560, h: 520 },
  ];
  sheet.views.forEach((view, i) => {
    const slot = viewSlots[i] ?? { x: 40, y: 110 + i * 40, w: 400, h: 300 };
    parts.push(
      `<text x="${slot.x}" y="${slot.y - 8}" font-size="12" data-layer="APOLLO_TITLE">${escapeXml(view.viewType)}</text>`,
    );
    parts.push(renderViewSvg(view, slot.x, slot.y, slot.w, slot.h - 20));
  });

  // Particulars table (text lines)
  let ty = 660;
  for (const table of sheet.tables) {
    parts.push(`<text x="980" y="${ty}" font-size="12" font-weight="bold" data-layer="APOLLO_TABLE">${escapeXml(table.title)}</text>`);
    ty += 18;
    for (const row of table.rows.slice(0, 16)) {
      parts.push(
        `<text x="980" y="${ty}" font-size="10" data-layer="APOLLO_TABLE">${escapeXml(row.join(" | "))}</text>`,
      );
      ty += 14;
    }
  }

  parts.push(`</svg>`);
  return parts.join("\n");
}

export function renderSheetDxf(model: DrawingSetModel, sheet: SheetModel): string {
  assertDrawingSetExportable(model);
  const toMm = (m: number) => m * 1000;
  const lines: string[] = [];
  const push = (code: number, value: string | number) => {
    lines.push(String(code), String(value));
  };
  push(0, "SECTION");
  push(2, "HEADER");
  push(9, "$INSUNITS");
  push(70, 4);
  push(9, "$MEASUREMENT");
  push(70, 1);
  push(0, "ENDSEC");
  push(0, "SECTION");
  push(2, "TABLES");
  push(0, "TABLE");
  push(2, "LAYER");
  push(70, model.layerRegistry.length);
  for (const layer of model.layerRegistry) {
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
    const ascii = text.replace(/[^\x20-\x7E]/g, "?");
    push(0, "TEXT");
    push(8, layer);
    push(10, toMm(x));
    push(20, toMm(y));
    push(30, 0);
    push(40, toMm(height));
    push(1, ascii);
  };

  emitText("APOLLO_WARNING", 0, -2, 0.3, "DEVELOPMENT GENERAL ARRANGEMENT - NOT FOR CONSTRUCTION");
  emitText("APOLLO_TITLE", 0, -2.5, 0.25, `${sheet.drawingNumber} ${sheet.title}`.replace(/[^\x20-\x7E]/g, "?"));

  let yOffset = 0;
  for (const view of sheet.views) {
    for (const entity of [...view.entities, ...view.dimensions, ...view.labels]) {
      const g = entity.geometry;
      if (entity.type === "LINE" || entity.type === "DIMENSION") {
        emitLine(entity.layerId, Number(g.x1), Number(g.y1) + yOffset, Number(g.x2), Number(g.y2) + yOffset);
        if (entity.type === "DIMENSION") {
          emitText(
            entity.layerId,
            (Number(g.x1) + Number(g.x2)) / 2,
            (Number(g.y1) + Number(g.y2)) / 2 + yOffset,
            0.12,
            String(g.text ?? ""),
          );
        }
      } else if (entity.type === "RECT") {
        const x = Number(g.x);
        const y = Number(g.y) + yOffset;
        const w = Number(g.w);
        const h = Number(g.h);
        emitLine(entity.layerId, x, y, x + w, y);
        emitLine(entity.layerId, x + w, y, x + w, y + h);
        emitLine(entity.layerId, x + w, y + h, x, y + h);
        emitLine(entity.layerId, x, y + h, x, y);
      } else if (entity.type === "POLYLINE") {
        const pts = g.points as readonly number[];
        for (let i = 0; i + 3 < pts.length; i += 2) {
          emitLine(entity.layerId, pts[i]!, pts[i + 1]! + yOffset, pts[i + 2]!, pts[i + 3]! + yOffset);
        }
      } else if (entity.type === "TEXT") {
        emitText(entity.layerId, Number(g.x), Number(g.y) + yOffset, Number(g.height ?? 0.15), String(g.text ?? ""));
      }
    }
    yOffset -= (view.viewport.maxY - view.viewport.minY) + 5;
  }

  push(0, "ENDSEC");
  push(0, "EOF");
  return `${lines.join("\n")}\n`;
}

export function renderSheetPdfHtml(model: DrawingSetModel, sheet: SheetModel): string {
  assertDrawingSetExportable(model);
  const svg = renderSheetSvg(model, sheet);
  const tableHtml = sheet.tables
    .map(
      (t) =>
        `<h3>${escapeXml(t.title)}</h3><table border="1" cellpadding="4" cellspacing="0"><thead><tr>${t.headers
          .map((h) => `<th>${escapeXml(h)}</th>`)
          .join("")}</tr></thead><tbody>${t.rows
          .map((r) => `<tr>${r.map((c) => `<td>${escapeXml(c)}</td>`).join("")}</tr>`)
          .join("")}</tbody></table>`,
    )
    .join("\n");
  return `<!DOCTYPE html>
<html lang="ja"><head><meta charset="utf-8"/>
<title>${escapeXml(sheet.drawingNumber)} ${escapeXml(sheet.title)}</title>
<style>
@page { size: A3 landscape; margin: 10mm; }
body { font-family: "Noto Sans JP", sans-serif; margin: 0; }
.warning { color:#b00020; font-weight:700; margin:8px 12px; }
.titleblock { display:flex; justify-content:space-between; padding:8px 12px; border-bottom:1px solid #333; font-size:12px; }
svg { width:100%; height:auto; }
table { font-size:11px; margin:12px; }
</style></head>
<body>
<div class="warning">DEVELOPMENT GENERAL ARRANGEMENT — NOT A DESIGN-APPROVED OR FABRICATION DRAWING — NOT FOR CONSTRUCTION — NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED</div>
<div class="titleblock">
  <div>${escapeXml(sheet.drawingNumber)} ${escapeXml(sheet.title)}</div>
  <div>project: ${escapeXml(model.projectId)} | rev: ${escapeXml(model.inputRevision)} | ck: ${model.inputChecksum.slice(0, 12)} | ${sheet.paperSize} ${sheet.orientation}</div>
</div>
${svg}
${tableHtml}
<p style="margin:12px;font-size:11px;">${sheet.notes.map(escapeXml).join(" | ")}</p>
</body></html>`;
}

function primarySheet(model: DrawingSetModel): SheetModel {
  const sheet = model.sheets[0];
  if (!sheet) throw new Error("No sheets in drawing set");
  return sheet;
}

function sheetFileStem(sheet: SheetModel): string {
  const map: Record<string, string> = {
    "G-01": "general_arrangement",
    "G-02": "girder_crossbeam",
    "G-03": "bracing",
    "G-04": "stiffener",
    "G-05": "support_bearing",
    "G-06": "girder_elevation",
    "G-07": "member_schedule",
  };
  return map[sheet.drawingNumber] ?? sheet.drawingNumber.toLowerCase().replaceAll("-", "_");
}

export function downloadDrawingSetSheetSvg(model: DrawingSetModel, drawingNumber?: string): void {
  const sheet = drawingNumber
    ? model.sheets.find((s) => s.drawingNumber === drawingNumber) ?? primarySheet(model)
    : primarySheet(model);
  downloadTextFile(
    `${sheet.drawingNumber}_${sheetFileStem(sheet)}.svg`,
    renderSheetSvg(model, sheet),
    "image/svg+xml;charset=utf-8",
  );
}

export function downloadDrawingSetSheetDxf(model: DrawingSetModel, drawingNumber?: string): void {
  const sheet = drawingNumber
    ? model.sheets.find((s) => s.drawingNumber === drawingNumber) ?? primarySheet(model)
    : primarySheet(model);
  downloadTextFile(
    `${sheet.drawingNumber}_${sheetFileStem(sheet)}.dxf`,
    renderSheetDxf(model, sheet),
    "application/dxf;charset=utf-8",
  );
}

export function downloadDrawingSetSheetPdfHtml(model: DrawingSetModel, drawingNumber?: string): void {
  const sheet = drawingNumber
    ? model.sheets.find((s) => s.drawingNumber === drawingNumber) ?? primarySheet(model)
    : primarySheet(model);
  downloadTextFile(
    `${sheet.drawingNumber}_${sheetFileStem(sheet)}.html`,
    renderSheetPdfHtml(model, sheet),
    "text/html;charset=utf-8",
  );
}

export function openDrawingSetPreview(model: DrawingSetModel, drawingNumber?: string): void {
  const sheet = drawingNumber
    ? model.sheets.find((s) => s.drawingNumber === drawingNumber) ?? primarySheet(model)
    : primarySheet(model);
  const html = renderSheetPdfHtml(model, sheet);
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function downloadMemberScheduleCsv(project: ProjectModel): void {
  const schedule = buildMemberScheduleModel(project);
  assertMemberScheduleExportable(schedule);
  downloadTextFile(
    `member_schedule_${schedule.projectId}_r${schedule.inputChecksum.slice(0, 8)}.csv`,
    memberScheduleToCsv(schedule),
    "text/csv;charset=utf-8",
  );
}

export function downloadMemberScheduleJson(project: ProjectModel): void {
  const schedule = buildMemberScheduleModel(project);
  assertMemberScheduleExportable(schedule);
  downloadTextFile(
    `member_schedule_${schedule.projectId}_r${schedule.inputChecksum.slice(0, 8)}.json`,
    memberScheduleToJson(schedule),
    "application/json;charset=utf-8",
  );
}
