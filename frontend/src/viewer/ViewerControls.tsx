﻿import { Activity, Box, Grid3X3, LocateFixed, Move3D, Rotate3D, Tag, Target, Waves } from "lucide-react";
import { ja } from "../i18n/ja";
import type React from "react";
import type { ResponseSpectrumSelection } from "../results/resultViewModel";
import type { CameraPreset, ViewerScales, ViewerVisibility } from "./types";
import type { SpacerAxisSwap } from "./coordinateTransform";
import type { AnimationOptions } from "./animation";
import {
  clampViewerDisplaySize,
  DEFAULT_VIEWER_DISPLAY_SIZE,
  VIEWER_DISPLAY_SIZE_RANGES,
  type ViewerDisplaySizeSettings,
} from "./settings/displaySize";
import type { ForceColorComponent, ForceColorValueType } from "./memberForceColorMap";
import { FORCE_COLOR_COMPONENTS, FORCE_COLOR_COMPONENT_LABELS, FORCE_COLOR_VALUE_TYPE_LABELS } from "./memberForceColorMap";

type ViewerControlsProps = {
  visibility: ViewerVisibility;
  scales: ViewerScales;
  displaySize?: ViewerDisplaySizeSettings;
  loadCaseIds: string[];
  selectedLoadCaseId: string;
  eigenModeNos: number[];
  selectedEigenMode: number;
  responseSpectrumOptions: Array<{ key: ResponseSpectrumSelection; label: string }>;
  selectedResponseSpectrumResult: ResponseSpectrumSelection;
  hasResult: boolean;
  spacerAxisSwap: SpacerAxisSwap;
  animationOptions: AnimationOptions;
  compareMode: boolean;
  cameraSync: boolean;
  forceColorMap: boolean;
  forceColorComponent: ForceColorComponent;
  forceColorValueType: ForceColorValueType;
  onVisibilityChange: (visibility: ViewerVisibility) => void;
  onScalesChange: (scales: ViewerScales) => void;
  onDisplaySizeChange?: (settings: ViewerDisplaySizeSettings) => void;
  onDisplaySizeReset?: () => void;
  onLoadCaseChange: (loadCaseId: string) => void;
  onEigenModeChange: (modeNo: number) => void;
  onResponseSpectrumResultChange: (resultKey: ResponseSpectrumSelection) => void;
  onSpacerAxisSwapChange: (swap: SpacerAxisSwap) => void;
  onAnimationOptionsChange: (options: AnimationOptions) => void;
  onCompareModeChange: (next: boolean) => void;
  onCameraSyncChange: (next: boolean) => void;
  onForceColorMapChange: (enabled: boolean) => void;
  onForceColorComponentChange: (component: ForceColorComponent) => void;
  onForceColorValueTypeChange: (valueType: ForceColorValueType) => void;
  onFit: () => void;
  onCameraPreset: (preset: CameraPreset) => void;
};

