/**
 * Superstructure DXF export (Phase 9-04 S-05).
 *
 * Generates a minimal, valid ASCII DXF (R12) of the girder arrangement in
 * plan + cross-section view, derived from the canonical SuperstructureDocument
 * only (never the old ProjectModel). This is a display/derived artifact.
 */

import type { SuperstructureDocument } from "./superstructureTypes";
import { deriveGirderOffsets } from "./superstructureDocumentDomain";

function lineEntity(layer: string, x1: number, y1: number, x2: number, y2: number): string {
  return [
    "0", "LINE", "8", layer,
    "10", fmt(x1), "20", fmt(y1), "30", "0",
    "11", fmt(x2), "21", fmt(y2), "31", "0",
  ].join("\n");
}

function textEntity(layer: string, x: number, y: number, value: string): string {
  return [
    "0", "TEXT", "8", layer,
    "10", fmt(x), "20", fmt(y), "30", "0",
    "40", "0.6",
    "1", value,
  ].join("\n");
}

function fmt(n: number): string {
  return Number.isFinite(n) ? n.toFixed(3) : "0.000";
}

export interface SuperstructureDxfOptions {
  readonly view: "plan" | "crossSection";
}

export function buildSuperstructureDxf(document: SuperstructureDocument, options: SuperstructureDxfOptions = { view: "plan" }): string {
  const lines: string[] = [];
  const deckWidth = document.deckConfiguration.resolvedWidthM ?? 12;
  const totalSpan = (document.spanReferences?.spans ?? []).reduce((s, sp) => s + sp.spanLength, 0) || 30;
  const girderOffsets = deriveGirderOffsets(
    document.girderConfiguration.girderCount,
    document.girderConfiguration.girderSpacingM,
  ) ?? [0];

  if (options.view === "plan") {
    // plan: x = along span (0..totalSpan), y = transverse offset
    lines.push(lineEntity("DECK", 0, -deckWidth / 2, totalSpan, -deckWidth / 2));
    lines.push(lineEntity("DECK", 0, deckWidth / 2, totalSpan, deckWidth / 2));
    for (const offset of girderOffsets) {
      lines.push(lineEntity("GIRDERS", 0, offset, totalSpan, offset));
    }
    for (let s = 0; s <= totalSpan; s += totalSpan / 4) {
      lines.push(lineEntity("CROSSBEAMS", s, -deckWidth / 2, s, deckWidth / 2));
    }
    lines.push(textEntity("LABELS", 0, deckWidth / 2 + 2, `GIRDER x ${document.girderConfiguration.girderCount} / SPACING ${document.girderConfiguration.girderSpacingM ?? 0} m / SPAN ${totalSpan} m`));
  } else {
    // cross-section: x = transverse, y = vertical (girder depth + deck)
    const depth = document.girderConfiguration.girderSectionModel.depthM ?? 2;
    const deckThickness = document.deckConfiguration.thicknessM ?? 0.24;
    lines.push(lineEntity("DECK", -deckWidth / 2, 0, deckWidth / 2, 0));
    lines.push(lineEntity("DECK", -deckWidth / 2, deckThickness, deckWidth / 2, deckThickness));
    for (const offset of girderOffsets) {
      lines.push(lineEntity("GIRDERS", offset - 0.3, 0, offset - 0.3, depth));
      lines.push(lineEntity("GIRDERS", offset + 0.3, 0, offset + 0.3, depth));
    }
    lines.push(textEntity("LABELS", 0, depth + 2, `GIRDER DEPTH ${depth} m / DECK ${deckThickness} m`));
  }

  return [
    "0", "SECTION", "2", "HEADER",
    "9", "$ACADVER", "1", "AC1009",
    "0", "ENDSEC",
    "0", "SECTION", "2", "ENTITIES",
    lines.join("\n"),
    "0", "ENDSEC",
    "0", "EOF",
  ].join("\n");
}

/** Trigger a DXF file download in the browser. */
export function downloadSuperstructureDxf(dxf: string, fileName = "superstructure.dxf"): void {
  const blob = new Blob([dxf], { type: "application/dxf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
