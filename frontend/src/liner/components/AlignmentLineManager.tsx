import { ja } from "../../i18n/ja";
import type { LinerDraft } from "../adapters/linerUiAdapter";
import {
  listOffsetLinesForActiveAlignment,
  setActiveLineId,
  updateActiveAlignmentOffsetLines,
} from "../adapters/linerUiAdapter";
import { deriveLinerCenterlineId } from "../adapters/linerDomainDraftRoadDesignMapper";
import type { CrossSectionOffsetLineDraft } from "../schema/types";
import { CompositionAwareInput } from "./CompositionAwareInput";

export type AlignmentLineManagerProps = {
  draft: LinerDraft;
  onDraftChange: (update: LinerDraft | ((current: LinerDraft) => LinerDraft)) => void;
  onCompositionStateChange?: (composing: boolean) => void;
};

function nextOffsetLineId(lines: readonly CrossSectionOffsetLineDraft[]): string {
  const ids = new Set(lines.map((line) => line.id));
  let index = lines.length + 1;
  let candidate = `OL-${index}`;
  while (ids.has(candidate)) {
    index += 1;
    candidate = `OL-${index}`;
  }
  return candidate;
}

export function AlignmentLineManager({
  draft,
  onDraftChange,
  onCompositionStateChange,
}: AlignmentLineManagerProps) {
  const alignmentId = draft.activeAlignmentId ?? draft.alignment.id;
  const centerlineId = deriveLinerCenterlineId(alignmentId);
  const activeLineId = draft.activeLineId ?? centerlineId;
  const offsetLines = listOffsetLinesForActiveAlignment(draft);

  const updateLines = (lines: CrossSectionOffsetLineDraft[]) => {
    onDraftChange((current) => updateActiveAlignmentOffsetLines(current, lines));
  };

  const moveLine = (lineId: string, direction: -1 | 1) => {
    const sorted = [...offsetLines];
    const index = sorted.findIndex((line) => line.id === lineId);
    if (index < 0) {
      return;
    }
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sorted.length) {
      return;
    }
    const next = [...sorted];
    const [removed] = next.splice(index, 1);
    next.splice(targetIndex, 0, removed!);
    updateLines(next.map((line, sortIndex) => ({ ...line, sortIndex })));
  };

  return (
    <section className="liner-edit-panel" aria-labelledby="liner-line-manager-title">
      <h2 id="liner-line-manager-title">{ja.liner.lineManager.title}</h2>
      <p className="liner-edit-help">{ja.liner.lineManager.lead}</p>
      <table className="liner-line-table" data-testid="liner-line-table">
        <caption>{ja.liner.lineManager.tableCaption}</caption>
        <thead>
          <tr>
            <th scope="col">{ja.liner.lineManager.label}</th>
            <th scope="col">{ja.liner.lineManager.id}</th>
            <th scope="col">{ja.liner.lineManager.base}</th>
            <th scope="col">{ja.liner.lineManager.enabled}</th>
            <th scope="col">{ja.liner.lineManager.active}</th>
            <th scope="col">{ja.liner.lineManager.actions}</th>
          </tr>
        </thead>
        <tbody>
          <tr data-testid="liner-line-row-centerline" className="liner-line-row base-line">
            <td>{ja.liner.lineManager.centerlineLabel}</td>
            <td>{centerlineId}</td>
            <td>{ja.liner.lineManager.baseSelf}</td>
            <td>—</td>
            <td>
              <button
                type="button"
                aria-pressed={activeLineId === centerlineId}
                data-testid="liner-line-select-centerline"
                onClick={() => onDraftChange((current) => setActiveLineId(current, centerlineId))}
              >
                {activeLineId === centerlineId
                  ? ja.liner.lineManager.current
                  : ja.liner.lineManager.select}
              </button>
            </td>
            <td>{ja.liner.lineManager.centerlineProtected}</td>
          </tr>
          {offsetLines.map((line) => (
            <tr key={line.id} data-testid={`liner-line-row-${line.id}`} className="liner-line-row">
              <td>
                <CompositionAwareInput
                  value={line.label ?? ""}
                  data-testid={`liner-line-label-${line.id}`}
                  onCompositionStateChange={onCompositionStateChange}
                  onValueChange={(value) =>
                    updateLines(
                      offsetLines.map((entry) =>
                        entry.id === line.id ? { ...entry, label: value } : entry,
                      ),
                    )
                  }
                />
              </td>
              <td>{line.id}</td>
              <td>{line.baseLineId ?? centerlineId}</td>
              <td>
                <input
                  type="checkbox"
                  checked={line.enabled !== false}
                  data-testid={`liner-line-enabled-${line.id}`}
                  onChange={(event) =>
                    updateLines(
                      offsetLines.map((entry) =>
                        entry.id === line.id ? { ...entry, enabled: event.target.checked } : entry,
                      ),
                    )
                  }
                />
              </td>
              <td>
                <button
                  type="button"
                  aria-pressed={activeLineId === line.id}
                  data-testid={`liner-line-select-${line.id}`}
                  onClick={() => onDraftChange((current) => setActiveLineId(current, line.id))}
                >
                  {activeLineId === line.id
                    ? ja.liner.lineManager.current
                    : ja.liner.lineManager.select}
                </button>
              </td>
              <td>
                <button
                  type="button"
                  data-testid={`liner-line-move-up-${line.id}`}
                  onClick={() => moveLine(line.id, -1)}
                >
                  {ja.liner.editor.moveUp}
                </button>
                <button
                  type="button"
                  data-testid={`liner-line-move-down-${line.id}`}
                  onClick={() => moveLine(line.id, 1)}
                >
                  {ja.liner.editor.moveDown}
                </button>
                <button
                  type="button"
                  data-testid={`liner-line-remove-${line.id}`}
                  onClick={() => {
                    const nextLines = offsetLines.filter((entry) => entry.id !== line.id);
                    onDraftChange((current) => {
                      const updated = updateActiveAlignmentOffsetLines(current, nextLines);
                      if (updated.activeLineId === line.id) {
                        return { ...updated, activeLineId: undefined };
                      }
                      return updated;
                    });
                  }}
                >
                  {ja.liner.editor.remove}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        data-testid="liner-line-add"
        onClick={() => {
          const newId = nextOffsetLineId(offsetLines);
          const newLine: CrossSectionOffsetLineDraft = {
            id: newId,
            offset: 0,
            elevation: 0,
            role: "custom",
            enabled: true,
            sortIndex: offsetLines.length,
            baseLineId: centerlineId,
          };
          updateLines([...offsetLines, newLine]);
        }}
      >
        {ja.liner.lineManager.add}
      </button>
    </section>
  );
}
