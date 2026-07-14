import { FilePlus2, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { ja } from "../../i18n/ja";
import {
  createDefaultCrossSlopeInterval,
  type LinerDraft,
} from "../adapters/linerUiAdapter";
import type {
  CrossSlopeIntervalDraft,
  CrossfallMode,
} from "../schema/types";
import { CompositionAwareInput } from "./CompositionAwareInput";

export type CrossfallIntervalEditorProps = {
  draft: LinerDraft;
  intervals: readonly CrossSlopeIntervalDraft[];
  onIntervalsChange: (intervals: CrossSlopeIntervalDraft[]) => void;
  onInputValidityChange?: (fieldKey: string, valid: boolean) => void;
  onCompositionStateChange?: (composing: boolean) => void;
  layout?: "default" | "fullWidth";
};

const CROSSFALL_MODES: readonly CrossfallMode[] = [
  "flat",
  "one_way_left",
  "one_way_right",
  "crown",
  "independent",
];

const CROSSFALL_SIGN_HELP_ID = "liner-crossfall-sign-convention-help";

function useDesktopCrossfallLayout(): boolean {
  const [desktopLayout, setDesktopLayout] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return true;
    }
    return window.matchMedia("(min-width: 1280px)").matches;
  });

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return undefined;
    }
    const media = window.matchMedia("(min-width: 1280px)");
    const onChange = () => setDesktopLayout(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return desktopLayout;
}

type IntervalFieldPatch = Partial<{
  id: string;
  startPhysicalDistance: number;
  endPhysicalDistance: number;
  mode: CrossfallMode;
  leftSlopePercent: number;
  rightSlopePercent: number;
  pivotDistance: number | undefined;
}>;

function numericValue(value: number | undefined): string {
  return Number.isFinite(value) ? String(value) : "";
}

function crossfallModeLabel(mode: CrossfallMode): string {
  return ja.liner.fields.crossfallModes[mode];
}

function baseSlopeMagnitude(interval: CrossSlopeIntervalDraft): number {
  return Math.max(Math.abs(interval.leftSlopePercent), Math.abs(interval.rightSlopePercent));
}

function applyModePreset(
  interval: CrossSlopeIntervalDraft,
  mode: CrossfallMode,
): CrossSlopeIntervalDraft {
  const magnitude = baseSlopeMagnitude(interval);
  if (mode === "flat") {
    return {
      ...interval,
      mode,
      leftSlopePercent: 0,
      rightSlopePercent: 0,
    };
  }
  if (mode === "one_way_left") {
    return {
      ...interval,
      mode,
      leftSlopePercent: -magnitude,
      rightSlopePercent: -magnitude,
    };
  }
  if (mode === "one_way_right") {
    return {
      ...interval,
      mode,
      leftSlopePercent: magnitude,
      rightSlopePercent: magnitude,
    };
  }
  if (mode === "crown") {
    return {
      ...interval,
      mode,
      leftSlopePercent: -magnitude,
      rightSlopePercent: magnitude,
    };
  }
  return {
    ...interval,
    mode,
  };
}

function updateInterval(
  intervals: readonly CrossSlopeIntervalDraft[],
  targetIndex: number,
  patch: IntervalFieldPatch,
): CrossSlopeIntervalDraft[] {
  return intervals.map((interval, index) => {
    if (index !== targetIndex) {
      return interval;
    }
    const next: CrossSlopeIntervalDraft = {
      ...interval,
      ...patch,
    };
    if ("pivotDistance" in patch && patch.pivotDistance === undefined) {
      delete next.pivotDistance;
    }
    if (patch.mode !== undefined) {
      return applyModePreset(next, patch.mode);
    }
    return next;
  });
}

function removeInterval(
  intervals: readonly CrossSlopeIntervalDraft[],
  targetIndex: number,
): CrossSlopeIntervalDraft[] {
  return intervals.filter((_, index) => index !== targetIndex);
}

let intervalRowKeySequence = 0;

