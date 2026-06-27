import { ArrowLeft, FilePlus2, Trash2 } from "lucide-react";
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
} from "../adapters/linerUiAdapter";

export type LinerEditPageProps = {
  initialDraft?: LinerDraft;
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

export function LinerEditPage({ initialDraft, onClose, onBackToList }: LinerEditPageProps) {
  const [draft, setDraft] = useState<LinerDraft>(() => initialDraft ?? createDefaultLinerDraft());
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
                  setDraft((current) => updateLinerAlignmentMetadata(current, { id: event.currentTarget.value }));
                }}
              />
            </label>
            <label>
              <span>{ja.liner.fields.linerModelId}</span>
              <input
                value={draft.alignment.linerModelId}
                onChange={(event) => {
                  setDraft((current) =>
                    updateLinerAlignmentMetadata(current, { linerModelId: event.currentTarget.value }),
                  );
                }}
              />
            </label>
            <label>
              <span>{ja.liner.fields.coordinatePolicyId}</span>
              <input
                value={draft.alignment.coordinatePolicyId}
                onChange={(event) => {
                  setDraft((current) =>
                    updateLinerAlignmentMetadata(current, { coordinatePolicyId: event.currentTarget.value }),
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

      <LinerStationProfilePanel draft={draft} onDraftChange={setDraft} />

      <section className="liner-edit-panel" aria-labelledby="liner-edit-elements-title">
        <div className="liner-edit-section-header">
          <h2 id="liner-edit-elements-title">{ja.liner.editor.elementSection}</h2>
          <button
            type="button"
            onClick={() => setDraft((current) => addLinerStraightElement(current))}
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
              {draft.alignment.elements.map((element) => (
                <tr key={element.id}>
                  <td>
                    {element.type === "straight" ? (
                      <input
                        value={element.id}
                        onChange={(event) => {
                          setDraft((current) =>
                            updateLinerStraightElement(current, element.id, { id: event.currentTarget.value }),
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
                          onChange={(event: TextInputEvent) => {
                            setDraft((current) =>
                              updateLinerStraightElement(current, element.id, {
                                startX: parseNumericInput(event.currentTarget.value),
                              }),
                            );
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={numericValue(element.start.y)}
                          onChange={(event: TextInputEvent) => {
                            setDraft((current) =>
                              updateLinerStraightElement(current, element.id, {
                                startY: parseNumericInput(event.currentTarget.value),
                              }),
                            );
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={numericValue(element.azimuth)}
                          onChange={(event: TextInputEvent) => {
                            setDraft((current) =>
                              updateLinerStraightElement(current, element.id, {
                                azimuth: parseNumericInput(event.currentTarget.value),
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
                            setDraft((current) =>
                              updateLinerStraightElement(current, element.id, {
                                length: parseNumericInput(event.currentTarget.value),
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
                      onClick={() => setDraft((current) => removeLinerAlignmentElement(current, element.id))}
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
