import { ja } from "../../i18n/ja";
import type { CrossSlopeDraft } from "../schema/types";

export type SuperelevationEditorProps = {
  crossSlope: CrossSlopeDraft | undefined;
  onCrossSlopeChange: (crossSlope: CrossSlopeDraft | undefined) => void;
};

function crossSlopeInputValue(crossSlope: CrossSlopeDraft | undefined): string {
  if (crossSlope === undefined) {
    return "";
  }
  const value = crossSlope.valuePercent;
  return Number.isFinite(value) ? String(value) : "";
}

function parseCrossSlopeInput(value: string): CrossSlopeDraft | undefined {
  if (value.trim() === "") {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return {
    signConvention: "right_down_positive",
    valuePercent: parsed,
  };
}

export function SuperelevationEditor({ crossSlope, onCrossSlopeChange }: SuperelevationEditorProps) {
  return (
    <section
      className="liner-edit-panel"
      aria-labelledby="liner-superelevation-title"
      data-testid="superelevation-editor"
    >
      <h2 id="liner-superelevation-title">{ja.liner.editor.crossSlopeSection}</h2>

      <p className="liner-edit-help" data-testid="cross-slope-sign-convention-help">
        {ja.liner.editor.crossSlopeSignConventionHelp}
      </p>

      <div className="liner-edit-form-grid">
        <label>
          <span>{ja.liner.fields.crossSlopePercent}</span>
          <input
            type="number"
            value={crossSlopeInputValue(crossSlope)}
            data-testid="cross-slope-percent"
            onChange={(event) => {
              onCrossSlopeChange(parseCrossSlopeInput(event.currentTarget.value));
            }}
          />
        </label>
      </div>
    </section>
  );
}
