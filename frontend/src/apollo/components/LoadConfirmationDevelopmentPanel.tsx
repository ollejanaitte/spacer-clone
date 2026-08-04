import { AuthorizationBanner } from "./AuthorizationBanner";
import { TechnicalDetails } from "./TechnicalDetails";
import { getStatusLabel } from "../i18n";
/**
 * Development load confirmation panel (Step 4-C4).
 * UNVERIFIED DEVELOPMENT ONLY — NOT FOR DESIGN OR CONSTRUCTION
 */
import { useMemo, useState } from "react";
import type { ProjectModel } from "../../types";
import {
  buildAppurtenanceHaunchLoadModel,
  loadModelToJson,
  type AppurtenanceHaunchLoadModel,
} from "../loads/appurtenanceHaunchLoadModel";

type Props = {
  readonly project: ProjectModel;
};

function downloadJson(model: AppurtenanceHaunchLoadModel): void {
  const blob = new Blob([loadModelToJson(model)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${model.loadModelId}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function LoadConfirmationDevelopmentPanel({ project }: Props) {
  const [model, setModel] = useState(() => buildAppurtenanceHaunchLoadModel(project));
  const live = useMemo(() => buildAppurtenanceHaunchLoadModel(project), [project]);

  const regenerate = () => setModel(buildAppurtenanceHaunchLoadModel(project));

  return (
    <article className="apollo-editor-card" data-testid="apollo-load-confirmation-panel">
      <div className="apollo-editor-card-header">
        <div>
          <h2>荷重確認（開発専用）</h2>
          <p>付属物・ハンチ死荷重の測点／線荷重／分配先を確認します。正式設計値ではありません。</p>
        </div>
      </div>
      <div data-testid="apollo-load-development-warning">
        <AuthorizationBanner testId="apollo-load-auth" />
      </div>
      <p className="apollo-inline-hint" data-testid="apollo-load-development-provenance">
        状態: {getStatusLabel(model.status)} / 荷重数: {model.loads.length}
      </p>
      <TechnicalDetails
        testId="apollo-load-tech"
        lines={[`status=${model.status}`, `stale=${String(model.stale)}`, `checksum=${model.inputChecksum.slice(0, 16)}…`]}
      />
      {(live.stale || model.stale) && (
        <p className="apollo-input-error" data-testid="apollo-load-stale-banner">
          要再計算 — 構造を再生成してから荷重を再確認してください。
        </p>
      )}
      {model.status === "INCOMPLETE" && (
        <p className="apollo-input-error" data-testid="apollo-load-incomplete-banner">
          単位体積重量不足の荷重があります。解析には含めません。
        </p>
      )}
      <div className="apollo-workspace-actions">
        <button type="button" className="apollo-button-secondary" data-testid="apollo-load-regenerate" onClick={regenerate}>
          荷重を再生成
        </button>
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-load-export-json"
          disabled={model.stale}
          onClick={() => downloadJson(model)}
        >
          JSON出力
        </button>
      </div>
      <div className="apollo-table-wrap" data-testid="apollo-load-table">
        <table>
          <thead>
            <tr>
              <th>荷重ID</th>
              <th>ケース</th>
              <th>測点</th>
              <th>w [kN/m]</th>
              <th>P [kN]</th>
              <th>分配則</th>
              <th>分配先</th>
              <th>状態</th>
            </tr>
          </thead>
          <tbody>
            {model.loads.length === 0 ? (
              <tr>
                <td colSpan={8}>「あり」の付属物／ハンチはありません（「なし」は偽エンティティを作りません）</td>
              </tr>
            ) : (
              model.loads.map((load) => (
                <tr key={load.loadId} data-testid={`apollo-load-row-${load.loadId}`}>
                  <td>{load.loadId}</td>
                  <td>{load.loadCaseId}</td>
                  <td>
                    {load.startStation}–{load.endStation}
                  </td>
                  <td>{load.lineLoadKNPerM ?? "—"}</td>
                  <td>{load.totalLoadKN ?? "—"}</td>
                  <td>{load.distributionRule}</td>
                  <td>
                    {load.targetGirderRefs
                      .map((t) => `${t.girderKey}:${t.share.toFixed(4)}`)
                      .join(", ")}
                  </td>
                  <td>{getStatusLabel(load.status)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}
