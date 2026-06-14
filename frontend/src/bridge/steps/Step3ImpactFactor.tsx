import type { BridgeProject, ImpactFactor } from "../types";
import { computeImpactFactor } from "../BridgeWizardState";

type Props = {
  project: BridgeProject;
  onChange: (project: BridgeProject) => void;
};

function updateImpact(
  project: BridgeProject,
  patch: Partial<ImpactFactor>,
): BridgeProject {
  return { ...project, impactFactor: { ...project.impactFactor, ...patch } };
}

export function Step3ImpactFactor({ project, onChange }: Props) {
  const autoValue = computeImpactFactor(project.spans.map((s) => s.length));
  const formula = `i = min(0.3, 20 / (50 + L_max)) = ${autoValue.toFixed(3)}`;
  const impact = project.impactFactor;
  return (
    <div className="bw-step bw-step-impact">
      <h2>Step 3 / 6 衝撃係数</h2>
      <p className="bw-hint">
        衝撃係数は自動計算が推奨です。自動 ON の場合、橋長に応じて下式で自動算出されます（MVP 簡略式）。
      </p>
      <div className="bw-grid">
        <label className="bw-field">
          <span>自動計算</span>
          <input
            type="checkbox"
            checked={impact.auto}
            onChange={(e) => {
              const checked = e.target.checked;
              const next: ImpactFactor = { ...impact, auto: checked };
              if (checked) {
                next.value = autoValue;
                next.formula = formula;
              }
              onChange(updateImpact(project, next));
            }}
          />
        </label>
        <label className="bw-field">
          <span>
            衝撃係数 i <small>(-)</small>
          </span>
          <input
            type="number"
            step={0.01}
            min={0}
            max={1}
            disabled={impact.auto}
            value={impact.auto ? autoValue : impact.value}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              onChange(
                updateImpact(project, {
                  value: Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0,
                }),
              );
            }}
          />
        </label>
      </div>
      <div className="bw-info">
        <p>式（MVP）: <code>i = min(0.3, 20 / (50 + L_max))</code></p>
        <p>現在の L_max: {Math.max(0, ...project.spans.map((s) => s.length)).toFixed(2)} m</p>
        <p>算出値: <strong>{autoValue.toFixed(3)}</strong></p>
        <small>※ 道路橋示方書の正式式とは断定しません。MVP 簡略式として設計書に明記し、後続で正式式に差し替え可能。</small>
      </div>
    </div>
  );
}
