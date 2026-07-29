import { ja } from "../../i18n/ja";
import type { LinerDraft } from "../adapters/linerUiAdapter";
import {
  addLinerAlignmentBundle,
  removeLinerAlignmentBundle,
  renameLinerAlignmentBundle,
  reorderLinerAlignmentBundles,
  setLinerAlignmentEnabled,
  switchActiveAlignment,
} from "../adapters/linerUiAdapter";
import { CompositionAwareInput } from "./CompositionAwareInput";

export type AlignmentManagerProps = {
  draft: LinerDraft;
  onDraftChange: (update: LinerDraft | ((current: LinerDraft) => LinerDraft)) => void;
  onCompositionStateChange?: (composing: boolean) => void;
};

export function AlignmentManager({
  draft,
  onDraftChange,
  onCompositionStateChange,
}: AlignmentManagerProps) {
  const bundles = [...(draft.linerAlignments ?? [])].sort(
    (left, right) => left.sortIndex - right.sortIndex,
  );
  const activeId = draft.activeAlignmentId ?? draft.alignment.id;

  const moveAlignment = (alignmentId: string, direction: -1 | 1) => {
    const ids = bundles.map((bundle) => bundle.id);
    const index = ids.indexOf(alignmentId);
    if (index < 0) {
      return;
    }
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= ids.length) {
      return;
    }
    const nextIds = [...ids];
    const [removed] = nextIds.splice(index, 1);
    nextIds.splice(targetIndex, 0, removed!);
    onDraftChange((current) => reorderLinerAlignmentBundles(current, nextIds));
  };

  return (
    <section
      className="liner-edit-panel liner-line-card liner-line-alignment-card"
      aria-labelledby="liner-alignment-manager-title"
    >
      <div className="liner-line-card-header">
        <div className="liner-line-card-heading">
          <h2 id="liner-alignment-manager-title">{ja.liner.alignmentManager.title}</h2>
          <p className="liner-edit-help liner-line-card-lead">{ja.liner.alignmentManager.lead}</p>
        </div>
        <div className="liner-line-card-actions">
          <button
            type="button"
            className="liner-action-btn"
            data-testid="liner-alignment-add"
            onClick={() => onDraftChange((current) => addLinerAlignmentBundle(current))}
          >
            {ja.liner.alignmentManager.add}
          </button>
        </div>
      </div>
      <div className="liner-line-table-wrap">
        <table className="liner-edit-table liner-alignment-table" data-testid="liner-alignment-table">
          <caption>{ja.liner.alignmentManager.tableCaption}</caption>
          <thead>
            <tr>
              <th scope="col">{ja.liner.alignmentManager.name}</th>
              <th scope="col">{ja.liner.alignmentManager.id}</th>
              <th scope="col">{ja.liner.alignmentManager.enabled}</th>
              <th scope="col">{ja.liner.alignmentManager.active}</th>
              <th scope="col">{ja.liner.alignmentManager.actions}</th>
            </tr>
          </thead>
          <tbody>
            {bundles.map((bundle) => {
              const selected = bundle.id === activeId;
              return (
                <tr
                  key={bundle.id}
                  data-testid={`liner-alignment-row-${bundle.id}`}
                  className={selected ? "liner-alignment-row is-selected" : "liner-alignment-row"}
                  aria-selected={selected}
                >
                  <td className="liner-line-name-cell">
                    <CompositionAwareInput
                      value={bundle.name}
                      data-testid={`liner-alignment-name-${bundle.id}`}
                      onCompositionStateChange={onCompositionStateChange}
                      onValueChange={(value) =>
                        onDraftChange((current) => renameLinerAlignmentBundle(current, bundle.id, value))
                      }
                    />
                  </td>
                  <td className="liner-line-id-cell" title={bundle.id}>
                    <span className="liner-line-id-text">{bundle.id}</span>
                  </td>
                  <td className="liner-line-toggle-cell">
                    <input
                      type="checkbox"
                      checked={bundle.enabled !== false}
                      data-testid={`liner-alignment-enabled-${bundle.id}`}
                      aria-label={`${ja.liner.alignmentManager.enabled}: ${bundle.name}`}
                      onChange={(event) =>
                        onDraftChange((current) =>
                          setLinerAlignmentEnabled(current, bundle.id, event.target.checked),
                        )
                      }
                    />
                  </td>
                  <td className="liner-line-select-cell">
                    <button
                      type="button"
                      className={selected ? "liner-line-select-btn is-current" : "liner-line-select-btn"}
                      aria-pressed={selected}
                      data-testid={`liner-alignment-select-${bundle.id}`}
                      onClick={() =>
                        onDraftChange((current) => switchActiveAlignment(current, bundle.id))
                      }
                    >
                      {selected
                        ? ja.liner.alignmentManager.current
                        : ja.liner.alignmentManager.select}
                    </button>
                  </td>
                  <td className="liner-line-actions-cell">
                    <div className="liner-row-actions" role="group" aria-label={ja.liner.alignmentManager.actions}>
                      <button
                        type="button"
                        className="liner-line-row-btn"
                        data-testid={`liner-alignment-move-up-${bundle.id}`}
                        onClick={() => moveAlignment(bundle.id, -1)}
                        disabled={bundle.sortIndex <= 0}
                        aria-label={`${ja.liner.editor.moveUp}: ${bundle.name}`}
                      >
                        {ja.liner.editor.moveUp}
                      </button>
                      <button
                        type="button"
                        className="liner-line-row-btn"
                        data-testid={`liner-alignment-move-down-${bundle.id}`}
                        onClick={() => moveAlignment(bundle.id, 1)}
                        disabled={bundle.sortIndex >= bundles.length - 1}
                        aria-label={`${ja.liner.editor.moveDown}: ${bundle.name}`}
                      >
                        {ja.liner.editor.moveDown}
                      </button>
                      <button
                        type="button"
                        className="liner-line-row-btn liner-line-row-btn-danger"
                        data-testid={`liner-alignment-remove-${bundle.id}`}
                        onClick={() =>
                          onDraftChange((current) => removeLinerAlignmentBundle(current, bundle.id))
                        }
                        disabled={bundles.length <= 1}
                        aria-label={`${ja.liner.editor.remove}: ${bundle.name}`}
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
      {activeId && (
        <p className="liner-edit-help liner-line-active-indicator" data-testid="liner-active-alignment-indicator">
          {ja.liner.alignmentManager.activeIndicator(activeId)}
        </p>
      )}
    </section>
  );
}