type IntervalEditorFieldsProps = {
  draft: LinerDraft;
  interval: CrossSlopeIntervalDraft;
  intervalIndex: number;
  rowKey: string;
  intervals: readonly CrossSlopeIntervalDraft[];
  numericInputText: Record<string, string>;
  setNumericInputText: Dispatch<SetStateAction<Record<string, string>>>;
  onIntervalsChange: (intervals: CrossSlopeIntervalDraft[]) => void;
  onInputValidityChange?: (fieldKey: string, valid: boolean) => void;
  onCompositionStateChange?: (composing: boolean) => void;
  layout: "table" | "card";
  onRemove: () => void;
};

function IntervalEditorFields({
  draft,
  interval,
  intervalIndex,
  rowKey,
  intervals,
  numericInputText,
  setNumericInputText,
  onIntervalsChange,
  onInputValidityChange,
  onCompositionStateChange,
  layout,
  onRemove,
}: IntervalEditorFieldsProps) {
  const startKey = `${rowKey}:start`;
  const endKey = `${rowKey}:end`;
  const leftKey = `${rowKey}:left`;
  const rightKey = `${rowKey}:right`;
  const pivotKey = `${rowKey}:pivot`;

  const renderField = (
    label: string,
    control: ReactNode,
    options?: { describedBy?: string; tooltip?: string },
  ) => {
    if (layout === "table") {
      return control;
    }
    return (
      <label className="liner-crossfall-interval-card-field">
        <span title={options?.tooltip}>{label}</span>
        {control}
      </label>
    );
  };

  const idField = renderField(
    ja.liner.fields.crossfallIntervalId,
    <CompositionAwareInput
      value={interval.id}
      onCompositionStateChange={onCompositionStateChange}
      onValueChange={(value) => onIntervalsChange(updateInterval(intervals, intervalIndex, { id: value }))}
      data-testid={`crossfall-interval-id-${interval.id}`}
    />,
  );

  const startField = renderField(
    ja.liner.fields.crossfallStartStation,
    <CompositionAwareInput
      type="number"
      value={numericInputText[startKey] ?? numericValue(interval.startPhysicalDistance)}
      onCompositionStateChange={onCompositionStateChange}
      onValueChange={(text) => {
        const parsed = Number(text);
        const valid = text.trim() !== "" && Number.isFinite(parsed);
        setNumericInputText((current) => ({ ...current, [startKey]: text }));
        onInputValidityChange?.(`crossfall:${intervalIndex}:start`, valid);
        if (valid) {
          onIntervalsChange(updateInterval(intervals, intervalIndex, { startPhysicalDistance: parsed }));
        }
      }}
      data-testid={`crossfall-interval-start-${interval.id}`}
    />,
  );

  const endField = renderField(
    ja.liner.fields.crossfallEndStation,
    <CompositionAwareInput
      type="number"
      value={numericInputText[endKey] ?? numericValue(interval.endPhysicalDistance)}
      onCompositionStateChange={onCompositionStateChange}
      onValueChange={(text) => {
        const parsed = Number(text);
        const valid = text.trim() !== "" && Number.isFinite(parsed);
        setNumericInputText((current) => ({ ...current, [endKey]: text }));
        onInputValidityChange?.(`crossfall:${intervalIndex}:end`, valid);
        if (valid) {
          onIntervalsChange(updateInterval(intervals, intervalIndex, { endPhysicalDistance: parsed }));
        }
      }}
      data-testid={`crossfall-interval-end-${interval.id}`}
    />,
  );

  const modeField = renderField(
    ja.liner.fields.crossfallMode,
    <select
      value={interval.mode}
      onChange={(event) =>
        onIntervalsChange(
          updateInterval(intervals, intervalIndex, {
            mode: event.currentTarget.value as CrossfallMode,
          }),
        )
      }
      data-testid={`crossfall-interval-mode-${interval.id}`}
    >
      {CROSSFALL_MODES.map((mode) => (
        <option key={mode} value={mode}>
          {crossfallModeLabel(mode)}
        </option>
      ))}
    </select>,
  );

  const leftField = renderField(
    ja.liner.fields.crossfallLeftSlopePercent,
    <CompositionAwareInput
      type="number"
      value={numericInputText[leftKey] ?? numericValue(interval.leftSlopePercent)}
      onCompositionStateChange={onCompositionStateChange}
      aria-describedby={CROSSFALL_SIGN_HELP_ID}
      onValueChange={(text) => {
        const parsed = Number(text);
        const valid = text.trim() !== "" && Number.isFinite(parsed);
        setNumericInputText((current) => ({ ...current, [leftKey]: text }));
        onInputValidityChange?.(`crossfall:${intervalIndex}:left`, valid);
        if (valid) {
          onIntervalsChange(updateInterval(intervals, intervalIndex, { leftSlopePercent: parsed }));
        }
      }}
      data-testid={`crossfall-interval-left-slope-${interval.id}`}
    />,
  );

  const rightField = renderField(
    ja.liner.fields.crossfallRightSlopePercent,
    <CompositionAwareInput
      type="number"
      value={numericInputText[rightKey] ?? numericValue(interval.rightSlopePercent)}
      onCompositionStateChange={onCompositionStateChange}
      aria-describedby={CROSSFALL_SIGN_HELP_ID}
      onValueChange={(text) => {
        const parsed = Number(text);
        const valid = text.trim() !== "" && Number.isFinite(parsed);
        setNumericInputText((current) => ({ ...current, [rightKey]: text }));
        onInputValidityChange?.(`crossfall:${intervalIndex}:right`, valid);
        if (valid) {
          onIntervalsChange(updateInterval(intervals, intervalIndex, { rightSlopePercent: parsed }));
        }
      }}
      data-testid={`crossfall-interval-right-slope-${interval.id}`}
    />,
  );

  const pivotField = renderField(
    ja.liner.fields.crossfallPivotDistance,
    <CompositionAwareInput
      type="number"
      value={numericInputText[pivotKey] ?? numericValue(interval.pivotDistance)}
      onCompositionStateChange={onCompositionStateChange}
      title={ja.liner.editor.crossfallPivotTooltip}
      onValueChange={(text) => {
        const trimmed = text.trim();
        const valid = trimmed === "" || Number.isFinite(Number(trimmed));
        setNumericInputText((current) => ({ ...current, [pivotKey]: text }));
        onInputValidityChange?.(`crossfall:${intervalIndex}:pivot`, valid);
        if (!valid) {
          return;
        }
        onIntervalsChange(
          updateInterval(intervals, intervalIndex, {
            pivotDistance: trimmed === "" ? undefined : Number(trimmed),
          }),
        );
      }}
      data-testid={`crossfall-interval-pivot-${interval.id}`}
    />,
    { tooltip: ja.liner.editor.crossfallPivotTooltip },
  );

  const actionsField =
    layout === "table" ? (
      <button
        type="button"
        onClick={onRemove}
        data-testid={`remove-crossfall-interval-${interval.id}`}
        title={ja.liner.editor.removeCrossfallInterval}
        aria-label={ja.liner.editor.removeCrossfallInterval}
      >
        <Trash2 size={16} />
      </button>
    ) : (
      <div className="liner-crossfall-interval-card-actions">
        <button
          type="button"
          onClick={onRemove}
          data-testid={`remove-crossfall-interval-${interval.id}`}
          title={ja.liner.editor.removeCrossfallInterval}
        >
          <Trash2 size={16} />
          {ja.liner.fields.actions}
        </button>
      </div>
    );

  if (layout === "card") {
    return (
      <article className="liner-crossfall-interval-card" data-testid={`crossfall-interval-card-${interval.id}`}>
        {idField}
        {startField}
        {endField}
        {modeField}
        {leftField}
        {rightField}
        {pivotField}
        {actionsField}
      </article>
    );
  }

  return (
    <tr data-testid={`crossfall-interval-row-${interval.id}`}>
      <td>{idField}</td>
      <td>{startField}</td>
      <td>{endField}</td>
      <td>{modeField}</td>
      <td>{leftField}</td>
      <td>{rightField}</td>
      <td>{pivotField}</td>
      <td>{actionsField}</td>
    </tr>
  );
}

