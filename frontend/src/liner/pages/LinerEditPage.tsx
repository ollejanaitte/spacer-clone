import { ArrowLeft, Eye, FilePlus2, Trash2 } from "lucide-react";
import { useMemo, useState, type ChangeEvent } from "react";
import { ja } from "../../i18n/ja";
import { LinerStationProfilePanel } from "../components/LinerStationProfilePanel";
import {
  addLinerStraightElement,
  createDefaultLinerDraft,
  removeLinerAlignmentElement,
  summarizeLinerDraft,
  updateLinerAlignmentMetadata,
  updateLinerStraightElement,
  type LinerDraft,
  type LinerDraftAlignmentElement,
  type LinerDraftUpdate,
} from "../adapters/linerUiAdapter";

export type LinerEditPageProps = {
  draft?: LinerDraft;
  initialDraft?: LinerDraft;
  onDraftChange?: (update: LinerDraftUpdate) => void;
  onOpenPreview?: () => void;
  onOpenMappingReview?: () => void;
  onClose: () => void;
  onBackToList: () => void;
};

type TextInputEvent = ChangeEvent<HTMLInputElement>;

function numericValue(value: number | undefined): string {
  return Number.isFinite(value) ? String(value) : "";
}

function parseNumericInput(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function elementTypeLabel(element: LinerDraftAlignmentElement): string {
  if (element.type === "straight") {
    return ja.liner.fields.elementTypes.straight;
  }
  if (element.type === "arc") {
    return ja.liner.fields.elementTypes.arc;
  }
  return ja.liner.fields.elementTypes.clothoid;
}

export function LinerEditPage({
  draft: controlledDraft,
  initialDraft,
  onDraftChange,
  onOpenPreview,
  onOpenMappingReview,
  onClose,
  onBackToList,
}: LinerEditPageProps) {
  const [localDraft, setLocalDraft] = useState<LinerDraft>(() => initialDraft ?? createDefaultLinerDraft());
  const draft = controlledDraft ?? localDraft;
  const changeDraft = (update: LinerDraftUpdate) => {
    if (onDraftChange) {
      onDraftChange(update);
    } else {
      setLocalDraft((current) => (typeof update === "function" ? update(current) : update));
    }
  };
  const summary = useMemo(() => summarizeLinerDraft(draft), [draft]);

  return (
    <main className="liner-edit-page" data-testid="liner-edit-page">
      <header className="liner-edit-header">
        <div>
          <h1>{ja.liner.editor.title}</h1>
          <p>{ja.liner.editor.lead}</p>
        </div>
        <div className="liner-edit-header-actions">
          <button type="button" onClick={onClose} data-testid="close-liner-edit">
            <ArrowLeft size={16} />
            {ja.liner.list.close}
          </button>
          <button type="button" onClick={onBackToList} data-testid="back-to-liner-list">
            {ja.liner.list.backToList}
          </button>
          {onOpenPreview && (
            <button type="button" onClick={onOpenPreview} data-testid="open-liner-preview">
              <Eye size={16} />
              {ja.liner.preview.openPreview}
            </button>
          )}
          {onOpenMappingReview && (
            <button type="button" onClick={onOpenMappingReview} data-testid="open-liner-mapping-review">
              <FilePlus2 size={16} />
              {ja.liner.mappingReview.openReview}
            </button>
          )}
        </div>
      </header>

      <div className="liner-edit-layout">
        <section className="liner-edit-panel" aria-labelledby="liner-edit-metadata-title">
          <h2 id="liner-edit-metadata-title">{ja.liner.editor.metadataSection}</h2>
          <div className="liner-edit-form-grid">
            <label>
              <span>{ja.liner.fields.alignmentId}</span>
              <input
                value={draft.alignment.id}
                data-testid="liner-alignment-id"
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  changeDraft((current) => updateLinerAlignmentMetadata(current, { id: value }));
                }}
              />
            </label>
            <label>
              <span>{ja.liner.fields.linerModelId}</span>
              <input
                value={draft.alignment.linerModelId}
                data-testid="liner-model-id"
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  changeDraft((current) =>
                    updateLinerAlignmentMetadata(current, { linerModelId: value }),
                  );
                }}
              />
            </label>
            <label>
              <span>{ja.liner.fields.coordinatePolicyId}</span>
              <input
                value={draft.alignment.coordinatePolicyId}
                data-testid="liner-coordinate-policy-id"
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  changeDraft((current) =>
                    updateLinerAlignmentMetadata(current, { coordinatePolicyId: value }),
                  );
                }}
              />
            </label>
          </div>
        </section>

        <aside className="liner-edit-summary" aria-label={ja.liner.editor.summarySection}>
          <h2>{ja.liner.editor.summarySection}</h2>
          <dl>
            <div>
              <dt>{ja.liner.editor.summaryElements}</dt>
              <dd>{ja.liner.editor.count(summary.elementCount)}</dd>
            </div>
            <div>
              <dt>{ja.liner.editor.summaryOffsets}</dt>
              <dd>{ja.liner.editor.count(summary.offsetCount)}</dd>
            </div>
            <div>
              <dt>{ja.liner.editor.summaryLength}</dt>
              <dd data-testid="liner-summary-length">{ja.liner.editor.meters(summary.totalDeclaredLength)}</dd>
            </div>
          </dl>
          <p>{ja.liner.editor.localDraftNotice}</p>
        </aside>
      </div>

      <LinerStationProfilePanel draft={draft} onDraftChange={changeDraft} />

      <section className="liner-edit-panel" aria-labelledby="liner-edit-elements-title">
        <div className="liner-edit-section-header">
          <h2 id="liner-edit-elements-title">{ja.liner.editor.elementSection}</h2>
          <button
            type="button"
            onClick={() => changeDraft((current) => addLinerStraightElement(current))}
            data-testid="add-liner-straight-element"
          >
            <FilePlus2 size={16} />
            {ja.liner.editor.addStraightElement}
          </button>
        </div>
        <div className="liner-edit-table-wrap">
          <table className="liner-edit-table">
            <caption>{ja.liner.editor.elementTableCaption}</caption>
            <thead>
              <tr>
                <th>{ja.liner.fields.elementId}</th>
                <th>{ja.liner.fields.elementType}</th>
                <th>{ja.liner.fields.startX}</th>
                <th>{ja.liner.fields.startY}</th>
                <th>{ja.liner.fields.azimuth}</th>
                <th>{ja.liner.fields.length}</th>
                <th>{ja.liner.fields.actions}</th>
              </tr>
            </thead>
            <tbody>
              {draft.alignment.elements.map((element, elementIndex) => (
                <tr key={`${element.type}-${elementIndex}`}>
                  <td>
                    {element.type === "straight" ? (
                      <input
                        value={element.id}
                        data-testid={`liner-element-id-${element.id}`}
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          changeDraft((current) =>
                            updateLinerStraightElement(current, element.id, { id: value }),
                          );
                        }}
                      />
                    ) : (
                      <span>{element.id}</span>
                    )}
                  </td>
                  <td>{elementTypeLabel(element)}</td>
                  {element.type === "straight" ? (
                    <>
                      <td>
                        <input
                          type="number"
                          value={numericValue(element.start.x)}
                          data-testid={`liner-element-start-x-${element.id}`}
                          onChange={(event: TextInputEvent) => {
                            const value = parseNumericInput(event.currentTarget.value);
                            changeDraft((current) =>
                              updateLinerStraightElement(current, element.id, {
                                startX: value,
                              }),
                            );
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={numericValue(element.start.y)}
                          data-testid={`liner-element-start-y-${element.id}`}
                          onChange={(event: TextInputEvent) => {
                            const value = parseNumericInput(event.currentTarget.value);
                            changeDraft((current) =>
                              updateLinerStraightElement(current, element.id, {
                                startY: value,
                              }),
                            );
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={numericValue(element.azimuth)}
                          data-testid={`liner-element-azimuth-${element.id}`}
                          onChange={(event: TextInputEvent) => {
                            const value = parseNumericInput(event.currentTarget.value);
                            changeDraft((current) =>
                              updateLinerStraightElement(current, element.id, {
                                azimuth: value,
                              }),
                            );
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={numericValue(element.length)}
                          onChange={(event: TextInputEvent) => {
                            const value = parseNumericInput(event.currentTarget.value);
                            changeDraft((current) =>
                              updateLinerStraightElement(current, element.id, {
                                length: value,
                              }),
                            );
                          }}
                          data-testid={`liner-element-length-${element.id}`}
                        />
                      </td>
                    </>
                  ) : (
                    <td colSpan={4}>{ja.liner.editor.unsupportedElementNotice}</td>
                  )}
                  <td>
                    <button
                      type="button"
                      onClick={() => changeDraft((current) => removeLinerAlignmentElement(current, element.id))}
                      disabled={draft.alignment.elements.length <= 1}
                      data-testid={`remove-liner-element-${element.id}`}
                      title={ja.liner.editor.removeElement}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
