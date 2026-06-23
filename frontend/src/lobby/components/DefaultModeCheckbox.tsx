import { L0_STRINGS } from "../data/lobbyStrings";
import type { UiModeDefault } from "../services/uiModeDefault";

type DefaultModeCheckboxProps = {
  mode: UiModeDefault;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function DefaultModeCheckbox({ mode, checked, onChange }: DefaultModeCheckboxProps) {
  const label = mode === "learn"
    ? L0_STRINGS.learnTop.defaultModeLabel
    : mode === "level0"
      ? L0_STRINGS.level0Header.defaultModeLabel
      : L0_STRINGS.proHeader.defaultModeLabel;

  return (
    <label className="lobby-default-mode-checkbox">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.currentTarget.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
