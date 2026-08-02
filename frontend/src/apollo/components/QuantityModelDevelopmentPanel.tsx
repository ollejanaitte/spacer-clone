/**
 * Development QuantityModel panel (Step 2-A).
 * UNVERIFIED DEVELOPMENT QUANTITY — NOT FOR ESTIMATE, DESIGN OR CONSTRUCTION
 */
import { useMemo, useState } from "react";
import type { ProjectModel } from "../../types";
import { buildQuantityModel } from "../quantity/quantityModel";
import { downloadQuantityCsv, downloadQuantityJson } from "../quantity/quantityExport";

type Props = {
  readonly project: ProjectModel;
};

export function QuantityModelDevelopmentPanel({ project }: Props) {
  const [model, setModel] = useState(() => buildQuantityModel(project));
  const [error, setError] = useState<string | null>(null);

  const liveStaleHint = useMemo(() => buildQuantityModel(project).stale, [project]);

  const regenerate = () => {
    setError(null);
    setModel(buildQuantityModel(project));
  };

  const onCsv = () => {
    try {
      downloadQuantityCsv(model);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const onJson = () => {
    try {
      downloadQuantityJson(model);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <article className="apollo-editor-card" data-testid="apollo-quantity-model-panel">
      <div className="apollo-editor-card-header">
        <div>
          <h2>数量モデル（開発専用）</h2>
          <p>直接幾何数量と可視化仮定数量を分離表示します。正式積算ではありません。</p>
        </div>
      </div>
      <p className="apollo-input-error" role="status" data-testid="apollo-quantity-development-warning">
        UNVERIFIED DEVELOPMENT QUANTITY — NOT FOR ESTIMATE, DESIGN OR CONSTRUCTION
      </p>
      <p className="apollo-inline-hint" data-testid="apollo-quantity-development-provenance">
        NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED / authorizationStatus: {model.authorizationStatus} /
        stale: {String(model.stale)} / revision: {model.inputRevision} / checksum: {model.inputChecksum.slice(0, 16)}…
      </p>
      {liveStaleHint && model.stale ? (
        <p className="apollo-input-error" data-testid="apollo-quantity-stale-banner">
          STALE — 構造を再生成してから数量を再生成・出力してください。STALE時のexportは拒否されます。
        </p>
      ) : null}
      <div className="apollo-workspace-actions">
        <button type="button" className="apollo-button-secondary" data-testid="apollo-quantity-regenerate" onClick={regenerate}>
          数量を生成/再生成
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-quantity-export-csv"
          disabled={model.stale}
          onClick={onCsv}
        >
          CSV出力
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-quantity-export-json"
          disabled={model.stale}
          onClick={onJson}
        >
          JSON出力
        </button>
      </div>
      {error ? (
        <p className="apollo-input-error" role="alert" data-testid="apollo-quantity-export-error">
          {error}
        </p>
      ) : null}
      <p className="apollo-inline-hint" data-testid="apollo-quantity-generated-at">
        generatedAt: {model.generatedAt} / quantityModelId: {model.quantityModelId}
      </p>
      <table className="apollo-detail-table" data-testid="apollo-quantity-model-table">
        <thead>
          <tr>
            <th>category</th>
            <th>label</th>
            <th>value</th>
            <th>unit</th>
            <th>status</th>
            <th>basis</th>
            <th>warnings</th>
          </tr>
        </thead>
        <tbody>
          {model.items.map((entry) => (
            <tr key={entry.quantityId} data-testid={`apollo-qty-row-${entry.quantityId}`}>
              <td>{entry.category}</td>
              <td>{entry.label}</td>
              <td data-testid={`apollo-qty-value-${entry.quantityId}`}>
                {entry.value === null ? "—" : entry.value}
              </td>
              <td>{entry.unit}</td>
              <td>{entry.status}</td>
              <td>{entry.calculationBasis}</td>
              <td>{entry.warnings.join("; ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}
