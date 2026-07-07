import { ja } from "../../i18n/ja";
import { updateLinerDraftSettings, type LinerDraft } from "../adapters/linerUiAdapter";
import {
  SAMPLING_INTERVAL_DISPLAY,
  SAMPLING_INTERVAL_DXF,
  SAMPLING_INTERVAL_FRAME,
} from "../core/sampling";

export type CurveSamplingControlProps = {
  draft: LinerDraft;
  onDraftChange: (draft: LinerDraft) => void;
};

function parseNumericInput(value: string): number {
  if (value.trim() === "") {
    return Number.NaN;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function displaySampleIntervalValue(value: number | undefined): string {
  return Number.isFinite(value) ? String(value) : "";
}

export function CurveSamplingControl({ draft, onDraftChange }: CurveSamplingControlProps) {
  return (
    <section
      className="liner-edit-panel"
      aria-labelledby="liner-curve-sampling-title"
      data-testid="curve-sampling-control"
    >
      <h2 id="liner-curve-sampling-title">{ja.liner.editor.samplingSection}</h2>
      <div className="liner-edit-form-grid">
        <label>
          <span>{ja.liner.fields.displaySamplingInterval}</span>
          <input
            type="number"
            value={displaySampleIntervalValue(draft.sampleInterval)}
            data-testid="liner-display-sampling-interval"
            onChange={(event) => {
              onDraftChange(
                updateLinerDraftSettings(draft, {
                  sampleInterval: parseNumericInput(event.currentTarget.value),
                }),
              );
            }}
          />
        </label>
        <label>
          <span>{ja.liner.fields.dxfSamplingInterval}</span>
          <input
            type="number"
            value={String(SAMPLING_INTERVAL_DXF)}
            readOnly
            tabIndex={-1}
            aria-readonly="true"
            data-testid="liner-dxf-sampling-interval"
          />
        </label>
        <label>
          <span>{ja.liner.fields.frameSamplingInterval}</span>
          <input
            type="number"
            value={String(SAMPLING_INTERVAL_FRAME)}
            readOnly
            tabIndex={-1}
            aria-readonly="true"
            data-testid="liner-frame-sampling-interval"
          />
        </label>
      </div>
    </section>
  );
}
