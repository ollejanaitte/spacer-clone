import { CopyPlus, FilePlus2, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { ja } from "../../i18n/ja";
import { createDefaultCrossSlopeInterval, type LinerDraft } from "../adapters/linerUiAdapter";
import { validateCrossSlopeIntervals } from "../core/grid/crossfallResolution";
import type { CrossSlopeIntervalDraft, CrossfallMode } from "../schema/types";

export type CrossSlopeIntervalEditorProps = {
  draft: LinerDraft;
  onChange: (nextIntervals: CrossSlopeIntervalDraft[]) => void;
};

const CROSSFALL_MODES: readonly CrossfallMode[] = [
  "crown",
  "one_way_left",
  "one_way_right",
  "independent",
  "flat",
];

function parseNumber(value: string): number | undefined {
  if (value.trim() === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function duplicateInterval(interval: CrossSlopeIntervalDraft, suffix: string): CrossSlopeIntervalDraft {
  return {
    ...interval,
    id: `${interval.id}-${suffix}`,
  };
}

export function CrossSlopeIntervalEditor({ draft, onChange }: CrossSlopeIntervalEditorProps) {
  const intervals = draft.crossSlopeIntervals ?? [];
  const validation = useMemo(() => validateCrossSlopeIntervals(intervals), [intervals]);
  const totalLength = draft.alignment.elements.reduce((sum, element) => sum + element.length, 0);

  const setIntervals = (nextIntervals: CrossSlopeIntervalDraft[]) => {
    onChange(nextIntervals.sort((left, right) => left.startPhysicalDistance - right.startPhysicalDistance));
  };

  return (
    <section className="liner-edit-panel" aria-labelledby="liner-cross-slope-interval-title" data-testid="cross-slope-interval-editor">
      <div className="liner-edit-section-header">
        <h2 id="liner-cross-slope-interval-title">{ja.liner.editor.crossSlopeSection}</h2>
        <button
          type="button"
          data-testid="cross-slope-interval-add"
          onClick={() => {
            const next = createDefaultCrossSlopeInterval(draft, {
              id: `CF-${intervals.length + 1}`,
              startPhysicalDistance: intervals.at(-1)?.endPhysicalDistance ?? 0,
              endPhysicalDistance: totalLength,
            });
            setIntervals([...intervals, next]);
          }}
        >
          <FilePlus2 size={16} />
          {ja.liner.editor.addOffsetLine}
        </button>
      </div>

      <p className="liner-edit-help" data-testid="cross-slope-interval-help">
        {ja.liner.editor.crossSectionSignConventionHelp}
      </p>

      {validation.length > 0 && (
        <ul className="liner-edit-diagnostics" data-testid="cross-slope-interval-validation">
          {validation.map((diagnostic) => (
            <li key={`${diagnostic.code}-${diagnostic.entityId ?? "crossfall"}`}>
              <strong>{diagnostic.level}</strong> {diagnostic.detail ?? diagnostic.code}
            </li>
          ))}
        </ul>
      )}

      <div className="liner-cross-slope-table" role="table" aria-label="cross slope intervals">
        <div className="liner-cross-slope-table-header" role="row">
          <span>start</span>
          <span>end</span>
          <span>mode</span>
          <span>left %</span>
          <span>right %</span>
          <span>pivot</span>
          <span>actions</span>
        </div>
        {intervals.map((interval, index) => (
          <div className="liner-cross-slope-table-row" role="row" key={interval.id}>
            <label>
              <span>start</span>
              <input
                type="number"
                value={interval.startPhysicalDistance}
                onChange={(event) => {
                  const start = parseNumber(event.currentTarget.value);
                  if (start === undefined) return;
                  const next = [...intervals];
                  next[index] = { ...interval, startPhysicalDistance: start };
                  setIntervals(next);
                }}
              />
            </label>
            <label>
              <span>end</span>
              <input
                type="number"
                value={interval.endPhysicalDistance}
                onChange={(event) => {
                  const end = parseNumber(event.currentTarget.value);
                  if (end === undefined) return;
                  const next = [...intervals];
                  next[index] = { ...interval, endPhysicalDistance: end };
                  setIntervals(next);
                }}
              />
            </label>
            <label>
              <span>mode</span>
              <select
                value={interval.mode}
                onChange={(event) => {
                  const next = [...intervals];
                  next[index] = { ...interval, mode: event.currentTarget.value as CrossfallMode };
                  setIntervals(next);
                }}
              >
                {CROSSFALL_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>left</span>
              <input
                type="number"
                value={interval.leftSlopePercent}
                onChange={(event) => {
                  const leftSlopePercent = parseNumber(event.currentTarget.value);
                  if (leftSlopePercent === undefined) return;
                  const next = [...intervals];
                  next[index] = { ...interval, leftSlopePercent };
                  setIntervals(next);
                }}
              />
            </label>
            <label>
              <span>right</span>
              <input
                type="number"
                value={interval.rightSlopePercent}
                onChange={(event) => {
                  const rightSlopePercent = parseNumber(event.currentTarget.value);
                  if (rightSlopePercent === undefined) return;
                  const next = [...intervals];
                  next[index] = { ...interval, rightSlopePercent };
                  setIntervals(next);
                }}
              />
            </label>
            <label>
              <span>pivot</span>
              <input
                type="number"
                value={interval.pivotDistance ?? 0}
                onChange={(event) => {
                  const pivotDistance = parseNumber(event.currentTarget.value);
                  const next = [...intervals];
                  next[index] =
                    pivotDistance === undefined
                      ? { ...interval, pivotDistance: undefined }
                      : { ...interval, pivotDistance };
                  setIntervals(next);
                }}
              />
            </label>
            <div className="liner-cross-slope-table-actions">
              <button
                type="button"
                onClick={() => {
                  const next = [...intervals];
                  next.splice(index + 1, 0, duplicateInterval(interval, String(index + 2)));
                  setIntervals(next);
                }}
              >
                <CopyPlus size={14} />
                duplicate
              </button>
              <button
                type="button"
                onClick={() => {
                  if (intervals.length <= 1) return;
                  setIntervals(intervals.filter((_, currentIndex) => currentIndex !== index));
                }}
              >
                <Trash2 size={14} />
                delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