export function ViewerControls({
  visibility,
  scales,
  displaySize = DEFAULT_VIEWER_DISPLAY_SIZE,
  loadCaseIds,
  selectedLoadCaseId,
  eigenModeNos,
  selectedEigenMode,
  responseSpectrumOptions,
  selectedResponseSpectrumResult,
  hasResult,
  spacerAxisSwap,
  animationOptions,
  compareMode,
  cameraSync,
  forceColorMap,
  forceColorComponent,
  forceColorValueType,
  onVisibilityChange,
  onScalesChange,
  onDisplaySizeChange = () => undefined,
  onDisplaySizeReset = () => undefined,
  onLoadCaseChange,
  onEigenModeChange,
  onResponseSpectrumResultChange,
  onSpacerAxisSwapChange,
  onAnimationOptionsChange,
  onCompareModeChange,
  onCameraSyncChange,
  onForceColorMapChange,
  onForceColorComponentChange,
  onForceColorValueTypeChange,
  onFit,
  onCameraPreset,
}: ViewerControlsProps) {
  const setFlag = (key: keyof ViewerVisibility, value: boolean) => {
    onVisibilityChange({ ...visibility, [key]: value });
  };
  const setScale = (key: keyof ViewerScales, value: number) => {
    if (Number.isFinite(value)) onScalesChange({ ...scales, [key]: value });
  };
  const updateAnimation = (patch: Partial<AnimationOptions>) => {
    onAnimationOptionsChange({ ...animationOptions, ...patch });
  };
  const availableModeNumbers = eigenModeNos.length > 0 ? eigenModeNos : [1, 2, 3];
  const setDisplaySize = (key: keyof ViewerDisplaySizeSettings, value: number) => {
    onDisplaySizeChange({ ...displaySize, [key]: clampViewerDisplaySize(key, value) });
  };

  return (
    <div className="viewer-controls" aria-label={ja.viewer.controls.ariaLabel}>
      <ControlGroup title={ja.viewer.controls.view}>
        <div className="viewer-control-row icon-row">
          <button type="button" title={ja.viewer.controls.viewFit} data-testid="view-fit" onClick={onFit}>
            <LocateFixed size={16} />
          </button>
          <button type="button" title={ja.viewer.controls.viewIso} data-testid="view-iso" onClick={() => onCameraPreset("iso")}>
            <Box size={16} />
          </button>
          <button type="button" title={ja.viewer.controls.viewXy} data-testid="view-xy" onClick={() => onCameraPreset("xy")}>
            XY
          </button>
          <button type="button" title={ja.viewer.controls.viewYz} data-testid="view-yz" onClick={() => onCameraPreset("yz")}>
            YZ
          </button>
          <button type="button" title={ja.viewer.controls.viewXz} data-testid="view-xz" onClick={() => onCameraPreset("xz")}>
            XZ
          </button>
        </div>
      </ControlGroup>
      <ControlGroup title={ja.viewer.controls.compare}>
        <div className="viewer-control-row">
          <label className="viewer-toggle">
            <input
              type="checkbox"
              data-testid="compare-view-toggle"
              checked={compareMode}
              onChange={(event) => onCompareModeChange(event.currentTarget.checked)}
            />
            <span>{ja.viewer.controls.compareView}</span>
          </label>
        </div>
        <div className="viewer-control-row">
          <label className="viewer-toggle">
            <input
              type="checkbox"
              data-testid="camera-sync-toggle"
              checked={cameraSync}
              onChange={(event) => onCameraSyncChange(event.currentTarget.checked)}
            />
            <span>{ja.viewer.controls.cameraSync}</span>
          </label>
        </div>
      </ControlGroup>
      <ControlGroup title={ja.viewer.controls.animation}>
        <div className="viewer-control-row">
          <label className="viewer-toggle">
            <input
              type="checkbox"
              data-testid="animation-toggle"
              checked={animationOptions.enabled}
              onChange={(event) => updateAnimation({ enabled: event.currentTarget.checked })}
            />
            <span>{ja.viewer.controls.animationLabel}</span>
          </label>
          <label className="viewer-toggle">
            <input
              type="checkbox"
              data-testid="animation-demo-toggle"
              checked={animationOptions.useDemo}
              onChange={(event) => updateAnimation({ useDemo: event.currentTarget.checked })}
            />
            <span>{ja.viewer.controls.animationDemo}</span>
          </label>
        </div>
        <div className="viewer-control-row">
          <label>
            <Waves size={14} />
            <span>{ja.viewer.controls.animationMode}</span>
            <select
              data-testid="animation-mode"
              value={String(animationOptions.modeNo)}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (Number.isFinite(next)) updateAnimation({ modeNo: next });
              }}
            >
              {availableModeNumbers.map((modeNo) => (
                <option key={modeNo} value={modeNo}>
                  Mode {modeNo}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="viewer-control-row">
          <label>
            <span>{ja.viewer.controls.animationDirection}</span>
            <select
              data-testid="animation-direction"
              value={animationOptions.demoDirection}
              onChange={(event) => {
                const value = event.target.value;
                if (value === "longitudinal" || value === "transverse") {
                  updateAnimation({ demoDirection: value });
                }
              }}
            >
              <option value="longitudinal">{ja.viewer.controls.animationDirectionX}</option>
              <option value="transverse">{ja.viewer.controls.animationDirectionZ}</option>
            </select>
          </label>
        </div>
        <div className="viewer-control-row">
          <label className="scale-input">
            <span>{ja.viewer.controls.animationDeformationScale}</span>
            <input
              type="range"
              data-testid="animation-scale"
              min={0.1}
              max={10}
              step={0.1}
              value={animationOptions.scale}
              onChange={(event) => {
                const next = Number(event.currentTarget.value);
                if (Number.isFinite(next)) updateAnimation({ scale: next });
              }}
            />
            <input
              type="number"
              min={0.1}
              max={10}
              step={0.1}
              value={animationOptions.scale}
              onChange={(event) => {
                const next = Number(event.currentTarget.value);
                if (Number.isFinite(next)) updateAnimation({ scale: next });
              }}
            />
          </label>
        </div>
        <div className="viewer-control-row">
          <label className="scale-input">
            <span>{ja.viewer.controls.animationSpeed}</span>
            <input
              type="range"
              data-testid="animation-speed"
              min={0.1}
              max={5}
              step={0.1}
              value={animationOptions.speed}
              onChange={(event) => {
                const next = Number(event.currentTarget.value);
                if (Number.isFinite(next)) updateAnimation({ speed: next });
              }}
            />
            <input
              type="number"
              min={0.1}
              max={5}
              step={0.1}
              value={animationOptions.speed}
              onChange={(event) => {
                const next = Number(event.currentTarget.value);
                if (Number.isFinite(next)) updateAnimation({ speed: next });
              }}
            />
          </label>
        </div>
      </ControlGroup>
      <ControlGroup title={ja.viewer.controls.coordinate}>
        <div className="viewer-control-row">
          <label className="viewer-toggle">
            <input
              type="checkbox"
              data-testid="spacer-axis-swap-toggle"
              checked={spacerAxisSwap === "on"}
              onChange={(event) => onSpacerAxisSwapChange(event.currentTarget.checked ? "on" : "off")}
            />
            <span>{ja.viewer.controls.spacerAxisSwap}</span>
          </label>
        </div>
      </ControlGroup>
      <ControlGroup title={ja.viewer.controls.analysisResults}>
        <div className="viewer-control-row">
          <label>
            <Target size={14} />
            <span>{ja.viewer.controls.loadCaseLabel}</span>
            <select value={selectedLoadCaseId} onChange={(event) => onLoadCaseChange(event.target.value)}>
              {loadCaseIds.map((id) => (
                <option key={id} value={id}>
                  {id || ja.viewer.controls.loadCaseAll}
                </option>
              ))}
            </select>
          </label>
        </div>
        {eigenModeNos.length > 0 && (
          <div className="viewer-control-row">
            <label>
              <Waves size={14} />
              <span>{ja.viewer.controls.eigenMode}</span>
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
        {responseSpectrumOptions.length > 0 && (
          <div className="viewer-control-row">
            <label>
              <Waves size={14} />
              <span>{ja.viewer.controls.responseDisplay}</span>
              <select
                value={selectedResponseSpectrumResult}
                onChange={(event) => onResponseSpectrumResultChange(event.target.value as ResponseSpectrumSelection)}
              >
                {responseSpectrumOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </ControlGroup>
      <ControlGroup title={ja.viewer.controls.visibility}>
        <div className="viewer-toggle-grid">
          <Toggle label={ja.viewer.controls.node} checked={visibility.nodes} onChange={(value) => setFlag("nodes", value)} />
          <Toggle label={ja.viewer.controls.member} checked={visibility.members} onChange={(value) => setFlag("members", value)} />
          <Toggle label={ja.viewer.controls.support} checked={visibility.supports} onChange={(value) => setFlag("supports", value)} />
          <Toggle label={ja.viewer.controls.load} checked={visibility.loads} onChange={(value) => setFlag("loads", value)} />
          <Toggle label={ja.viewer.controls.label} checked={visibility.labels} onChange={(value) => setFlag("labels", value)} />
          <Toggle label={ja.viewer.controls.grid} checked={visibility.grid} onChange={(value) => setFlag("grid", value)} icon={<Grid3X3 size={14} />} />
          <Toggle label={ja.viewer.controls.axis} checked={visibility.axes} onChange={(value) => setFlag("axes", value)} icon={<Move3D size={14} />} />
        </div>
        <div className="viewer-toggle-grid compact">
          <Toggle label={ja.viewer.controls.nodeId} checked={visibility.nodeLabels} onChange={(value) => setFlag("nodeLabels", value)} icon={<Tag size={14} />} />
          <Toggle label={ja.viewer.controls.memberId} checked={visibility.memberLabels} onChange={(value) => setFlag("memberLabels", value)} icon={<Tag size={14} />} />
        </div>
      </ControlGroup>
      <ControlGroup title={ja.viewer.controls.resultDiagrams}>
        <div className="viewer-toggle-grid">
          <Toggle
            label={ja.viewer.controls.deformedShape}
            checked={visibility.deformedShape}
            disabled={!hasResult}
            onChange={(value) => setFlag("deformedShape", value)}
            icon={<Rotate3D size={14} />}
          />
          <Toggle
            label={ja.viewer.controls.reaction}
            checked={visibility.reactions}
            disabled={!hasResult}
            onChange={(value) => setFlag("reactions", value)}
            icon={<Activity size={14} />}
          />
          <Toggle
            label={ja.viewer.controls.axialForce}
            checked={visibility.axialForce}
            disabled={!hasResult}
            onChange={(value) => setFlag("axialForce", value)}
            icon={<Waves size={14} />}
          />
          <Toggle
            label={ja.viewer.controls.my}
            checked={visibility.momentMy}
            disabled={!hasResult}
            onChange={(value) => setFlag("momentMy", value)}
          />
          <Toggle
            label={ja.viewer.controls.mz}
            checked={visibility.momentMz}
            disabled={!hasResult}
            onChange={(value) => setFlag("momentMz", value)}
          />
        </div>
      </ControlGroup>
      <ControlGroup title={ja.viewer.controls.scales}>
        <div className="scale-grid">
          <ScaleInput
            label={ja.viewer.controls.loadScale}
            min={0.2}
            max={4}
            step={0.1}
            value={scales.loadScale}
            onChange={(value) => setScale("loadScale", value)}
          />
          <ScaleInput
            label={ja.viewer.controls.deformationScale}
            min={1}
            max={1000}
            step={1}
            value={scales.deformationScale}
            onChange={(value) => setScale("deformationScale", value)}
          />
          {eigenModeNos.length > 0 && (
            <ScaleInput
              label={ja.viewer.controls.modeScale}
              min={0.05}
              max={20}
              step={0.05}
              value={scales.modeScale}
              onChange={(value) => setScale("modeScale", value)}
            />
          )}
          <ScaleInput
            label={ja.viewer.controls.resultScale}
            min={0.1}
            max={8}
            step={0.1}
            value={scales.resultScale}
            onChange={(value) => setScale("resultScale", value)}
          />
        </div>
      </ControlGroup>
      <ControlGroup title="反力表示">
        <div className="viewer-toggle-grid">
          <Toggle
            label="数値ラベル"
            checked={Boolean(visibility.reactionLabels)}
            disabled={!hasResult}
            onChange={(value) => setFlag("reactionLabels", value)}
          />
          <Toggle label="RFX" checked={visibility.reactionLabelFx !== false} onChange={(value) => setFlag("reactionLabelFx", value)} />
          <Toggle label="RFY" checked={visibility.reactionLabelFy !== false} onChange={(value) => setFlag("reactionLabelFy", value)} />
          <Toggle label="RFZ" checked={visibility.reactionLabelFz !== false} onChange={(value) => setFlag("reactionLabelFz", value)} />
          <Toggle label="RMX" checked={Boolean(visibility.reactionLabelMx)} onChange={(value) => setFlag("reactionLabelMx", value)} />
          <Toggle label="RMY" checked={Boolean(visibility.reactionLabelMy)} onChange={(value) => setFlag("reactionLabelMy", value)} />
          <Toggle label="RMZ" checked={Boolean(visibility.reactionLabelMz)} onChange={(value) => setFlag("reactionLabelMz", value)} />
        </div>
      </ControlGroup>
      <ControlGroup title="断面力表示">
        <div className="viewer-toggle-grid">
          <Toggle
            label="部材端値ラベル"
            checked={Boolean(visibility.memberForceLabels || visibility.axialForceLabels)}
            disabled={!hasResult}
            onChange={(value) => setFlag("memberForceLabels", value)}
          />
          <Toggle label="FX" checked={visibility.memberForceLabelFx !== false} disabled={!hasResult} onChange={(value) => setFlag("memberForceLabelFx", value)} />
          <Toggle label="FY" checked={Boolean(visibility.memberForceLabelFy)} disabled={!hasResult} onChange={(value) => setFlag("memberForceLabelFy", value)} />
          <Toggle label="FZ" checked={Boolean(visibility.memberForceLabelFz)} disabled={!hasResult} onChange={(value) => setFlag("memberForceLabelFz", value)} />
          <Toggle label="MX" checked={Boolean(visibility.memberForceLabelMx)} disabled={!hasResult} onChange={(value) => setFlag("memberForceLabelMx", value)} />
          <Toggle label="MY" checked={Boolean(visibility.memberForceLabelMy)} disabled={!hasResult} onChange={(value) => setFlag("memberForceLabelMy", value)} />
          <Toggle label="MZ" checked={Boolean(visibility.memberForceLabelMz)} disabled={!hasResult} onChange={(value) => setFlag("memberForceLabelMz", value)} />
        </div>
        <p className="viewer-result-legend">
          凡例: RFX/RFY/RFZは全体座標系の反力、RMX/RMY/RMZは全体座標系の反力モーメント。部材端FX/FY/FZ/MX/MY/MZは部材ローカル座標系の断面力で、SPACER座標系表示ON時も符号・成分名は解析結果の部材座標系のまま表示。
        </p>
      </ControlGroup>
      <ControlGroup title="断面力カラーマップ">
        <div className="viewer-toggle-grid">
          <Toggle
            label="カラーマップ表示"
            checked={forceColorMap}
            disabled={!hasResult}
            onChange={(value) => onForceColorMapChange(value)}
          />
        </div>
        {forceColorMap && (
          <>
            <div className="viewer-control-row">
              <label>
                <span>表示成分</span>
                <select
                  data-testid="force-color-component"
                  value={forceColorComponent}
                  onChange={(event) => onForceColorComponentChange(event.currentTarget.value as ForceColorComponent)}
                >
                  {FORCE_COLOR_COMPONENTS.map((comp) => (
                    <option key={comp} value={comp}>
                      {FORCE_COLOR_COMPONENT_LABELS[comp]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="viewer-control-row">
              <label>
                <span>表示対象</span>
                <select
                  data-testid="force-color-value-type"
                  value={forceColorValueType}
                  onChange={(event) => onForceColorValueTypeChange(event.currentTarget.value as ForceColorValueType)}
                >
                  {(["max", "min", "absMax"] as ForceColorValueType[]).map((vt) => (
                    <option key={vt} value={vt}>
                      {FORCE_COLOR_VALUE_TYPE_LABELS[vt]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <ForceColorLegend />
          </>
        )}
      </ControlGroup>
      <ControlGroup title="表示サイズ">
        <div className="scale-grid">
          {([
            ["nodeSize", "節点サイズ"],
            ["supportSize", "支点サイズ"],
            ["loadArrowSize", "荷重矢印サイズ"],
            ["labelSize", "ラベルサイズ"],
            ["memberLineWidth", "部材線幅"],
          ] as const).map(([key, label]) => (
            <DisplaySizeInput
              key={key}
              label={label}
              value={displaySize[key]}
              min={VIEWER_DISPLAY_SIZE_RANGES[key].min}
              max={VIEWER_DISPLAY_SIZE_RANGES[key].max}
              unit={key === "nodeSize" || key === "memberLineWidth" ? "px" : ""}
              onChange={(value) => setDisplaySize(key, value)}
            />
          ))}
          <button type="button" className="viewer-size-reset" onClick={onDisplaySizeReset}>
            表示サイズをリセット
          </button>
        </div>
      </ControlGroup>
    </div>
  );
}

function DisplaySizeInput({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  const step = unit === "px" ? 1 : 0.1;
  return (
    <div className="display-size-input">
      <span>{label}: {value}{unit}</span>
      <button type="button" aria-label={`${label}を小さく`} onClick={() => onChange(value - step)}>-</button>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
      <button type="button" aria-label={`${label}を大きく`} onClick={() => onChange(value + step)}>+</button>
      <input
        aria-label={`${label}数値`}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </div>
  );
}

function ControlGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="viewer-control-group">
      <h3>{title}</h3>
      {children}
    </section>
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

function ForceColorLegend() {
  const stops = [
    { color: "#1a56db", label: "小" },
    { color: "#22c55e", label: "" },
    { color: "#ebc72e", label: "中" },
    { color: "#f57a1a", label: "" },
    { color: "#dc2626", label: "大" },
  ];
  return (
    <div className="force-color-legend">
      <div className="force-color-bar">
        {stops.map((stop, i) => (
          <div
            key={i}
            className="force-color-stop"
            style={{ background: stop.color }}
            title={stop.label || undefined}
          />
        ))}
      </div>
      <div className="force-color-labels">
        <span>小</span>
        <span>中</span>
        <span>大</span>
      </div>
    </div>
  );
}
