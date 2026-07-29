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

  const addOffsetLine = () => {
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
  };

  const centerlineSelected = activeLineId === centerlineId;

  return (
    <section
      className="liner-edit-panel liner-line-card liner-line-offset-card"
      aria-labelledby="liner-line-manager-title"
    >
      <div className="liner-line-card-header">
        <div className="liner-line-card-heading">
          <h2 id="liner-line-manager-title">{ja.liner.lineManager.title}</h2>
          <p className="liner-edit-help liner-line-card-lead">{ja.liner.lineManager.lead}</p>
        </div>
        <div className="liner-line-card-actions">
          <button
            type="button"
            className="liner-action-btn"
            data-testid="liner-line-add"
            onClick={addOffsetLine}
          >
            {ja.liner.lineManager.add}
          </button>
        </div>
      </div>
      <div className="liner-line-table-wrap">
        <table className="liner-edit-table liner-line-table" data-testid="liner-line-table">
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
            <tr
              data-testid="liner-line-row-centerline"
              className={centerlineSelected ? "liner-line-row base-line is-selected" : "liner-line-row base-line"}
              aria-selected={centerlineSelected}
            >
              <td className="liner-line-name-cell">{ja.liner.lineManager.centerlineLabel}</td>
              <td className="liner-line-id-cell" title={centerlineId}>
                <span className="liner-line-id-text">{centerlineId}</span>
              </td>
              <td className="liner-line-base-cell">{ja.liner.lineManager.baseSelf}</td>
              <td className="liner-line-toggle-cell" aria-hidden="true">
                —
              </td>
              <td className="liner-line-select-cell">
                <button
                  type="button"
                  className={centerlineSelected ? "liner-line-select-btn is-current" : "liner-line-select-btn"}
                  aria-pressed={centerlineSelected}
                  data-testid="liner-line-select-centerline"
                  onClick={() => onDraftChange((current) => setActiveLineId(current, centerlineId))}
                >
                  {centerlineSelected
                    ? ja.liner.lineManager.current
                    : ja.liner.lineManager.select}
                </button>
              </td>
              <td className="liner-line-actions-cell">
                <span className="liner-line-protected-note">{ja.liner.lineManager.centerlineProtected}</span>
              </td>
            </tr>
            {offsetLines.map((line) => {
              const selected = activeLineId === line.id;
              const lineLabel = line.label ?? line.id;
              return (
                <tr
                  key={line.id}
                  data-testid={`liner-line-row-${line.id}`}
                  className={selected ? "liner-line-row is-selected" : "liner-line-row"}
                  aria-selected={selected}
                >
                  <td className="liner-line-name-cell">
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
                  <td className="liner-line-id-cell" title={line.id}>
                    <span className="liner-line-id-text">{line.id}</span>
                  </td>
                  <td className="liner-line-base-cell" title={line.baseLineId ?? centerlineId}>
                    <span className="liner-line-id-text">{line.baseLineId ?? centerlineId}</span>
                  </td>
                  <td className="liner-line-toggle-cell">
                    <input
                      type="checkbox"
                      checked={line.enabled !== false}
                      data-testid={`liner-line-enabled-${line.id}`}
                      aria-label={`${ja.liner.lineManager.enabled}: ${lineLabel}`}
                      onChange={(event) =>
                        updateLines(
                          offsetLines.map((entry) =>
                            entry.id === line.id ? { ...entry, enabled: event.target.checked } : entry,
                          ),
                        )
                      }
                    />
                  </td>
                  <td className="liner-line-select-cell">
                    <button
                      type="button"
                      className={selected ? "liner-line-select-btn is-current" : "liner-line-select-btn"}
                      aria-pressed={selected}
                      data-testid={`liner-line-select-${line.id}`}
                      onClick={() => onDraftChange((current) => setActiveLineId(current, line.id))}
                    >
                      {activeLineId === line.id
                        ? ja.liner.lineManager.current
                        : ja.liner.lineManager.select}
                    </button>
                  </td>
                  <td className="liner-line-actions-cell">
                    <div className="liner-row-actions" role="group" aria-label={ja.liner.lineManager.actions}>
                      <button
                        type="button"
                        className="liner-line-row-btn"
                        data-testid={`liner-line-move-up-${line.id}`}
                        onClick={() => moveLine(line.id, -1)}
                        aria-label={`${ja.liner.editor.moveUp}: ${lineLabel}`}
                      >
                        {ja.liner.editor.moveUp}
                      </button>
                      <button
                        type="button"
                        className="liner-line-row-btn"
                        data-testid={`liner-line-move-down-${line.id}`}
                        onClick={() => moveLine(line.id, 1)}
                        aria-label={`${ja.liner.editor.moveDown}: ${lineLabel}`}
                      >
                        {ja.liner.editor.moveDown}
                      </button>
                      <button
                        type="button"
                        className="liner-line-row-btn liner-line-row-btn-danger"
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
                        aria-label={`${ja.liner.editor.remove}: ${lineLabel}`}
                        title={ja.liner.editor.remove}
                      >
                        {ja.liner.editor.remove}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
