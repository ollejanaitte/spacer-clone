import { useState } from "react";
import { ja } from "../../i18n/ja";
import type { TimeHistoryResult } from "../../types";
import {
  ALLOWED_TIME_HISTORY_ANIMATION_SPEEDS,
  clampTimeIndex,
  type TimeHistoryDisplacementMode,
} from "../timeHistoryAnimation";
import { useTimeHistoryAnimation } from "../TimeHistoryAnimationContext";
import { isXyzAnimationAvailable } from "./wizardState";

const SCALE_PRESETS: readonly number[] = [1, 5, 10, 20, 50];

type TimeHistoryAnimationControlsPanelProps = {
  result: TimeHistoryResult | null | undefined;
};

/**
 * Companion controls for the embedded Time History animation
 * viewer. The component reads from the surrounding animation
 * provider (the same one driving the viewer) and exposes the
 * play/pause/slider/mode/scale controls the user needs to
 * inspect the deformation.
 *
 * The component is display-only: it never mutates the project
 * payload, the analysis result, or the API contract. The
 * XYZ-combined mode is disabled when the active result does
 * not contain all three translational components.
 */
export function TimeHistoryAnimationControlsPanel({ result }: TimeHistoryAnimationControlsPanelProps) {
  const labels = ja.timeHistoryWizard.animation;
  const ctx = useTimeHistoryAnimation();
  const availability = isXyzAnimationAvailable(result);
  const isDisabled = !ctx.enabled;
  const hasSamples = ctx.sampleCount > 0;
  const currentIndex = clampTimeIndex(ctx.currentTimeIndex, ctx.sampleCount);
  const [scaleMode, setScaleMode] = useState<"preset" | "custom">("preset");
  const [customScale, setCustomScale] = useState<number>(ctx.displacementScale);
  if (!hasSamples) {
    return (
      <section className="result-table time-history-animation-controls-panel" aria-label={labels.heading}>
        <h3>{labels.heading}</h3>
        <div className="empty-state">{labels.disabledNoResult}</div>
      </section>
    );
  }
  const timeStep = result?.meta?.timeStep ?? 0;
  const currentTime = (currentIndex * timeStep).toFixed(3);
  const stepLabel = labels.stepLabel({ index: currentIndex, total: ctx.sampleCount });
  const timeText = labels.timeLabel({ time: currentTime, index: currentIndex, total: ctx.sampleCount });
  const maxAbsValueText = ctx.maxAbsValue.toFixed(4);
  const maxAbsTimeText = (ctx.maxAbsTimeSeconds).toFixed(3);
  const currentValueText = ctx.currentValue.toFixed(4);
  const handleScalePreset = (scale: number) => {
    if (Number.isFinite(scale) && scale > 0) ctx.setDisplacementScale(scale);
  };
  const handleScaleCustom = (raw: string) => {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      setCustomScale(parsed);
      ctx.setDisplacementScale(parsed);
    }
  };
  const isPresetActive = (scale: number) => Math.abs(ctx.displacementScale - scale) < 1e-9;
  return (
    <section className="result-table time-history-animation-controls-panel" aria-label={labels.heading}>
      <h3>{labels.heading}</h3>
      <p className="time-history-wizard-help">{labels.helpMode}</p>
      <div className="summary-list result-toolbar">
        <button
          type="button"
          aria-label={ctx.isPlaying ? labels.pause : labels.play}
          onClick={() => ctx.setIsPlaying(!ctx.isPlaying)}
          disabled={isDisabled}
        >
          {ctx.isPlaying ? labels.pause : labels.play}
        </button>
        <button
          type="button"
          aria-label={labels.previous}
          onClick={() => {
            ctx.setIsPlaying(false);
            ctx.setCurrentTimeIndex(currentIndex - 1);
          }}
          disabled={isDisabled || currentIndex <= 0}
        >
          {labels.previous}
        </button>
        <button
          type="button"
          aria-label={labels.next}
          onClick={() => {
            ctx.setIsPlaying(false);
            ctx.setCurrentTimeIndex(currentIndex + 1);
          }}
          disabled={isDisabled || currentIndex >= ctx.sampleCount - 1}
        >
          {labels.next}
        </button>
        <button
          type="button"
          aria-label={labels.reset}
          onClick={() => ctx.reset()}
          disabled={isDisabled}
        >
          {labels.reset}
        </button>
      </div>
      <label className="result-select time-history-animation-slider">
        <span>{labels.heading}</span>
        <input
          aria-label={labels.heading}
          type="range"
          min={0}
          max={Math.max(0, ctx.sampleCount - 1)}
          step={1}
          value={currentIndex}
          disabled={isDisabled}
          onChange={(event) => {
            ctx.setIsPlaying(false);
            ctx.setCurrentTimeIndex(Number(event.currentTarget.value));
          }}
        />
      </label>
      <div className="summary-list">
        <span>{timeText}</span>
        <span>{stepLabel}</span>
      </div>
      <div className="summary-list result-toolbar">
        <label className="result-select">
          <span>{labels.modeLabel}</span>
          <select
            aria-label={labels.modeLabel}
            value={ctx.displacementMode}
            disabled={isDisabled}
            onChange={(event) => ctx.setDisplacementMode(event.currentTarget.value as TimeHistoryDisplacementMode)}
          >
            <option value="x">{labels.modeX}</option>
            <option value="y">{labels.modeY}</option>
            <option value="z">{labels.modeZ}</option>
            <option value="xyz" disabled={!availability.available}>{labels.modeXyz}</option>
          </select>
        </label>
        <label className="result-select">
          <span>{labels.speedLabel}</span>
          <select
            aria-label={labels.speedLabel}
            value={String(ctx.playbackSpeed)}
            disabled={isDisabled}
            onChange={(event) => ctx.setPlaybackSpeed(Number(event.currentTarget.value))}
          >
            {ALLOWED_TIME_HISTORY_ANIMATION_SPEEDS.map((multiplier) => (
              <option key={multiplier} value={String(multiplier)}>
                {labels.speedOption(multiplier)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="summary-list result-toolbar">
        <span>{labels.displacementScaleLabel}</span>
        {SCALE_PRESETS.map((scale) => (
          <button
            key={scale}
            type="button"
            className={scaleMode === "preset" && isPresetActive(scale) ? "primary" : "secondary"}
            onClick={() => {
              setScaleMode("preset");
              handleScalePreset(scale);
            }}
            disabled={isDisabled}
          >
            {labels.scaleOption(scale)}
          </button>
        ))}
        <button
          type="button"
          className={scaleMode === "custom" ? "primary" : "secondary"}
          onClick={() => setScaleMode("custom")}
          disabled={isDisabled}
        >
          {labels.customScaleLabel}
        </button>
        {scaleMode === "custom" && (
          <input
            aria-label={labels.displacementScaleLabel}
            type="number"
            step="any"
            min="0"
            value={String(customScale)}
            disabled={isDisabled}
            onChange={(event) => handleScaleCustom(event.currentTarget.value)}
          />
        )}
      </div>
      {scaleMode === "custom" && (
        <p className="time-history-wizard-help">{labels.customScaleHelp}</p>
      )}
      <div className="summary-list result-toolbar">
        <button
          type="button"
          onClick={() => ctx.jumpToMax(null, "displacement")}
          disabled={isDisabled}
        >
          {labels.jumpToMax}
        </button>
        <span>{labels.valueLabel({ value: currentValueText, time: currentTime })}</span>
        <span>{labels.maxAbsLabel({ value: maxAbsValueText, time: maxAbsTimeText })}</span>
      </div>
      {ctx.largeScaleWarning && <div className="empty-state">{labels.warningLargeScale}</div>}
      {ctx.sampleMismatch && <div className="empty-state">{labels.warningSampleMismatch}</div>}
      {ctx.hasNonFiniteDisplacement && <div className="empty-state">{labels.warningNonFiniteValue}</div>}
    </section>
  );
}
