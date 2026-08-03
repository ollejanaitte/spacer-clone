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
          <p>付属物・ハンチ死荷重の station / 線荷重 / 分配先を確認します。正式設計値ではありません。</p>
        </div>
      </div>
      <p className="apollo-input-error" role="status" data-testid="apollo-load-development-warning">
        UNVERIFIED DEVELOPMENT LOAD — NOT FOR DESIGN OR CONSTRUCTION / NUMERIC_DESIGN_AUTHORIZATION:
        NOT_GRANTED
      </p>
      <p className="apollo-inline-hint" data-testid="apollo-load-development-provenance">
        status: {model.status} / stale: {String(model.stale)} / loads: {model.loads.length} /
        checksum: {model.inputChecksum.slice(0, 16)}…
      </p>
      {(live.stale || model.stale) && (
        <p className="apollo-input-error" data-testid="apollo-load-stale-banner">
          STALE — 構造を再生成してから荷重を再確認してください。
        </p>
      )}
      {model.status === "INCOMPLETE" && (
        <p className="apollo-input-error" data-testid="apollo-load-incomplete-banner">
          単位体積重量不足の荷重があります（NOT_AVAILABLE）。解析には渡しません。
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
              <th>loadId</th>
              <th>case</th>
              <th>station</th>
              <th>w [kN/m]</th>
              <th>P [kN]</th>
              <th>rule</th>
              <th>targets</th>
              <th>status</th>
            </tr>
          </thead>
          <tbody>
            {model.loads.length === 0 ? (
              <tr>
                <td colSpan={8}>PROVIDED 付属物/ハンチなし（EXPLICIT_NONE は偽エンティティを作りません）</td>
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
                  <td>{load.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}
