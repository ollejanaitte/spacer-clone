import { Box, Grid3X3, LocateFixed, Move3D, Rotate3D, Tag, Target } from "lucide-react";
import type React from "react";
import type { CameraPreset, ViewerScales, ViewerVisibility } from "./types";

type ViewerControlsProps = {
  visibility: ViewerVisibility;
  scales: ViewerScales;
  loadCaseIds: string[];
  selectedLoadCaseId: string;
  hasResult: boolean;
  onVisibilityChange: (visibility: ViewerVisibility) => void;
  onScalesChange: (scales: ViewerScales) => void;
  onLoadCaseChange: (loadCaseId: string) => void;
  onFit: () => void;
  onCameraPreset: (preset: CameraPreset) => void;
};

export function ViewerControls({
  visibility,
  scales,
  loadCaseIds,
  selectedLoadCaseId,
  hasResult,
  onVisibilityChange,
  onScalesChange,
  onLoadCaseChange,
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
    <div className="viewer-controls" aria-label="Viewer controls">
      <div className="viewer-control-row icon-row">
        <button type="button" title="Fit to model" onClick={onFit}>
          <LocateFixed size={16} />
        </button>
        <button type="button" title="Isometric view" onClick={() => onCameraPreset("iso")}>
          <Box size={16} />
        </button>
        <button type="button" title="XY view" onClick={() => onCameraPreset("xy")}>
          XY
        </button>
        <button type="button" title="YZ view" onClick={() => onCameraPreset("yz")}>
          YZ
        </button>
        <button type="button" title="XZ view" onClick={() => onCameraPreset("xz")}>
          XZ
        </button>
      </div>
      <div className="viewer-control-row">
        <label>
          <Target size={14} />
          <span>Load case</span>
          <select value={selectedLoadCaseId} onChange={(event) => onLoadCaseChange(event.target.value)}>
            {loadCaseIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="viewer-toggle-grid">
        <Toggle label="Nodes" checked={visibility.nodes} onChange={(value) => setFlag("nodes", value)} />
        <Toggle label="Members" checked={visibility.members} onChange={(value) => setFlag("members", value)} />
        <Toggle label="Supports" checked={visibility.supports} onChange={(value) => setFlag("supports", value)} />
        <Toggle label="Loads" checked={visibility.loads} onChange={(value) => setFlag("loads", value)} />
        <Toggle label="Labels" checked={visibility.labels} onChange={(value) => setFlag("labels", value)} />
        <Toggle label="Grid" checked={visibility.grid} onChange={(value) => setFlag("grid", value)} icon={<Grid3X3 size={14} />} />
        <Toggle label="Axes" checked={visibility.axes} onChange={(value) => setFlag("axes", value)} icon={<Move3D size={14} />} />
        <Toggle
          label="Deformed"
          checked={visibility.deformedShape}
          disabled={!hasResult}
          onChange={(value) => setFlag("deformedShape", value)}
          icon={<Rotate3D size={14} />}
        />
      </div>
      <div className="viewer-toggle-grid compact">
        <Toggle label="Node IDs" checked={visibility.nodeLabels} onChange={(value) => setFlag("nodeLabels", value)} icon={<Tag size={14} />} />
        <Toggle label="Member IDs" checked={visibility.memberLabels} onChange={(value) => setFlag("memberLabels", value)} icon={<Tag size={14} />} />
      </div>
      <div className="scale-grid">
        <ScaleInput
          label="Load scale"
          min={0.2}
          max={4}
          step={0.1}
          value={scales.loadScale}
          onChange={(value) => setScale("loadScale", value)}
        />
        <ScaleInput
          label="Def scale"
          min={1}
          max={1000}
          step={1}
          value={scales.deformationScale}
          onChange={(value) => setScale("deformationScale", value)}
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
