import { useEffect } from "react";
import { ja } from "../i18n/ja";
import {
  ALLOWED_TIME_HISTORY_ANIMATION_SPEEDS,
  clampTimeIndex,
} from "./timeHistoryAnimation";
import { useTimeHistoryAnimation } from "./TimeHistoryAnimationContext";

/**
 * Minimal Time History animation controls. The component is a
 * pure renderer: it reads from and writes to the animation context.
 * It does not own the playback clock itself; the parent component
 * drives the clock through `setCurrentTimeIndex`.
 *
 * The component never mutates the project payload, the analysis
 * result, or the API contract. It is display-only.
 */
export function TimeHistoryAnimationControls() {
  const ctx = useTimeHistoryAnimation();
  const labels = ja.timeHistory.animation;
  const isDisabled = !ctx.enabled;
  const hasSamples = ctx.sampleCount > 0;
  const currentIndex = clampTimeIndex(ctx.currentTimeIndex, ctx.sampleCount);
  const safeScale = Number.isFinite(ctx.displacementScale) && ctx.displacementScale > 0
    ? ctx.displacementScale
    : 1;

  // The animation clock is driven by the parent. When the parent is
  // playing, it advances `currentTimeIndex` via `setCurrentTimeIndex`.
  // We expose a small effect that resets the index when the result
  // changes, so the user always starts at sample 0 after a new run.
  useEffect(() => {
    if (!ctx.enabled) {
      ctx.setCurrentTimeIndex(0);
    }
  }, [ctx.enabled, ctx.sampleCount, ctx.setCurrentTimeIndex]);

  if (!hasSamples) {
    return (
      <section className="result-table time-history-animation-controls" aria-label={labels.heading}>
        <h3>{labels.heading}</h3>
        <div className="empty-state">
          {isDisabled ? labels.disabledNoResult : labels.disabledNoDisplacement}
        </div>
      </section>
    );
  }

  return (
    <section className="result-table time-history-animation-controls" aria-label={labels.heading}>
      <h3>{labels.heading}</h3>
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
        <span>{labels.timeSliderLabel(String(currentIndex), String(ctx.sampleCount - 1))}</span>
      </div>
      <div className="summary-list result-toolbar">
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
        <label className="result-select">
          <span>{labels.displacementScaleLabel}</span>
          <input
            aria-label={labels.displacementScaleLabel}
            type="number"
            step="any"
            min="0"
            value={String(safeScale)}
            disabled={isDisabled}
            onChange={(event) => {
              const parsed = Number(event.currentTarget.value);
              if (Number.isFinite(parsed) && parsed > 0) ctx.setDisplacementScale(parsed);
            }}
          />
        </label>
      </div>
      {ctx.sampleMismatch && <div className="empty-state">{labels.warningSampleMismatch}</div>}
      {ctx.hasNonFiniteDisplacement && <div className="empty-state">{labels.warningNonFiniteValue}</div>}
    </section>
  );
}
