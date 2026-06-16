import { useState } from "react";
import { ja } from "../../i18n/ja";
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
      <h2>{ja.bridgeSteps.step6.title}</h2>
      <p className="bw-hint">{ja.bridgeSteps.step6.hint}</p>
      <div className="bw-grid">
        <label className="bw-field">
          <span>{ja.bridgeSteps.step6.meshDivision}</span>
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
          <span>{ja.bridgeSteps.step6.meshDensity}</span>
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
          <span>{ja.bridgeSteps.step6.runAnalysisAfterGen}</span>
          <input
            type="checkbox"
            checked={runAnalysis}
            onChange={(e) => setRunAnalysis(e.target.checked)}
          />
        </label>
      </div>
      <div className="bw-info">
        <p>{ja.bridgeSteps.step6.xNodeCount}: <strong>{xs.length}</strong></p>
        <p>{ja.bridgeSteps.step6.bridgeLength}: <strong>{ja.bridgeSteps.step6.bridgeLengthValue(xs.length > 0 ? xs[xs.length - 1].toFixed(3) : "0.000")}</strong></p>
      </div>
      <div className="bw-actions">
        <button
          type="button"
          className="bw-button-primary"
          disabled={running}
          onClick={handleGenerate}
        >
          {running ? ja.bridgeSteps.step6.generating : ja.bridgeSteps.step6.generate}
        </button>
        {lastResult && (
          <button
            type="button"
            className="bw-button-secondary"
            onClick={() => onSendToAnalysis(lastResult)}
          >
            {ja.bridgeSteps.step6.sendToAnalysis}
          </button>
        )}
      </div>
      {error && <div className="bw-error">{ja.bridgeSteps.step6.error}: {error}</div>}
      {summary && (
        <div className="bw-result">
          <h3>{ja.bridgeSteps.step6.generationResult}</h3>
          <ul>
            <li>{ja.bridgeSteps.step6.resultNodeCount}: <strong>{summary.nodeCount}</strong></li>
            <li>{ja.bridgeSteps.step6.resultMemberCount}: <strong>{summary.memberCount}</strong></li>
            <li>{ja.bridgeSteps.step6.resultSupportCount}: <strong>{summary.supportCount}</strong></li>
            <li>{ja.bridgeSteps.step6.resultLoadCount}: <strong>{summary.loadCount}</strong></li>
            <li>{ja.bridgeSteps.step6.validationStatus}: <strong>{lastResult?.analysis ? lastResult.analysis.analysisSummary.status : ja.bridgeSteps.step6.notAnalyzed}</strong></li>
          </ul>
        </div>
      )}
    </div>
  );
}
