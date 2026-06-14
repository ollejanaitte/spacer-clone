import { useState } from "react";
import type { BridgeFemResponse, BridgeProject } from "../types";
import { generateFem } from "../api";
import { xPositionsFor } from "../BridgeWizardState";

type Props = {
  project: BridgeProject;
  onChange: (project: BridgeProject) => void;
  onGenerated: (result: BridgeFemResponse) => void;
  onSendToAnalysis: (result: BridgeFemResponse) => void;
};

export function Step6ModelGeneration({
  project,
  onChange,
  onGenerated,
  onSendToAnalysis,
}: Props) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<BridgeFemResponse | null>(null);
  const [runAnalysis, setRunAnalysis] = useState(false);

  const updateSettings = (patch: Partial<BridgeProject["generationSettings"]>) => {
    onChange({
      ...project,
      generationSettings: { ...project.generationSettings, ...patch },
    });
  };

  const handleGenerate = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await generateFem(project, runAnalysis);
      setLastResult(res);
      onGenerated(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  const xs = xPositionsFor(project.spans, project.generationSettings.mesh_division);
  const summary = lastResult?.summary;
  return (
    <div className="bw-step bw-step-gen">
      <h2>Step 6 / 6 FEMモデル生成</h2>
      <p className="bw-hint">メッシュ分割と密度を指定して、FEM モデルを生成します。</p>
      <div className="bw-grid">
        <label className="bw-field">
          <span>メッシュ分割数（支間あたり）</span>
          <input
            type="number"
            min={1}
            max={50}
            step={1}
            value={project.generationSettings.mesh_division}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              updateSettings({ mesh_division: Number.isFinite(v) ? Math.max(1, Math.min(50, v)) : 1 });
            }}
          />
        </label>
        <label className="bw-field">
          <span>メッシュ密度</span>
          <select
            value={project.generationSettings.mesh_density}
            onChange={(e) =>
              updateSettings({
                mesh_density: e.target.value as BridgeProject["generationSettings"]["mesh_density"],
              })
            }
          >
            <option value="coarse">coarse</option>
            <option value="standard">standard</option>
            <option value="fine">fine</option>
          </select>
        </label>
        <label className="bw-field">
          <span>生成と同時に解析も実行</span>
          <input
            type="checkbox"
            checked={runAnalysis}
            onChange={(e) => setRunAnalysis(e.target.checked)}
          />
        </label>
      </div>
      <div className="bw-info">
        <p>x 方向節点数: <strong>{xs.length}</strong></p>
        <p>橋長: <strong>{xs.length > 0 ? xs[xs.length - 1].toFixed(3) : "0.000"} m</strong></p>
      </div>
      <div className="bw-actions">
        <button
          type="button"
          className="bw-button-primary"
          disabled={running}
          onClick={handleGenerate}
        >
          {running ? "生成中..." : "モデル生成"}
        </button>
        {lastResult && (
          <button
            type="button"
            className="bw-button-secondary"
            onClick={() => onSendToAnalysis(lastResult)}
          >
            解析へ送る
          </button>
        )}
      </div>
      {error && <div className="bw-error">{error}</div>}
      {summary && (
        <div className="bw-result">
          <h3>生成結果</h3>
          <ul>
            <li>節点数: <strong>{summary.nodeCount}</strong></li>
            <li>部材数: <strong>{summary.memberCount}</strong></li>
            <li>支点数: <strong>{summary.supportCount}</strong></li>
            <li>荷重数: <strong>{summary.loadCount}</strong></li>
            <li>検証ステータス: <strong>{lastResult?.analysis ? lastResult.analysis.analysisSummary.status : "未解析"}</strong></li>
          </ul>
        </div>
      )}
    </div>
  );
}
