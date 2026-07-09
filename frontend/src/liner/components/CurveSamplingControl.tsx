import { useState } from "react";
import { ja } from "../../i18n/ja";
import { updateLinerDraftSettings, type LinerDraft } from "../adapters/linerUiAdapter";
import {
  SAMPLING_INTERVAL_DISPLAY,
  SAMPLING_INTERVAL_DXF,
  SAMPLING_INTERVAL_FRAME,
} from "../core/sampling";
import { CompositionAwareInput } from "./CompositionAwareInput";

export type CurveSamplingControlProps = {
  draft: LinerDraft;
  onDraftChange: (draft: LinerDraft) => void;
  onInputValidityChange?: (fieldKey: string, valid: boolean) => void;
  onCompositionStateChange?: (composing: boolean) => void;
};

function displaySampleIntervalValue(value: number | undefined): string {
  return Number.isFinite(value) ? String(value) : "";
}

export function CurveSamplingControl({
  draft,
  onDraftChange,
  onInputValidityChange,
  onCompositionStateChange,
}: CurveSamplingControlProps) {
  const [inputText, setInputText] = useState<string | null>(null);
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
          <CompositionAwareInput
            type="number"
            value={inputText ?? displaySampleIntervalValue(draft.sampleInterval)}
            data-testid="liner-display-sampling-interval"
            onCompositionStateChange={onCompositionStateChange}
            onValueChange={(text) => {
              const parsed = Number(text);
              const valid = text.trim() !== "" && Number.isFinite(parsed);
              setInputText(text);
              onInputValidityChange?.("sampling:display", valid);
              if (valid) {
                onDraftChange(updateLinerDraftSettings(draft, { sampleInterval: parsed }));
              }
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
