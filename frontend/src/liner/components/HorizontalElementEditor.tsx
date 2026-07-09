import { FilePlus2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { ja } from "../../i18n/ja";
import {
  addLinerArcElement,
  addLinerClothoidElement,
  addLinerStraightElement,
  removeLinerAlignmentElementAtIndex,
  updateLinerAlignmentElementAtIndex,
  type LinerDraft,
  type LinerDraftAlignmentElement,
} from "../adapters/linerUiAdapter";
import { CompositionAwareInput } from "./CompositionAwareInput";

export type HorizontalElementEditorProps = {
  draft: LinerDraft;
  onDraftChange: (nextDraft: LinerDraft) => void;
  onInputValidityChange?: (fieldKey: string, valid: boolean) => void;
  onCompositionStateChange?: (composing: boolean) => void;
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

let horizontalRowKeySequence = 0;

export function HorizontalElementEditor({
  draft,
  onDraftChange,
  onInputValidityChange,
  onCompositionStateChange,
}: HorizontalElementEditorProps) {
  const [numericInputText, setNumericInputText] = useState<Record<string, string>>({});
  const rowKeys = useRef<string[]>([]);
  while (rowKeys.current.length < draft.alignment.elements.length) {
    horizontalRowKeySequence += 1;
    rowKeys.current.push(`horizontal-row-${horizontalRowKeySequence}`);
  }
  const numericFieldKey = (rowKey: string, field: NumericField) => `${rowKey}:${field}`;
  const numericInputValue = (
    rowKey: string,
    field: NumericField,
    fallback: string,
  ): string => numericInputText[numericFieldKey(rowKey, field)] ?? fallback;
  const updateNumericInput = (
    rowKey: string,
    field: NumericField,
    value: string,
    applyValue: (value: string) => void,
  ) => {
    const key = numericFieldKey(rowKey, field);
    setNumericInputText((current) => ({ ...current, [key]: value }));
    const parsed = Number(value);
    const valid = value.trim() !== "" && Number.isFinite(parsed);
    onInputValidityChange?.(`horizontal:${rowKeys.current.indexOf(rowKey)}:${field}`, valid);
    if (valid) {
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
            {draft.alignment.elements.map((element, elementIndex) => {
              const rowKey = rowKeys.current[elementIndex]!;
              return (
              <tr key={rowKey} data-testid={`liner-horizontal-element-row-${element.id}`}>
                <td>
                  <CompositionAwareInput
                    value={element.id ?? ""}
                    onCompositionStateChange={onCompositionStateChange}
                    onValueChange={(value) =>
                      onDraftChange(updateLinerAlignmentElementAtIndex(draft, elementIndex, { id: value }))
                    }
                    data-testid={`liner-element-id-${element.id}`}
                  />
                </td>
                <td>{elementTypeLabel(element)}</td>
                <td>
                  <CompositionAwareInput
                    type="number"
                    value={numericInputValue(rowKey, "startX", numericValue(element.start.x))}
                    onCompositionStateChange={onCompositionStateChange}
                    onValueChange={(nextValue) => {
                      updateNumericInput(rowKey, "startX", nextValue, (value) =>
                        onDraftChange(
                          updateLinerAlignmentElementAtIndex(draft, elementIndex, {
                            startX: parseNumericInput(value),
                          }),
                        ),
                      );
                    }}
                    data-testid={`liner-element-start-x-${element.id}`}
                  />
                </td>
                <td>
                  <CompositionAwareInput
                    type="number"
                    value={numericInputValue(rowKey, "startY", numericValue(element.start.y))}
                    onCompositionStateChange={onCompositionStateChange}
                    onValueChange={(nextValue) => {
                      updateNumericInput(rowKey, "startY", nextValue, (value) =>
                        onDraftChange(
                          updateLinerAlignmentElementAtIndex(draft, elementIndex, {
                            startY: parseNumericInput(value),
                          }),
                        ),
                      );
                    }}
                    data-testid={`liner-element-start-y-${element.id}`}
                  />
                </td>
                <td>
                  <CompositionAwareInput
                    type="number"
                    value={numericInputValue(rowKey, "azimuth", numericValue(element.azimuth))}
                    onCompositionStateChange={onCompositionStateChange}
                    onValueChange={(nextValue) => {
                      updateNumericInput(rowKey, "azimuth", nextValue, (value) =>
                        onDraftChange(
                          updateLinerAlignmentElementAtIndex(draft, elementIndex, {
                            azimuth: parseNumericInput(value),
                          }),
                        ),
                      );
                    }}
                    data-testid={`liner-element-azimuth-${element.id}`}
                  />
                </td>
                <td>
                  <CompositionAwareInput
                    type="number"
                    value={numericInputValue(rowKey, "length", numericValue(element.length))}
                    onCompositionStateChange={onCompositionStateChange}
                    onValueChange={(nextValue) => {
                      updateNumericInput(rowKey, "length", nextValue, (value) =>
                        onDraftChange(
                          updateLinerAlignmentElementAtIndex(draft, elementIndex, {
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
                    <CompositionAwareInput
                      type="number"
                      value={numericInputValue(rowKey, "radius", numericValue(element.radius))}
                      onCompositionStateChange={onCompositionStateChange}
                      onValueChange={(nextValue) => {
                        updateNumericInput(rowKey, "radius", nextValue, (value) =>
                          onDraftChange(
                            updateLinerAlignmentElementAtIndex(draft, elementIndex, {
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
                          updateLinerAlignmentElementAtIndex(draft, elementIndex, {
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
                    <CompositionAwareInput
                      type="number"
                      value={numericInputValue(rowKey, "clothoidParameter", numericValue(element.clothoidParameter))}
                      onCompositionStateChange={onCompositionStateChange}
                      onValueChange={(nextValue) => {
                        updateNumericInput(rowKey, "clothoidParameter", nextValue, (value) =>
                          onDraftChange(
                            updateLinerAlignmentElementAtIndex(draft, elementIndex, {
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
                    <CompositionAwareInput
                      type="number"
                      value={numericInputValue(rowKey, "startRadius", optionalNumericValue(element.startRadius))}
                      onCompositionStateChange={onCompositionStateChange}
                      onValueChange={(nextValue) => {
                        updateNumericInput(rowKey, "startRadius", nextValue, (value) =>
                          onDraftChange(
                            updateLinerAlignmentElementAtIndex(draft, elementIndex, {
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
                    <CompositionAwareInput
                      type="number"
                      value={numericInputValue(rowKey, "endRadius", optionalNumericValue(element.endRadius))}
                      onCompositionStateChange={onCompositionStateChange}
                      onValueChange={(nextValue) => {
                        updateNumericInput(rowKey, "endRadius", nextValue, (value) =>
                          onDraftChange(
                            updateLinerAlignmentElementAtIndex(draft, elementIndex, {
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
                    onClick={() => {
                      rowKeys.current.splice(elementIndex, 1);
                      onDraftChange(removeLinerAlignmentElementAtIndex(draft, elementIndex));
                    }}
                    disabled={draft.alignment.elements.length <= 1}
                    data-testid={`remove-liner-element-${element.id}`}
                    title={ja.liner.editor.removeElement}
                  >
                    <Trash2 size={16} />
                  </button>
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
