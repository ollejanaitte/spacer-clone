import type { BridgeProject, CrossSection } from "../types";
import { yPositionsFor } from "../BridgeWizardState";

type Props = {
  project: BridgeProject;
  onChange: (project: BridgeProject) => void;
};

function updateCross(
  project: BridgeProject,
  patch: Partial<CrossSection>,
): BridgeProject {
  return { ...project, crossSection: { ...project.crossSection, ...patch } };
}

function Field(props: {
  label: string;
  unit: string;
  value: number;
  step?: number;
  min?: number;
  max?: number;
  integer?: boolean;
  onChange: (n: number) => void;
}) {
  return (
    <label className="bw-field">
      <span>
        {props.label} <small>({props.unit})</small>
      </span>
      <input
        type="number"
        value={Number.isFinite(props.value) ? props.value : 0}
        step={props.step ?? 0.1}
        min={props.min}
        max={props.max}
        onChange={(e) => {
          const v = props.integer
            ? parseInt(e.target.value, 10)
            : parseFloat(e.target.value);
          props.onChange(Number.isFinite(v) ? v : 0);
        }}
      />
    </label>
  );
}

export function Step1RoadCondition({ project, onChange }: Props) {
  const cross = project.crossSection;
  const ys = yPositionsFor(cross);
  return (
    <div className="bw-step bw-step-road">
      <h2>Step 1 / 6 道路条件</h2>
      <p className="bw-hint">
        橋梁の横断構成を入力してください。主桁候補 y 座標が自動で計算されます。
      </p>
      <div className="bw-grid">
        <Field
          label="車線数"
          unit="lane"
          value={cross.lane_count}
          integer
          min={1}
          max={6}
          onChange={(v) => onChange(updateCross(project, { lane_count: Math.max(1, Math.min(6, v)) }))}
        />
        <Field
          label="車線幅"
          unit="m"
          value={cross.lane_width}
          step={0.1}
          min={0.1}
          onChange={(v) => onChange(updateCross(project, { lane_width: Math.max(0.1, v) }))}
        />
        <Field
          label="中央分離帯幅"
          unit="m"
          value={cross.median_width}
          step={0.1}
          min={0}
          onChange={(v) => onChange(updateCross(project, { median_width: Math.max(0, v) }))}
        />
        <Field
          label="歩道幅"
          unit="m"
          value={cross.sidewalk_width}
          step={0.1}
          min={0}
          onChange={(v) => onChange(updateCross(project, { sidewalk_width: Math.max(0, v) }))}
        />
        <Field
          label="高欄幅"
          unit="m"
          value={cross.barrier_width}
          step={0.05}
          min={0}
          onChange={(v) => onChange(updateCross(project, { barrier_width: Math.max(0, v) }))}
        />
      </div>
      <div className="bw-preview">
        <h3>横断プレビュー（y 座標の概算）</h3>
        <pre>{ys.map((y) => y.toFixed(3)).join(" m\n") + " m"}</pre>
        <small>左端が高欄外端、末尾が右端。中央 0 が道路中心です。</small>
      </div>
    </div>
  );
}
