import { useState } from "react";
import { L0_STRINGS } from "../data/level0Strings";
import { EARTHQUAKE_PRESETS, type EarthquakePresetId } from "../data/earthquakePresets";

type QuakePickerProps = { onShake: (preset: EarthquakePresetId) => void; onBack: () => void };

export function QuakePicker({ onShake, onBack }: QuakePickerProps) {
  const text = L0_STRINGS.picker;
  const [selected, setSelected] = useState<EarthquakePresetId | null>(null);
  return (
    <div className="level0-quake-picker">
      <h1>{text.title}</h1>
      <div className="level0-preset-cards">
        {(Object.keys(EARTHQUAKE_PRESETS) as EarthquakePresetId[]).map((id) => {
          const preset = EARTHQUAKE_PRESETS[id];
          return (
            <button key={id} type="button" className={`level0-preset-card ${selected === id ? "selected" : ""}`} onClick={() => setSelected(id)}>
              <span className="level0-preset-label">{preset.displayLabel}</span>
              <span className="level0-preset-onomatopoeia">{preset.onomatopoeia}</span>
              <span className="level0-preset-description">{preset.description}</span>
            </button>
          );
        })}
      </div>
      <div className="level0-picker-actions">
        <button type="button" className="level0-back-button" onClick={onBack}>{text.backHome}</button>
        <button type="button" className="level0-shake-button" onClick={() => selected && onShake(selected)} disabled={!selected}>{text.shakeButton}</button>
      </div>
    </div>
  );
}
