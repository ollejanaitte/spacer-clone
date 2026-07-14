import { FilePlus2, Trash2 } from "lucide-react";
import { useState } from "react";
import { ja } from "../../i18n/ja";
import {
  addLinerExplicitStation,
  addLinerOffset,
  addLinerStationEquation,
  removeLinerExplicitStation,
  removeLinerOffset,
  removeLinerStationEquation,
  updateLinerDraftSettings,
  updateLinerExplicitStation,
  updateLinerOffset,
  updateLinerStationDefinition,
  updateLinerStationEquation,
  type LinerDraft,
  type LinerDraftUpdate,
} from "../adapters/linerUiAdapter";
import { CompositionAwareInput } from "./CompositionAwareInput";

export type LinerStationProfilePanelProps = {
  draft: LinerDraft;
  onDraftChange: (update: LinerDraftUpdate) => void;
  onInputValidityChange?: (fieldKey: string, valid: boolean) => void;
  onCompositionStateChange?: (composing: boolean) => void;
};

function numericValue(value: number | undefined): string {
  return Number.isFinite(value) ? String(value) : "";
}

export function LinerStationProfilePanel({
  draft,
  onDraftChange,
  onInputValidityChange,
  onCompositionStateChange,
}: LinerStationProfilePanelProps) {
  const [numericInputText, setNumericInputText] = useState<Record<string, string>>({});
  const explicitStations = draft.stationDefinition.explicitStations ?? [];
  const equations = draft.stationDefinition.equations ?? [];
  const offsets = draft.offsets ?? [];
  const numericInputValue = (key: string, value: number | undefined) =>
    numericInputText[key] ?? numericValue(value);
  const updateNumericInput = (key: string, text: string, applyValue: (value: number) => void) => {
    setNumericInputText((current) => ({ ...current, [key]: text }));
    const parsed = Number(text);
    const valid = text.trim() !== "" && Number.isFinite(parsed);
    onInputValidityChange?.(`station:${key}`, valid);
    if (valid) {
      applyValue(parsed);
    }
  };

  return (
    <>
      <section className="liner-edit-panel" aria-labelledby="liner-edit-station-title">
        <h2 id="liner-edit-station-title">{ja.liner.editor.stationSection}</h2>
        <div className="liner-edit-form-grid">
          <label>
            <span>{ja.liner.fields.originDisplayedStation}</span>
            <CompositionAwareInput
              type="number"
              value={numericInputValue("originDisplayedStation", draft.stationDefinition.originDisplayedStation)}
              data-testid="liner-origin-displayed-station"
              onCompositionStateChange={onCompositionStateChange}
              onValueChange={(nextValue) => {
                updateNumericInput("originDisplayedStation", nextValue, (value) =>
                  onDraftChange(
                    (current) => updateLinerStationDefinition(current, {
                      originDisplayedStation: value,
                    }),
                  ),
                );
              }}
            />
          </label>
          <label>
            <span>{ja.liner.fields.stationInterval}</span>
            <CompositionAwareInput
              type="number"
              value={numericInputValue("interval", draft.stationDefinition.interval)}
              data-testid="liner-station-interval"
              onCompositionStateChange={onCompositionStateChange}
              onValueChange={(nextValue) => {
                updateNumericInput("interval", nextValue, (value) =>
                  onDraftChange(
                    (current) => updateLinerStationDefinition(current, { interval: value }),
                  ),
                );
              }}
            />
          </label>
          <label>
            <span>{ja.liner.fields.sampleInterval}</span>
            <CompositionAwareInput
              type="number"
              value={numericInputValue("sampleInterval", draft.sampleInterval)}
              data-testid="liner-sample-interval"
              onCompositionStateChange={onCompositionStateChange}
              onValueChange={(nextValue) => {
                updateNumericInput("sampleInterval", nextValue, (value) =>
                  onDraftChange(
                    (current) => updateLinerDraftSettings(current, { sampleInterval: value }),
                  ),
                );
              }}
            />
          </label>
        </div>
      </section>

      <section className="liner-edit-panel" aria-labelledby="liner-edit-profile-title">
        <h2 id="liner-edit-profile-title">{ja.liner.editor.profileSection}</h2>
        <div className="liner-edit-form-grid">
          <label>
            <span>{ja.liner.fields.z}</span>
            <CompositionAwareInput
              type="number"
              value={numericInputValue("profileZ", draft.z)}
              data-testid="liner-profile-z"
              onCompositionStateChange={onCompositionStateChange}
              onValueChange={(nextValue) => {
                updateNumericInput("profileZ", nextValue, (value) =>
                  onDraftChange((current) => updateLinerDraftSettings(current, { z: value })),
                );
              }}
            />
          </label>
        </div>
        <p className="liner-edit-help">{ja.liner.editor.flatProfileNotice}</p>
      </section>

      <section className="liner-edit-panel" aria-labelledby="liner-edit-explicit-stations-title">
        <div className="liner-edit-section-header">
          <h2 id="liner-edit-explicit-stations-title">{ja.liner.editor.explicitStationSection}</h2>
          <button
            type="button"
            className="liner-action-btn"
            onClick={() => onDraftChange((current) => addLinerExplicitStation(current))}
            data-testid="add-liner-explicit-station"
          >
            <FilePlus2 size={16} />
            {ja.common.addRow}
          </button>
        </div>
        <div className="liner-edit-offsets">
          {explicitStations.length === 0 ? (
            <p className="liner-edit-help">{ja.liner.editor.noExplicitStations}</p>
          ) : (
            explicitStations.map((station, index) => (
              <label key={index}>
                <span>{ja.liner.fields.explicitStation(index + 1)}</span>
                <span className="liner-edit-inline-row">
                  <CompositionAwareInput
                    type="number"
                    value={numericInputValue(`explicitStation:${index}`, station)}
                    onCompositionStateChange={onCompositionStateChange}
                    onValueChange={(nextValue) => {
                      updateNumericInput(`explicitStation:${index}`, nextValue, (value) =>
                        onDraftChange((current) =>
                          updateLinerExplicitStation(current, index, value),
                        ),
                      );
                    }}
                    data-testid={`liner-explicit-station-${index}`}
                  />
                  <button
                    type="button"
                    onClick={() => onDraftChange((current) => removeLinerExplicitStation(current, index))}
                    data-testid={`remove-liner-explicit-station-${index}`}
                    title={ja.common.removeRow}
                  >
                    <Trash2 size={16} />
                  </button>
                </span>
              </label>
            ))
          )}
        </div>
      </section>

      <section className="liner-edit-panel" aria-labelledby="liner-edit-equations-title">
        <div className="liner-edit-section-header">
          <h2 id="liner-edit-equations-title">{ja.liner.editor.stationEquationSection}</h2>
          <button
            type="button"
            className="liner-action-btn"
            onClick={() => onDraftChange((current) => addLinerStationEquation(current))}
            data-testid="add-liner-station-equation"
          >
            <FilePlus2 size={16} />
            {ja.common.addRow}
          </button>
        </div>
        <div className="liner-edit-table-wrap">
          <table className="liner-edit-table liner-station-equation-table">
            <caption>{ja.liner.editor.stationEquationTableCaption}</caption>
            <thead>
              <tr>
                <th>{ja.liner.fields.stationEquationId}</th>
                <th>{ja.liner.fields.physicalDistance}</th>
                <th>{ja.liner.fields.stationEquationType}</th>
                <th>{ja.liner.fields.stationEquationValue}</th>
                <th>{ja.liner.fields.sortIndex}</th>
                <th>{ja.liner.fields.actions}</th>
              </tr>
            </thead>
            <tbody>
              {equations.length === 0 ? (
                <tr>
                  <td colSpan={6}>{ja.liner.editor.noStationEquations}</td>
                </tr>
              ) : (
                equations.map((equation, equationIndex) => (
                  <tr key={equationIndex}>
                    <td>
                      <CompositionAwareInput
                        value={equation.id ?? ""}
                        data-testid={`liner-equation-id-${equation.id}`}
                        onCompositionStateChange={onCompositionStateChange}
                        onValueChange={(value) => {
                          onDraftChange((current) =>
                            updateLinerStationEquation(current, equation.id, { id: value }),
                          );
                        }}
                      />
                    </td>
                    <td>
                      <CompositionAwareInput
                        type="number"
                        value={numericInputValue(`equation:${equationIndex}:physicalDistance`, equation.physicalDistance)}
                        onCompositionStateChange={onCompositionStateChange}
                        onValueChange={(nextValue) => {
                          updateNumericInput(`equation:${equationIndex}:physicalDistance`, nextValue, (value) =>
                            onDraftChange(
                              (current) => updateLinerStationEquation(current, equation.id, {
                                physicalDistance: value,
                              }),
                            ),
                          );
                        }}
                        data-testid={`liner-equation-distance-${equation.id}`}
                      />
                    </td>
                    <td>
                      <select
                        value={equation.type}
                        onChange={(event) => {
                          const value = event.currentTarget.value as "add_constant" | "reset_to_value";
                          onDraftChange(
                            (current) => updateLinerStationEquation(current, equation.id, {
                              type: value,
                            }),
                          );
                        }}
                        data-testid={`liner-equation-type-${equation.id}`}
                      >
                        <option value="add_constant">{ja.liner.fields.stationEquationTypes.addConstant}</option>
                        <option value="reset_to_value">{ja.liner.fields.stationEquationTypes.resetToValue}</option>
                      </select>
                    </td>
                    <td>
                      <CompositionAwareInput
                        type="number"
                        value={numericInputValue(`equation:${equationIndex}:value`, equation.value)}
                        onCompositionStateChange={onCompositionStateChange}
                        onValueChange={(nextValue) => {
                          updateNumericInput(`equation:${equationIndex}:value`, nextValue, (value) =>
                            onDraftChange(
                              (current) => updateLinerStationEquation(current, equation.id, {
                                value,
                              }),
                            ),
                          );
                        }}
                        data-testid={`liner-equation-value-${equation.id}`}
                      />
                    </td>
                    <td>
                      <CompositionAwareInput
                        type="number"
                        value={numericInputValue(`equation:${equationIndex}:sortIndex`, equation.sortIndex)}
                        onCompositionStateChange={onCompositionStateChange}
                        onValueChange={(nextValue) => {
                          updateNumericInput(`equation:${equationIndex}:sortIndex`, nextValue, (value) =>
                            onDraftChange(
                              (current) => updateLinerStationEquation(current, equation.id, {
                                sortIndex: value,
                              }),
                            ),
                          );
                        }}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => onDraftChange((current) => removeLinerStationEquation(current, equation.id))}
                        data-testid={`remove-liner-station-equation-${equation.id}`}
                        title={ja.common.removeRow}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="liner-edit-panel" aria-labelledby="liner-edit-offsets-title">
        <div className="liner-edit-section-header">
          <h2 id="liner-edit-offsets-title">{ja.liner.editor.offsetSection}</h2>
          <button type="button" onClick={() => onDraftChange((current) => addLinerOffset(current))} data-testid="add-liner-offset">
            <FilePlus2 size={16} />
            {ja.common.addRow}
          </button>
        </div>
        <div className="liner-edit-offsets">
          {offsets.map((offset, index) => (
            <label key={index}>
              <span>{ja.liner.fields.offset(index + 1)}</span>
              <span className="liner-edit-inline-row">
                <CompositionAwareInput
                  type="number"
                  value={numericInputValue(`offset:${index}`, offset)}
                  onCompositionStateChange={onCompositionStateChange}
                  onValueChange={(nextValue) => {
                    updateNumericInput(`offset:${index}`, nextValue, (value) =>
                      onDraftChange((current) => updateLinerOffset(current, index, value)),
                    );
                  }}
                  data-testid={`liner-offset-${index}`}
                />
                <button
                  type="button"
                  onClick={() => onDraftChange((current) => removeLinerOffset(current, index))}
                  disabled={offsets.length <= 1}
                  data-testid={`remove-liner-offset-${index}`}
                  title={ja.common.removeRow}
                >
                  <Trash2 size={16} />
                </button>
              </span>
            </label>
          ))}
        </div>
      </section>
    </>
  );
}
