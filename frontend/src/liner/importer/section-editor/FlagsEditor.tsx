import type { Flags } from "../types";

export type FlagsEditorProps = {
  flags: Flags;
  onChange: (flags: Flags) => void;
};

export function FlagsEditor({ flags, onChange }: FlagsEditorProps) {
  return (
    <fieldset className="flags-editor" data-testid="flags-editor">
      <legend>flags</legend>
      <label>
        <input
          type="checkbox"
          checked={flags.notComputed === true}
          onChange={(event) =>
            onChange({ ...flags, notComputed: event.target.checked || undefined })
          }
          data-testid="flags-not-computed"
        />
        notComputed
      </label>
      <label>
        <input
          type="checkbox"
          checked={flags.notApplicable === true}
          onChange={(event) =>
            onChange({ ...flags, notApplicable: event.target.checked || undefined })
          }
          data-testid="flags-not-applicable"
        />
        notApplicable
      </label>
      <label>
        <input
          type="checkbox"
          checked={flags.outOfRange === true}
          onChange={(event) =>
            onChange({ ...flags, outOfRange: event.target.checked || undefined })
          }
          data-testid="flags-out-of-range"
        />
        outOfRange
      </label>
    </fieldset>
  );
}
