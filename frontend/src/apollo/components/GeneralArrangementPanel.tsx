/**
 * Step 3-A general arrangement drawing panel.
 * DEVELOPMENT GENERAL ARRANGEMENT — NOT FOR CONSTRUCTION
 */
import { useState } from "react";
import type { ProjectModel } from "../../types";
import { buildGeneralArrangementDrawingSet } from "../drawing/drawingSetModel";
import {
  downloadDrawingSetSheetDxf,
  downloadDrawingSetSheetPdfHtml,
  downloadDrawingSetSheetSvg,
  openDrawingSetPreview,
} from "../drawing/drawingSetExport";

type Props = { readonly project: ProjectModel };

export function GeneralArrangementPanel({ project }: Props) {
  const [model, setModel] = useState(() => buildGeneralArrangementDrawingSet(project));
  const [sheetIndex, setSheetIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hiddenLayers, setHiddenLayers] = useState<ReadonlySet<string>>(new Set());

  const regenerate = () => {
    setError(null);
    const next = buildGeneralArrangementDrawingSet(project);
    setModel(next);
    setSheetIndex(0);
  };

  const wrap = (fn: () => void) => {
    try {
      fn();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const sheet = model.sheets[sheetIndex] ?? null;
  const viewTypes = sheet?.views.map((v) => v.viewType).join(", ") ?? "none";

  const toggleLayer = (layer: string) => {
    setHiddenLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  };

  return (
    <article className="apollo-editor-card" data-testid="apollo-general-arrangement-panel">
      <div className="apollo-editor-card-header">
        <div>
          <h2>構造一般図・配置図（開発プレビュー）</h2>
          <p>DrawingSetModel G-01〜G-04：一般図＋主桁/横桁・対傾構/横構・補剛材配置。</p>
        </div>
      </div>
      <p className="apollo-input-error" role="status" data-testid="apollo-ga-development-warning">
        DEVELOPMENT GENERAL ARRANGEMENT — NOT A DESIGN-APPROVED OR FABRICATION DRAWING — NOT FOR
        CONSTRUCTION
      </p>
      <p className="apollo-inline-hint" data-testid="apollo-ga-provenance">
        stale: {String(model.stale)} / sheets: {model.sheets.length} / views: {viewTypes} / girders:{" "}
        {model.layout.girderCount} / cb: {model.layout.crossBeamStations.length} / checksum:{" "}
        {model.inputChecksum.slice(0, 16)}… / sectionCk: {model.standardSectionChecksum.slice(0, 12)}…
      </p>
      <div className="apollo-workspace-actions">
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-ga-regenerate"
          onClick={regenerate}
        >
          構造一般図を生成
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-ga-sheet-prev"
          disabled={sheetIndex <= 0}
          onClick={() => setSheetIndex((i) => Math.max(0, i - 1))}
        >
          前シート
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-ga-sheet-next"
          disabled={sheetIndex >= model.sheets.length - 1}
          onClick={() => setSheetIndex((i) => Math.min(model.sheets.length - 1, i + 1))}
        >
          次シート
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-ga-preview"
          disabled={model.stale || !sheet}
          onClick={() => wrap(() => openDrawingSetPreview(model, sheet?.drawingNumber))}
        >
          プレビュー
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-ga-export-svg"
          disabled={model.stale || !sheet}
          onClick={() => wrap(() => downloadDrawingSetSheetSvg(model, sheet?.drawingNumber))}
        >
          SVG出力
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-ga-export-dxf"
          disabled={model.stale || !sheet}
          onClick={() => wrap(() => downloadDrawingSetSheetDxf(model, sheet?.drawingNumber))}
        >
          DXF出力
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-ga-export-pdf-html"
          disabled={model.stale || !sheet}
          onClick={() => wrap(() => downloadDrawingSetSheetPdfHtml(model, sheet?.drawingNumber))}
        >
          PDF用HTML
        </button>
      </div>
      {sheet ? (
        <p data-testid="apollo-ga-sheet-status">
          {sheet.drawingNumber} {sheet.title} ({sheetIndex + 1}/{model.sheets.length}) paper=
          {sheet.paperSize} {sheet.orientation}
        </p>
      ) : (
        <p data-testid="apollo-ga-sheet-status">
          NO SHEETS — BLOCKED or incomplete input ({model.warnings.slice(0, 3).join("; ")})
        </p>
      )}
      <div data-testid="apollo-ga-layer-toggles">
        {(["APOLLO_GIRDER", "APOLLO_CROSSBEAM", "APOLLO_BRACING", "APOLLO_STIFFENER", "APOLLO_SUPPORT"] as const).map(
          (layer) => (
            <label key={layer} style={{ marginRight: 12, fontSize: 12 }}>
              <input
                type="checkbox"
                checked={!hiddenLayers.has(layer)}
                onChange={() => toggleLayer(layer)}
                data-testid={`apollo-ga-layer-${layer}`}
              />{" "}
              {layer}
            </label>
          ),
        )}
      </div>
      <p data-testid="apollo-ga-layout-summary">
        plan L={model.layout.bridgeLength} B={model.layout.width} oh={model.layout.overhang} supports=
        {model.layout.supportStations.join(",")} girderY=
        {model.layout.girderCentersY.map((y) => y.toFixed(3)).join(",")} hiddenLayers=
        {Array.from(hiddenLayers).join("|") || "none"}
      </p>
      {error ? (
        <p className="apollo-input-error" role="alert" data-testid="apollo-ga-export-error">
          {error}
        </p>
      ) : null}
    </article>
  );
}
