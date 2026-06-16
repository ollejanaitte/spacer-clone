import { ja } from "../../i18n/ja";
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
      <h2>{ja.bridgeSteps.step3.title}</h2>
      <p className="bw-hint">
        {ja.bridgeSteps.step3.hint}
      </p>
      <div className="bw-grid">
        <label className="bw-field">
          <span>{ja.bridgeSteps.step3.autoCompute}</span>
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
          <span>{ja.bridgeSteps.step3.impactFactor} <small>(-)</small></span>
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
        <p>{ja.bridgeSteps.step3.formula}</p>
        <p>{ja.bridgeSteps.step3.currentLmax(Math.max(0, ...project.spans.map((s) => s.length)).toFixed(2))}</p>
        <p>{ja.bridgeSteps.step3.computedValue(autoValue.toFixed(3))}</p>
        <small>{ja.bridgeSteps.step3.note}</small>
      </div>
    </div>
  );
}
