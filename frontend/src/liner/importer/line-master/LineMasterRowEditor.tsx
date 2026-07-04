import type { GirderLineMaster, GirderLineRole, Span } from "../types";
import { GIRDER_LINE_ROLE_OPTIONS } from "./lineMasterHooks";

type LineMasterRowEditorProps = {
  line: GirderLineMaster;
  index: number;
  spans: Span[];
  spanLabel: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChange: (lineId: string, patch: Partial<GirderLineMaster>) => void;
  onRemove: (lineId: string) => void;
  onMove: (lineId: string, direction: "up" | "down") => void;
};

function parseNominalOffset(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function LineMasterRowEditor({
  line,
  index,
  spanLabel,
  canMoveUp,
  canMoveDown,
  onChange,
  onRemove,
  onMove,
}: LineMasterRowEditorProps) {
  const handleRemove = () => {
    if (!window.confirm(`「${line.label || `行 ${index + 1}`}」を削除しますか？`)) {
      return;
    }
    onRemove(line.id);
  };

  return (
    <tr data-testid={`line-master-row-${line.id}`}>
      <td>{index + 1}</td>
      <td>
        <input
          type="text"
          value={line.label}
          onChange={(event) => onChange(line.id, { label: event.target.value })}
          aria-label={`行 ${index + 1} ラベル`}
          data-testid={`line-master-label-${line.id}`}
        />
      </td>
      <td>
        <select
          value={line.role ?? "girder"}
          onChange={(event) =>
            onChange(line.id, { role: event.target.value as GirderLineRole })
          }
          aria-label={`行 ${index + 1} 種別`}
          data-testid={`line-master-role-${line.id}`}
        >
          {GIRDER_LINE_ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input
          type="text"
          inputMode="decimal"
          value={line.nominalOffset ?? ""}
          onChange={(event) =>
            onChange(line.id, { nominalOffset: parseNominalOffset(event.target.value) })
          }
          aria-label={`行 ${index + 1} 標準オフセット`}
          data-testid={`line-master-offset-${line.id}`}
        />
      </td>
      <td>{spanLabel}</td>
      <td>
        <div className="line-master-row-actions">
          <button
            type="button"
            disabled={!canMoveUp}
            onClick={() => onMove(line.id, "up")}
            aria-label={`行 ${index + 1} を上へ`}
            data-testid={`line-master-move-up-${line.id}`}
          >
            ↑
          </button>
          <button
            type="button"
            disabled={!canMoveDown}
            onClick={() => onMove(line.id, "down")}
            aria-label={`行 ${index + 1} を下へ`}
            data-testid={`line-master-move-down-${line.id}`}
          >
            ↓
          </button>
          <button
            type="button"
            onClick={handleRemove}
            aria-label={`行 ${index + 1} を削除`}
            data-testid={`line-master-remove-${line.id}`}
          >
            削除
          </button>
        </div>
      </td>
    </tr>
  );
}
