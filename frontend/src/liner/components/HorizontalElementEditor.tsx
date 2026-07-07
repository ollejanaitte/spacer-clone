import { FilePlus2, Trash2 } from "lucide-react";
import { useState } from "react";
import { ja } from "../../i18n/ja";
import {
  addLinerArcElement,
  addLinerClothoidElement,
  addLinerStraightElement,
  removeLinerAlignmentElement,
  updateLinerAlignmentElement,
  type LinerDraft,
  type LinerDraftAlignmentElement,
} from "../adapters/linerUiAdapter";

export type HorizontalElementEditorProps = {
  draft: LinerDraft;
  onDraftChange: (nextDraft: LinerDraft) => void;
};

function numericValue(value: number | undefined): string {
  return Number.isFinite(value) ? String(value) : "";
}

function optionalNumericValue(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  return Number.isFinite(value) ? String(value) : "";
}

function parseNumericInput(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseOptionalNumericInput(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

type NumericField = "startX" | "startY" | "azimuth" | "length" | "radius" | "clothoidParameter" | "startRadius" | "endRadius";

function elementTypeLabel(element: LinerDraftAlignmentElement): string {
  if (element.type === "straight") {
    return ja.liner.fields.elementTypes.straight;
  }
  if (element.type === "arc") {
    return ja.liner.fields.elementTypes.arc;
  }
  return ja.liner.fields.elementTypes.clothoid;
}

function clothoidTurnValue(element: LinerDraftAlignmentElement & { type: "clothoid" }): "left" | "right" {
  return element.turn ?? "left";
}

export function HorizontalElementEditor({ draft, onDraftChange }: HorizontalElementEditorProps) {
  const [numericInputText, setNumericInputText] = useState<Record<string, string>>({});
  const numericFieldKey = (element: LinerDraftAlignmentElement, field: NumericField) =>
    `${element.type}:${element.id}:${field}`;
  const numericInputValue = (
    element: LinerDraftAlignmentElement,
    field: NumericField,
    fallback: string,
  ): string => numericInputText[numericFieldKey(element, field)] ?? fallback;
  const updateNumericInput = (
    element: LinerDraftAlignmentElement,
    field: NumericField,
    value: string,
    applyValue: (value: string) => void,
  ) => {
    const key = numericFieldKey(element, field);
    setNumericInputText((current) => ({ ...current, [key]: value }));
    if (value.trim() !== "") {
      applyValue(value);
    }
  };
  return (
    <section className="liner-edit-panel" aria-labelledby="liner-edit-elements-title">
      <div className="liner-edit-section-header">
        <h2 id="liner-edit-elements-title">{ja.liner.editor.elementSection}</h2>
        <div className="liner-edit-inline-row">
          <button
            type="button"
            onClick={() => onDraftChange(addLinerStraightElement(draft))}
            data-testid="add-liner-straight-element"
          >
            <FilePlus2 size={16} />
            {ja.liner.editor.addStraightElement}
          </button>
          <button
            type="button"
            onClick={() => onDraftChange(addLinerArcElement(draft))}
            data-testid="add-liner-arc-element"
          >
            <FilePlus2 size={16} />
            {ja.liner.editor.addArcElement}
          </button>
          <button
            type="button"
            onClick={() => onDraftChange(addLinerClothoidElement(draft))}
            data-testid="add-liner-clothoid-element"
          >
            <FilePlus2 size={16} />
            {ja.liner.editor.addClothoidElement}
          </button>
        </div>
      </div>
      <div className="liner-edit-table-wrap">
        <table className="liner-edit-table liner-horizontal-element-table">
          <caption>{ja.liner.editor.elementTableCaption}</caption>
          <thead>
            <tr>
              <th>{ja.liner.fields.elementId}</th>
              <th>{ja.liner.fields.elementType}</th>
              <th>{ja.liner.fields.startX}</th>
              <th>{ja.liner.fields.startY}</th>
              <th>{ja.liner.fields.azimuth}</th>
              <th>{ja.liner.fields.length}</th>
              <th>{ja.liner.fields.radius}</th>
              <th>{ja.liner.fields.turn}</th>
              <th>{ja.liner.fields.clothoidParameter}</th>
              <th>{ja.liner.fields.startRadius}</th>
              <th>{ja.liner.fields.endRadius}</th>
              <th>{ja.liner.fields.actions}</th>
            </tr>
          </thead>
          <tbody>
            {draft.alignment.elements.map((element, elementIndex) => (
              <tr key={`${element.type}-${elementIndex}`} data-testid={`liner-horizontal-element-row-${element.id}`}>
                <td>
                  <input
                    value={element.id}
                    onChange={(event) =>
                      onDraftChange(updateLinerAlignmentElement(draft, element.id, { id: event.currentTarget.value }))
                    }
                    data-testid={`liner-element-id-${element.id}`}
                  />
                </td>
                <td>{elementTypeLabel(element)}</td>
                <td>
                  <input
                    type="number"
                    value={numericInputValue(element, "startX", numericValue(element.start.x))}
                    onChange={(event) => {
                      updateNumericInput(element, "startX", event.currentTarget.value, (value) =>
                        onDraftChange(
                          updateLinerAlignmentElement(draft, element.id, {
                            startX: parseNumericInput(value),
                          }),
                        ),
                      );
                    }}
                    data-testid={`liner-element-start-x-${element.id}`}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={numericInputValue(element, "startY", numericValue(element.start.y))}
                    onChange={(event) => {
                      updateNumericInput(element, "startY", event.currentTarget.value, (value) =>
                        onDraftChange(
                          updateLinerAlignmentElement(draft, element.id, {
                            startY: parseNumericInput(value),
                          }),
                        ),
                      );
                    }}
                    data-testid={`liner-element-start-y-${element.id}`}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={numericInputValue(element, "azimuth", numericValue(element.azimuth))}
                    onChange={(event) => {
                      updateNumericInput(element, "azimuth", event.currentTarget.value, (value) =>
                        onDraftChange(
                          updateLinerAlignmentElement(draft, element.id, {
                            azimuth: parseNumericInput(value),
                          }),
                        ),
                      );
                    }}
                    data-testid={`liner-element-azimuth-${element.id}`}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={numericInputValue(element, "length", numericValue(element.length))}
                    onChange={(event) => {
                      updateNumericInput(element, "length", event.currentTarget.value, (value) =>
                        onDraftChange(
                          updateLinerAlignmentElement(draft, element.id, {
                            length: parseNumericInput(value),
                          }),
                        ),
                      );
                    }}
                    data-testid={`liner-element-length-${element.id}`}
                  />
                </td>
                <td>
                  {element.type === "arc" ? (
                    <input
                      type="number"
                      value={numericInputValue(element, "radius", numericValue(element.radius))}
                      onChange={(event) => {
                        updateNumericInput(element, "radius", event.currentTarget.value, (value) =>
                          onDraftChange(
                            updateLinerAlignmentElement(draft, element.id, {
                              radius: parseNumericInput(value),
                            }),
                          ),
                        );
                      }}
                      data-testid={`liner-element-radius-${element.id}`}
                    />
                  ) : (
                    <span aria-hidden="true">—</span>
                  )}
                </td>
                <td>
                  {element.type === "arc" || element.type === "clothoid" ? (
                    <select
                      value={element.type === "arc" ? element.turn : clothoidTurnValue(element)}
                      onChange={(event) =>
                        onDraftChange(
                          updateLinerAlignmentElement(draft, element.id, {
                            turn: event.currentTarget.value as "left" | "right",
                          }),
                        )
                      }
                      data-testid={`liner-element-turn-${element.id}`}
                    >
                      <option value="left">{ja.liner.fields.turnDirections.left}</option>
                      <option value="right">{ja.liner.fields.turnDirections.right}</option>
                    </select>
                  ) : (
                    <span aria-hidden="true">—</span>
                  )}
                </td>
                <td>
                  {element.type === "clothoid" ? (
                    <input
                      type="number"
                      value={numericInputValue(element, "clothoidParameter", numericValue(element.clothoidParameter))}
                      onChange={(event) => {
                        updateNumericInput(element, "clothoidParameter", event.currentTarget.value, (value) =>
                          onDraftChange(
                            updateLinerAlignmentElement(draft, element.id, {
                              clothoidParameter: parseNumericInput(value),
                            }),
                          ),
                        );
                      }}
                      data-testid={`liner-element-clothoid-parameter-${element.id}`}
                    />
                  ) : (
                    <span aria-hidden="true">—</span>
                  )}
                </td>
                <td>
                  {element.type === "clothoid" ? (
                    <input
                      type="number"
                      value={numericInputValue(element, "startRadius", optionalNumericValue(element.startRadius))}
                      onChange={(event) => {
                        updateNumericInput(element, "startRadius", event.currentTarget.value, (value) =>
                          onDraftChange(
                            updateLinerAlignmentElement(draft, element.id, {
                              startRadius: parseOptionalNumericInput(value),
                            }),
                          ),
                        );
                      }}
                      data-testid={`liner-element-start-radius-${element.id}`}
                    />
                  ) : (
                    <span aria-hidden="true">—</span>
                  )}
                </td>
                <td>
                  {element.type === "clothoid" ? (
                    <input
                      type="number"
                      value={numericInputValue(element, "endRadius", optionalNumericValue(element.endRadius))}
                      onChange={(event) => {
                        updateNumericInput(element, "endRadius", event.currentTarget.value, (value) =>
                          onDraftChange(
                            updateLinerAlignmentElement(draft, element.id, {
                              endRadius: parseOptionalNumericInput(value),
                            }),
                          ),
                        );
                      }}
                      data-testid={`liner-element-end-radius-${element.id}`}
                    />
                  ) : (
                    <span aria-hidden="true">—</span>
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => onDraftChange(removeLinerAlignmentElement(draft, element.id))}
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
  );
}
