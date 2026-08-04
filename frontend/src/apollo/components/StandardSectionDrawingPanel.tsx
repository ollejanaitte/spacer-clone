import { AuthorizationBanner } from "./AuthorizationBanner";
import { getStatusLabel } from "../i18n";
import { TechnicalDetails } from "./TechnicalDetails";
/**
 * Standard section drawing panel (Step 2-C).
 */
import { useState } from "react";
import type { ProjectModel } from "../../types";
import { buildStandardSectionDrawingModel } from "../drawing/drawingModel";
import {
  downloadDrawingDxf,
  downloadDrawingPdfHtml,
  downloadDrawingSvg,
  openDrawingPreview,
} from "../drawing/drawingExport";

type Props = { readonly project: ProjectModel };

export function StandardSectionDrawingPanel({ project }: Props) {
  const [model, setModel] = useState(() => buildStandardSectionDrawingModel(project));
  const [error, setError] = useState<string | null>(null);

  const regenerate = () => {
    setError(null);
    setModel(buildStandardSectionDrawingModel(project));
  };

  const wrap = (fn: () => void) => {
    try {
      fn();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <article className="apollo-editor-card" data-testid="apollo-drawing-model-panel">
      <div className="apollo-editor-card-header">
        <div>
          <h2>標準断面図（開発プレビュー）</h2>
          <p>図面意味モデルから生成。製作図ではありません。</p>
        </div>
      </div>
      <div data-testid="apollo-drawing-development-warning">
        <AuthorizationBanner testId="apollo-drawing-auth" />
        <p>標準断面は開発用プレビューです。製作図ではありません。</p>
      </div>
      <p className="apollo-inline-hint" data-testid="apollo-drawing-provenance">
        状態: {model.stale ? getStatusLabel("STALE") : getStatusLabel("GENERATION_CURRENT")} / 張出: {model.layout.overhang}m / 主桁:{" "}
        {model.layout.girderCount}
      </p>
      <TechnicalDetails
        testId="apollo-drawing-provenance-tech"
        title="断面図詳細"
        lines={[
          `checksum=${model.inputChecksum.slice(0, 16)}…`,
          `fabrication=${String(model.fabricationDrawing)}`,
          `overhang=${model.layout.overhang}`,
        ]}
      />
      <div className="apollo-workspace-actions">
        <button type="button" className="apollo-button-secondary" data-testid="apollo-drawing-regenerate" onClick={regenerate}>
          標準断面を生成/再生成
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-drawing-preview"
          disabled={model.stale || model.entities.length === 0}
          onClick={() => wrap(() => openDrawingPreview(model))}
        >
          プレビュー
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-drawing-export-svg"
          disabled={model.stale || model.entities.length === 0}
          onClick={() => wrap(() => downloadDrawingSvg(model))}
        >
          SVG出力
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-drawing-export-dxf"
          disabled={model.stale || model.entities.length === 0}
          onClick={() => wrap(() => downloadDrawingDxf(model))}
        >
          DXF出力
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-drawing-export-pdf-html"
          disabled={model.stale || model.entities.length === 0}
          onClick={() => wrap(() => downloadDrawingPdfHtml(model))}
        >
          図面PDF用HTML
        </button>
      </div>
      {error ? (
        <p className="apollo-input-error" role="alert" data-testid="apollo-drawing-export-error">
          {error}
        </p>
      ) : null}
      <p data-testid="apollo-drawing-girder-centers">
        主桁中心X: {model.layout.girderCentersX.map((x) => x.toFixed(3)).join(", ")} m
      </p>
    </article>
  );
}
