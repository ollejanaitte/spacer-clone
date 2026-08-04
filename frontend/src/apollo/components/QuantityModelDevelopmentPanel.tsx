import { AuthorizationBanner } from "./AuthorizationBanner";
import { TechnicalDetails } from "./TechnicalDetails";
import { getStatusLabel } from "../i18n";
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

const QUANTITY_CATEGORY_JA: Record<string, string> = {
  SUMMARY: "概要",
  MAIN_GIRDER: "主桁",
  CROSS_BEAM: "横桁",
  STIFFENER: "補剛材",
  SWAY_BRACING: "対傾構",
  LOWER_LATERAL_BRACING: "下横構",
  UPPER_LATERAL_BRACING: "上横構",
  RC_DECK: "RC床版",
  HAUNCH: "ハンチ",
  APPURTENANCE: "付属物",
  PAVEMENT: "舗装",
};

const QUANTITY_BASIS_JA: Record<string, string> = {
  EXACT_GEOMETRY_DEVELOPMENT: "正確な幾何（開発）",
  INCOMPLETE_INPUT: "入力不足",
  APPROXIMATE_DEVELOPMENT: "概算（開発）",
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
      <div data-testid="apollo-quantity-development-warning">
        <AuthorizationBanner
          testId="apollo-quantity-auth"
          keys={["UNVERIFIED_DEVELOPMENT_ONLY", "NOT_FOR_ESTIMATE", "NOT_GRANTED", "PROHIBITED"]}
        />
      </div>
      <p className="apollo-inline-hint" data-testid="apollo-quantity-development-provenance">
        状態: {model.stale ? getStatusLabel("STALE") : getStatusLabel("GENERATION_CURRENT")} / 認可表示: 正式認可なし
      </p>
      <TechnicalDetails
        testId="apollo-quantity-tech"
        lines={[
          `authorizationStatus=${model.authorizationStatus}`,
          `stale=${String(model.stale)}`,
          `revision=${model.inputRevision}`,
          `checksum=${model.inputChecksum.slice(0, 16)}…`,
        ]}
      />
      {liveStaleHint && model.stale ? (
        <p className="apollo-input-error" data-testid="apollo-quantity-stale-banner">
          要再計算 — 構造を再生成してから数量を再生成・出力してください。要再計算時の出力は拒否されます。
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
        生成時刻: {model.generatedAt}
      </p>
      <TechnicalDetails
        testId="apollo-quantity-generated-tech"
        title="数量モデル識別"
        lines={[`quantityModelId=${model.quantityModelId}`, `generatedAt=${model.generatedAt}`]}
      />
      <table className="apollo-detail-table" data-testid="apollo-quantity-model-table">
        <thead>
          <tr>
            <th>区分</th>
            <th>項目</th>
            <th>値</th>
            <th>単位</th>
            <th>状態</th>
            <th>根拠</th>
            <th>注意</th>
          </tr>
        </thead>
        <tbody>
          {model.items.map((entry) => (
            <tr key={entry.quantityId} data-testid={`apollo-qty-row-${entry.quantityId}`}>
              <td>{QUANTITY_CATEGORY_JA[entry.category] ?? entry.category}</td>
              <td>{entry.label}</td>
              <td data-testid={`apollo-qty-value-${entry.quantityId}`}>
                {entry.value === null ? "—" : entry.value}
              </td>
              <td>{entry.unit}</td>
              <td>{getStatusLabel(entry.status)}</td>
              <td>{QUANTITY_BASIS_JA[entry.calculationBasis] ?? entry.calculationBasis}</td>
              <td>{entry.warnings.join("; ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}