export function CrossfallIntervalEditor({
  draft,
  intervals,
  onIntervalsChange,
  onInputValidityChange,
  onCompositionStateChange,
  layout = "default",
}: CrossfallIntervalEditorProps) {
  const [numericInputText, setNumericInputText] = useState<Record<string, string>>({});
  const desktopLayout = useDesktopCrossfallLayout();
  const rowKeys = useRef<string[]>([]);
  while (rowKeys.current.length < intervals.length) {
    intervalRowKeySequence += 1;
    rowKeys.current.push(`crossfall-interval-row-${intervalRowKeySequence}`);
  }

  const sectionClassName =
    layout === "fullWidth"
      ? "liner-edit-panel liner-crossfall-interval-editor liner-crossfall-interval-editor--full-width"
      : "liner-edit-panel liner-crossfall-interval-editor";

  return (
    <section className={sectionClassName} aria-labelledby="liner-crossfall-interval-title">
      <div className="liner-edit-section-header">
        <div>
          <h2 id="liner-crossfall-interval-title">{ja.liner.editor.crossfallIntervalSection}</h2>
          <p className="liner-edit-help" id={CROSSFALL_SIGN_HELP_ID}>
            {ja.liner.editor.crossSlopeSignConventionHelp}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onIntervalsChange([...intervals, createDefaultCrossSlopeInterval(draft)])}
          data-testid="add-crossfall-interval"
        >
          <FilePlus2 size={16} />
          {ja.liner.editor.addCrossfallInterval}
        </button>
      </div>

      {intervals.length === 0 ? (
        <p className="liner-edit-help" data-testid="crossfall-interval-empty">
          {ja.liner.editor.crossfallIntervalEmpty}
        </p>
      ) : (
        <>
          <div
            className="liner-crossfall-interval-table-view liner-edit-table-wrap"
            aria-labelledby="liner-crossfall-interval-title"
            aria-hidden={!desktopLayout}
            inert={desktopLayout ? undefined : true}
          >
            <table className="liner-edit-table liner-crossfall-interval-table">
              <caption>{ja.liner.editor.crossfallIntervalTableCaption}</caption>
              <thead>
                <tr>
                  <th>{ja.liner.fields.crossfallIntervalId}</th>
                  <th>{ja.liner.fields.crossfallStartStation}</th>
                  <th>{ja.liner.fields.crossfallEndStation}</th>
                  <th>{ja.liner.fields.crossfallMode}</th>
                  <th>{ja.liner.fields.crossfallLeftSlopePercent}</th>
                  <th>{ja.liner.fields.crossfallRightSlopePercent}</th>
                  <th>{ja.liner.fields.crossfallPivotDistance}</th>
                  <th>{ja.liner.fields.actions}</th>
                </tr>
              </thead>
              <tbody>
                {intervals.map((interval, intervalIndex) => {
                  const rowKey = rowKeys.current[intervalIndex]!;
                  return (
                    <IntervalEditorFields
                      key={rowKey}
                      draft={draft}
                      interval={interval}
                      intervalIndex={intervalIndex}
                      rowKey={rowKey}
                      intervals={intervals}
                      numericInputText={numericInputText}
                      setNumericInputText={setNumericInputText}
                      onIntervalsChange={onIntervalsChange}
                      onInputValidityChange={onInputValidityChange}
                      onCompositionStateChange={onCompositionStateChange}
                      layout="table"
                      onRemove={() => {
                        rowKeys.current.splice(intervalIndex, 1);
                        onIntervalsChange(removeInterval(intervals, intervalIndex));
                      }}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>

          <div
            className="liner-crossfall-interval-card-view"
            aria-labelledby="liner-crossfall-interval-title"
            aria-hidden={desktopLayout}
            inert={desktopLayout ? true : undefined}
          >
            {intervals.map((interval, intervalIndex) => {
              const rowKey = rowKeys.current[intervalIndex]!;
              return (
                <IntervalEditorFields
                  key={`${rowKey}-card`}
                  draft={draft}
                  interval={interval}
                  intervalIndex={intervalIndex}
                  rowKey={rowKey}
                  intervals={intervals}
                  numericInputText={numericInputText}
                  setNumericInputText={setNumericInputText}
                  onIntervalsChange={onIntervalsChange}
                  onInputValidityChange={onInputValidityChange}
                  onCompositionStateChange={onCompositionStateChange}
                  layout="card"
                  onRemove={() => {
                    rowKeys.current.splice(intervalIndex, 1);
                    onIntervalsChange(removeInterval(intervals, intervalIndex));
                  }}
                />
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
