import { ja } from "../../i18n/ja";
import type { LinerDraft } from "../adapters/linerUiAdapter";
import {
  addLinerAlignmentBundle,
  removeLinerAlignmentBundle,
  renameLinerAlignmentBundle,
  reorderLinerAlignmentBundles,
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
    <section className="liner-edit-panel" aria-labelledby="liner-alignment-manager-title">
      <h2 id="liner-alignment-manager-title">{ja.liner.alignmentManager.title}</h2>
      <p className="liner-edit-help">{ja.liner.alignmentManager.lead}</p>
      <div className="liner-alignment-manager-actions">
        <button
          type="button"
          data-testid="liner-alignment-add"
          onClick={() => onDraftChange((current) => addLinerAlignmentBundle(current))}
        >
          {ja.liner.alignmentManager.add}
        </button>
      </div>
      <table className="liner-alignment-table" data-testid="liner-alignment-table">
        <caption>{ja.liner.alignmentManager.tableCaption}</caption>
        <thead>
          <tr>
            <th scope="col">{ja.liner.alignmentManager.name}</th>
            <th scope="col">{ja.liner.alignmentManager.id}</th>
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
                className={selected ? "liner-alignment-row active" : "liner-alignment-row"}
              >
                <td>
                  <CompositionAwareInput
                    value={bundle.name}
                    data-testid={`liner-alignment-name-${bundle.id}`}
                    onCompositionStateChange={onCompositionStateChange}
                    onValueChange={(value) =>
                      onDraftChange((current) => renameLinerAlignmentBundle(current, bundle.id, value))
                    }
                  />
                </td>
                <td>{bundle.id}</td>
                <td>
                  <button
                    type="button"
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
                <td>
                  <button
                    type="button"
                    data-testid={`liner-alignment-move-up-${bundle.id}`}
                    onClick={() => moveAlignment(bundle.id, -1)}
                    disabled={bundle.sortIndex <= 0}
                  >
                    {ja.liner.editor.moveUp}
                  </button>
                  <button
                    type="button"
                    data-testid={`liner-alignment-move-down-${bundle.id}`}
                    onClick={() => moveAlignment(bundle.id, 1)}
                    disabled={bundle.sortIndex >= bundles.length - 1}
                  >
                    {ja.liner.editor.moveDown}
                  </button>
                  <button
                    type="button"
                    data-testid={`liner-alignment-remove-${bundle.id}`}
                    onClick={() =>
                      onDraftChange((current) => removeLinerAlignmentBundle(current, bundle.id))
                    }
                    disabled={bundles.length <= 1}
                  >
                    {ja.liner.editor.remove}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {activeId && (
        <p className="liner-edit-help" data-testid="liner-active-alignment-indicator">
          {ja.liner.alignmentManager.activeIndicator(activeId)}
        </p>
      )}
    </section>
  );
}
