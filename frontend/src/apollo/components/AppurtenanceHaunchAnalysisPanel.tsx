/**
 * Development panel: appurtenance/haunch analysis hookup (Step 4-C5).
 */
import { useMemo, useState } from "react";
import type { ProjectModel } from "../../types";
import {
  analysisResultToJson,
  runAppurtenanceHaunchAnalysis,
  type AppurtenanceHaunchAnalysisResult,
} from "../analysis/appurtenanceHaunchAnalysisAdapter";

type Props = {
  readonly project: ProjectModel;
};

function download(result: AppurtenanceHaunchAnalysisResult): void {
  const blob = new Blob([analysisResultToJson(result)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `analysis-app-haunch-${result.inputChecksum.slice(0, 12)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AppurtenanceHaunchAnalysisPanel({ project }: Props) {
  const [result, setResult] = useState(() => runAppurtenanceHaunchAnalysis(project));
  const live = useMemo(() => runAppurtenanceHaunchAnalysis(project), [project]);

  return (
    <article className="apollo-editor-card" data-testid="apollo-app-haunch-analysis-panel">
      <div className="apollo-editor-card-header">
        <div>
          <h2>付属物・ハンチ解析接続（開発専用）</h2>
          <p>部分区間UDLを閉形式単純梁で評価。全長UDLへの黙った変換はしません。</p>
        </div>
      </div>
      <p className="apollo-input-error" role="status">
        UNVERIFIED DEVELOPMENT ANALYSIS — NOT FOR DESIGN OR CONSTRUCTION / NOT_GRANTED
      </p>
      <p className="apollo-inline-hint" data-testid="apollo-app-haunch-analysis-status">
        status: {result.status} / stale: {String(result.stale)} / applied:{" "}
        {result.combined.totalAppliedVerticalKN.toFixed(6)} kN / residual:{" "}
        {result.combined.equilibriumResidualKN.toExponential(3)}
      </p>
      {(live.stale || result.stale) && (
        <p className="apollo-input-error">STALE — 構造再生成後に再実行してください。</p>
      )}
      {result.status === "BLOCKED" && (
        <p className="apollo-input-error" data-testid="apollo-app-haunch-analysis-blocked">
          BLOCKED/INCOMPLETE — 単位重量不足などで解析接続できません。
        </p>
      )}
      <div className="apollo-workspace-actions">
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-app-haunch-analysis-run"
          onClick={() => setResult(runAppurtenanceHaunchAnalysis(project))}
        >
          解析接続を再実行
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          disabled={result.stale || result.status === "BLOCKED"}
          onClick={() => download(result)}
        >
          JSON出力
        </button>
      </div>
      <ul data-testid="apollo-app-haunch-analysis-trace">
        {result.sourceLoadTrace.map((entry) => (
          <li key={entry.loadId}>
            {entry.loadId}: {entry.startStation}–{entry.endStation} m / {entry.totalLoadKN} kN /{" "}
            {entry.distributionRule}
          </li>
        ))}
      </ul>
    </article>
  );
}
