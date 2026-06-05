import { Activity, Box, Grid3X3, LocateFixed, Move3D, Rotate3D, Tag, Target, Waves } from "lucide-react";
import type React from "react";
import type { CameraPreset, ViewerScales, ViewerVisibility } from "./types";

type ViewerControlsProps = {
  visibility: ViewerVisibility;
  scales: ViewerScales;
  loadCaseIds: string[];
  selectedLoadCaseId: string;
  eigenModeNos: number[];
  selectedEigenMode: number;
  hasResult: boolean;
  onVisibilityChange: (visibility: ViewerVisibility) => void;
  onScalesChange: (scales: ViewerScales) => void;
  onLoadCaseChange: (loadCaseId: string) => void;
  onEigenModeChange: (modeNo: number) => void;
  onFit: () => void;
  onCameraPreset: (preset: CameraPreset) => void;
};

export function ViewerControls({
  visibility,
  scales,
  loadCaseIds,
  selectedLoadCaseId,
  eigenModeNos,
  selectedEigenMode,
  hasResult,
  onVisibilityChange,
  onScalesChange,
  onLoadCaseChange,
  onEigenModeChange,
  onFit,
  onCameraPreset,
}: ViewerControlsProps) {
  const setFlag = (key: keyof ViewerVisibility, value: boolean) => {
    onVisibilityChange({ ...visibility, [key]: value });
  };
  const setScale = (key: keyof ViewerScales, value: number) => {
    if (Number.isFinite(value)) onScalesChange({ ...scales, [key]: value });
  };

  return (
    <div className="viewer-controls" aria-label="表示操作">
      <div className="viewer-control-row icon-row">
        <button type="button" title="モデル全体を表示" onClick={onFit}>
          <LocateFixed size={16} />
        </button>
        <button type="button" title="アイソメ表示" onClick={() => onCameraPreset("iso")}>
          <Box size={16} />
        </button>
        <button type="button" title="XY平面表示" onClick={() => onCameraPreset("xy")}>
          XY
        </button>
        <button type="button" title="YZ平面表示" onClick={() => onCameraPreset("yz")}>
          YZ
        </button>
        <button type="button" title="XZ平面表示" onClick={() => onCameraPreset("xz")}>
          XZ
        </button>
      </div>
      <div className="viewer-control-row">
        <label>
          <Target size={14} />
          <span>荷重ケース</span>
          <select value={selectedLoadCaseId} onChange={(event) => onLoadCaseChange(event.target.value)}>
            {loadCaseIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
      </div>
      {eigenModeNos.length > 0 && (
        <div className="viewer-control-row">
          <label>
            <Waves size={14} />
            <span>固有モード</span>
            <select value={selectedEigenMode} onChange={(event) => onEigenModeChange(Number(event.target.value))}>
              {eigenModeNos.map((modeNo) => (
                <option key={modeNo} value={modeNo}>
                  Mode {modeNo}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <div className="viewer-toggle-grid">
        <Toggle label="節点" checked={visibility.nodes} onChange={(value) => setFlag("nodes", value)} />
        <Toggle label="部材" checked={visibility.members} onChange={(value) => setFlag("members", value)} />
        <Toggle label="支点" checked={visibility.supports} onChange={(value) => setFlag("supports", value)} />
        <Toggle label="荷重" checked={visibility.loads} onChange={(value) => setFlag("loads", value)} />
        <Toggle label="ラベル" checked={visibility.labels} onChange={(value) => setFlag("labels", value)} />
        <Toggle label="グリッド" checked={visibility.grid} onChange={(value) => setFlag("grid", value)} icon={<Grid3X3 size={14} />} />
        <Toggle label="軸" checked={visibility.axes} onChange={(value) => setFlag("axes", value)} icon={<Move3D size={14} />} />
        <Toggle
          label="変形図"
          checked={visibility.deformedShape}
          disabled={!hasResult}
          onChange={(value) => setFlag("deformedShape", value)}
          icon={<Rotate3D size={14} />}
        />
        <Toggle
          label="反力図"
          checked={visibility.reactions}
          disabled={!hasResult}
          onChange={(value) => setFlag("reactions", value)}
          icon={<Activity size={14} />}
        />
        <Toggle
          label="軸力図"
          checked={visibility.axialForce}
          disabled={!hasResult}
          onChange={(value) => setFlag("axialForce", value)}
          icon={<Waves size={14} />}
        />
        <Toggle
          label="My図"
          checked={visibility.momentMy}
          disabled={!hasResult}
          onChange={(value) => setFlag("momentMy", value)}
        />
        <Toggle
          label="Mz図"
          checked={visibility.momentMz}
          disabled={!hasResult}
          onChange={(value) => setFlag("momentMz", value)}
        />
      </div>
      <div className="viewer-toggle-grid compact">
        <Toggle label="節点ID" checked={visibility.nodeLabels} onChange={(value) => setFlag("nodeLabels", value)} icon={<Tag size={14} />} />
        <Toggle label="部材ID" checked={visibility.memberLabels} onChange={(value) => setFlag("memberLabels", value)} icon={<Tag size={14} />} />
      </div>
      <div className="scale-grid">
        <ScaleInput
          label="荷重表示倍率"
          min={0.2}
          max={4}
          step={0.1}
          value={scales.loadScale}
          onChange={(value) => setScale("loadScale", value)}
        />
        <ScaleInput
          label="変形表示倍率"
          min={1}
          max={1000}
          step={1}
          value={scales.deformationScale}
          onChange={(value) => setScale("deformationScale", value)}
        />
        <ScaleInput
          label="結果図倍率"
          min={0.1}
          max={8}
          step={0.1}
          value={scales.resultScale}
          onChange={(value) => setScale("resultScale", value)}
        />
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  disabled,
  icon,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={disabled ? "viewer-toggle disabled" : "viewer-toggle"}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      {icon}
      <span>{label}</span>
    </label>
  );
}

function ScaleInput({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="scale-input">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </label>
  );
}
