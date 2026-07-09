import { FilePlus2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { ja } from "../../i18n/ja";
import {
  gradePercentToRatio,
  gradeRatioToPercent,
  roundGradePercent,
} from "../core/gradeConversion";
import type {
  VerticalAlignmentDraft,
  VerticalElementDraft,
  VerticalGradeElementDraft,
  VerticalParabolicElementDraft,
} from "../schema/types";

export type VerticalElementEditorProps = {
  verticalAlignment: VerticalAlignmentDraft;
  onVerticalAlignmentChange: (verticalAlignment: VerticalAlignmentDraft) => void;
  onInputValidityChange?: (fieldKey: string, valid: boolean) => void;
};

type VerticalElementFieldPatch = Partial<{
  id: string;
  startStation: number;
  endStation: number;
  startElevation: number | undefined;
  gradePercent: number;
  startGradePercent: number;
  endGradePercent: number;
  curveType: "crest" | "sag" | undefined;
}>;

function numericValue(value: number | undefined): string {
  return Number.isFinite(value) ? String(value) : "";
}

function gradePercentValue(gradeRatio: number): string {
  return Number.isFinite(gradeRatio) ? String(roundGradePercent(gradeRatioToPercent(gradeRatio))) : "";
}

function optionalNumericValue(value: number | undefined): string {
  if (value === undefined) {
    return "";
  }
  return Number.isFinite(value) ? String(value) : "";
}

function parseOptionalCurveType(value: string): "crest" | "sag" | undefined {
  if (value === "crest" || value === "sag") {
    return value;
  }
  return undefined;
}

function syncElementLength<T extends VerticalElementDraft>(element: T): T {
  const length = element.endStation - element.startStation;
  return {
    ...element,
    length,
  };
}

function nextVerticalElementId(prefix: string, elements: readonly VerticalElementDraft[]): string {
  const ids = new Set(elements.map((element) => element.id));
  let index = elements.length + 1;
  let candidate = `${prefix}${index}`;
  while (ids.has(candidate)) {
    index += 1;
    candidate = `${prefix}${index}`;
  }
  return candidate;
}

function previousElementEndStation(elements: readonly VerticalElementDraft[]): number {
  const last = elements[elements.length - 1];
  return last?.endStation ?? 0;
}

function addGradeElement(verticalAlignment: VerticalAlignmentDraft): VerticalAlignmentDraft {
  const startStation = previousElementEndStation(verticalAlignment.elements);
  const endStation = startStation + 50;
  const nextElement: VerticalGradeElementDraft = syncElementLength({
    type: "grade",
    id: nextVerticalElementId("VG", verticalAlignment.elements),
    startStation,
    endStation,
    startElevation: 0,
    grade: 0,
    length: endStation - startStation,
  });

  return {
    ...verticalAlignment,
    elements: [...verticalAlignment.elements, nextElement],
  };
}

function addParabolicElement(verticalAlignment: VerticalAlignmentDraft): VerticalAlignmentDraft {
  const startStation = previousElementEndStation(verticalAlignment.elements);
  const endStation = startStation + 50;
  const nextElement: VerticalParabolicElementDraft = syncElementLength({
    type: "parabolic",
    id: nextVerticalElementId("VP", verticalAlignment.elements),
    startStation,
    endStation,
    startGrade: 0,
    endGrade: 0,
    length: endStation - startStation,
  });

  return {
    ...verticalAlignment,
    elements: [...verticalAlignment.elements, nextElement],
  };
}

function removeVerticalElement(
  verticalAlignment: VerticalAlignmentDraft,
  targetElementIndex: number,
): VerticalAlignmentDraft {
  if (verticalAlignment.elements.length <= 1) {
    return verticalAlignment;
  }

  return {
    ...verticalAlignment,
    elements: verticalAlignment.elements.filter((_, elementIndex) => elementIndex !== targetElementIndex),
  };
}

function updateVerticalElement(
  verticalAlignment: VerticalAlignmentDraft,
  targetElementIndex: number,
  patch: VerticalElementFieldPatch,
): VerticalAlignmentDraft {
  return {
    ...verticalAlignment,
    elements: verticalAlignment.elements.map((element, elementIndex): VerticalElementDraft => {
      if (elementIndex !== targetElementIndex) {
        return element;
      }

      if (element.type === "grade") {
        const startStation = patch.startStation ?? element.startStation;
        const endStation = patch.endStation ?? element.endStation;
        return syncElementLength({
          ...element,
          id: patch.id ?? element.id,
          startStation,
          endStation,
          startElevation: patch.startElevation ?? element.startElevation,
          grade:
            patch.gradePercent !== undefined
              ? gradePercentToRatio(patch.gradePercent)
              : element.grade,
        });
      }

      const startStation = patch.startStation ?? element.startStation;
      const endStation = patch.endStation ?? element.endStation;
      const next: VerticalParabolicElementDraft = syncElementLength({
        ...element,
        id: patch.id ?? element.id,
        startStation,
        endStation,
        startGrade:
          patch.startGradePercent !== undefined
            ? gradePercentToRatio(patch.startGradePercent)
            : element.startGrade,
        endGrade:
          patch.endGradePercent !== undefined
            ? gradePercentToRatio(patch.endGradePercent)
            : element.endGrade,
      });

      if ("startElevation" in patch) {
        if (patch.startElevation === undefined) {
          delete next.startElevation;
        } else {
          next.startElevation = patch.startElevation;
        }
      }

      if ("curveType" in patch) {
        if (patch.curveType === undefined) {
          delete next.curveType;
        } else {
          next.curveType = patch.curveType;
        }
      }

      return next;
    }),
  };
}

function elementTypeLabel(element: VerticalElementDraft): string {
  if (element.type === "grade") {
    return ja.liner.fields.elementTypes.grade;
  }
  return ja.liner.fields.elementTypes.parabolic;
}

export function computeGradeEndElevation(element: VerticalGradeElementDraft): number {
  return element.startElevation + element.grade * element.length;
}

let verticalRowKeySequence = 0;

export function VerticalElementEditor({
  verticalAlignment,
  onVerticalAlignmentChange,
  onInputValidityChange,
}: VerticalElementEditorProps) {
  const [numericInputText, setNumericInputText] = useState<Record<string, string>>({});
  const rowKeys = useRef<string[]>([]);
  while (rowKeys.current.length < verticalAlignment.elements.length) {
    verticalRowKeySequence += 1;
    rowKeys.current.push(`vertical-row-${verticalRowKeySequence}`);
  }
  const numericInputValue = (rowKey: string, field: string, fallback: string) =>
    numericInputText[`${rowKey}:${field}`] ?? fallback;
  const updateNumericInput = (
    rowKey: string,
    field: string,
    text: string,
    applyValue: (value: number) => void,
  ) => {
    const key = `${rowKey}:${field}`;
    setNumericInputText((current) => ({ ...current, [key]: text }));
    const parsed = Number(text);
    const valid = text.trim() !== "" && Number.isFinite(parsed);
    onInputValidityChange?.(`vertical:${rowKeys.current.indexOf(rowKey)}:${field}`, valid);
    if (valid) {
      applyValue(parsed);
    }
  };
  const applyChange = (nextVerticalAlignment: VerticalAlignmentDraft) => {
    onVerticalAlignmentChange(nextVerticalAlignment);
  };

  return (
    <section className="liner-edit-panel" aria-labelledby="liner-edit-vertical-elements-title">
      <div className="liner-edit-section-header">
        <h2 id="liner-edit-vertical-elements-title">{ja.liner.editor.verticalElementSection}</h2>
        <div className="liner-edit-inline-row">
          <button
            type="button"
            onClick={() => applyChange(addGradeElement(verticalAlignment))}
            data-testid="add-liner-grade-element"
          >
            <FilePlus2 size={16} />
            {ja.liner.editor.addGradeElement}
          </button>
          <button
            type="button"
            onClick={() => applyChange(addParabolicElement(verticalAlignment))}
            data-testid="add-liner-parabolic-element"
          >
            <FilePlus2 size={16} />
            {ja.liner.editor.addParabolicElement}
          </button>
        </div>
      </div>
      <div className="liner-edit-table-wrap">
        <table className="liner-edit-table liner-vertical-element-table">
          <caption>{ja.liner.editor.verticalElementTableCaption}</caption>
          <thead>
            <tr>
              <th>{ja.liner.fields.elementId}</th>
              <th>{ja.liner.fields.elementType}</th>
              <th>{ja.liner.fields.startStation}</th>
              <th>{ja.liner.fields.endStation}</th>
              <th>{ja.liner.fields.startElevation}</th>
              <th>{ja.liner.fields.gradePercent}</th>
              <th>{ja.liner.fields.startGradePercent}</th>
              <th>{ja.liner.fields.endGradePercent}</th>
              <th>{ja.liner.fields.length}</th>
              <th>{ja.liner.fields.curveType}</th>
              <th>{ja.liner.fields.actions}</th>
            </tr>
          </thead>
          <tbody>
            {verticalAlignment.elements.map((element, elementIndex) => {
              const rowKey = rowKeys.current[elementIndex]!;
              return (
              <tr key={rowKey} data-testid={`liner-vertical-element-row-${element.id}`}>
                <td>
                  <input
                    value={element.id}
                    onChange={(event) =>
                      applyChange(
                        updateVerticalElement(verticalAlignment, elementIndex, {
                          id: event.currentTarget.value,
                        }),
                      )
                    }
                    data-testid={`liner-vertical-element-id-${element.id}`}
                  />
                </td>
                <td>{elementTypeLabel(element)}</td>
                <td>
                  <input
                    type="number"
                    value={numericInputValue(rowKey, "startStation", numericValue(element.startStation))}
                    onChange={(event) =>
                      updateNumericInput(rowKey, "startStation", event.currentTarget.value, (value) =>
                        applyChange(
                          updateVerticalElement(verticalAlignment, elementIndex, { startStation: value }),
                        ),
                      )}
                    data-testid={`liner-vertical-element-start-station-${element.id}`}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={numericInputValue(rowKey, "endStation", numericValue(element.endStation))}
                    onChange={(event) =>
                      updateNumericInput(rowKey, "endStation", event.currentTarget.value, (value) =>
                        applyChange(
                          updateVerticalElement(verticalAlignment, elementIndex, { endStation: value }),
                        ),
                      )}
                    data-testid={`liner-vertical-element-end-station-${element.id}`}
                  />
                </td>
                <td>
                  {element.type === "grade" ? (
                    <input
                      type="number"
                      value={numericInputValue(rowKey, "startElevation", numericValue(element.startElevation))}
                      onChange={(event) =>
                        updateNumericInput(rowKey, "startElevation", event.currentTarget.value, (value) =>
                          applyChange(
                            updateVerticalElement(verticalAlignment, elementIndex, { startElevation: value }),
                          ),
                        )}
                      data-testid={`liner-vertical-element-start-elevation-${element.id}`}
                    />
                  ) : (
                    <input
                      type="number"
                      value={numericInputValue(rowKey, "startElevation", optionalNumericValue(element.startElevation))}
                      onChange={(event) =>
                        updateNumericInput(rowKey, "startElevation", event.currentTarget.value, (value) =>
                          applyChange(
                            updateVerticalElement(verticalAlignment, elementIndex, { startElevation: value }),
                          ),
                        )}
                      data-testid={`liner-vertical-element-start-elevation-${element.id}`}
                    />
                  )}
                </td>
                <td>
                  {element.type === "grade" ? (
                    <input
                      type="number"
                      step="0.001"
                      value={numericInputValue(rowKey, "gradePercent", gradePercentValue(element.grade))}
                      onChange={(event) =>
                        updateNumericInput(rowKey, "gradePercent", event.currentTarget.value, (value) =>
                          applyChange(
                            updateVerticalElement(verticalAlignment, elementIndex, { gradePercent: value }),
                          ),
                        )}
                      data-testid={`liner-vertical-element-grade-${element.id}`}
                      aria-label={ja.liner.fields.gradePercent}
                    />
                  ) : (
                    <span aria-hidden="true">—</span>
                  )}
                </td>
                <td>
                  {element.type === "parabolic" ? (
                    <input
                      type="number"
                      step="0.001"
                      value={numericInputValue(rowKey, "startGradePercent", gradePercentValue(element.startGrade))}
                      onChange={(event) =>
                        updateNumericInput(rowKey, "startGradePercent", event.currentTarget.value, (value) =>
                          applyChange(
                            updateVerticalElement(verticalAlignment, elementIndex, { startGradePercent: value }),
                          ),
                        )}
                      data-testid={`liner-vertical-element-start-grade-${element.id}`}
                      aria-label={ja.liner.fields.startGradePercent}
                    />
                  ) : (
                    <span aria-hidden="true">—</span>
                  )}
                </td>
                <td>
                  {element.type === "parabolic" ? (
                    <input
                      type="number"
                      step="0.001"
                      value={numericInputValue(rowKey, "endGradePercent", gradePercentValue(element.endGrade))}
                      onChange={(event) =>
                        updateNumericInput(rowKey, "endGradePercent", event.currentTarget.value, (value) =>
                          applyChange(
                            updateVerticalElement(verticalAlignment, elementIndex, { endGradePercent: value }),
                          ),
                        )}
                      data-testid={`liner-vertical-element-end-grade-${element.id}`}
                      aria-label={ja.liner.fields.endGradePercent}
                    />
                  ) : (
                    <span aria-hidden="true">—</span>
                  )}
                </td>
                <td>
                  <input
                    type="number"
                    value={numericValue(element.length)}
                    readOnly
                    aria-readonly="true"
                    data-testid={`liner-vertical-element-length-${element.id}`}
                  />
                </td>
                <td>
                  {element.type === "parabolic" ? (
                    <select
                      value={element.curveType ?? ""}
                      onChange={(event) =>
                        applyChange(
                          updateVerticalElement(verticalAlignment, elementIndex, {
                            curveType: parseOptionalCurveType(event.currentTarget.value),
                          }),
                        )
                      }
                      data-testid={`liner-vertical-element-curve-type-${element.id}`}
                    >
                      <option value="">{ja.liner.fields.curveTypes.unspecified}</option>
                      <option value="crest">{ja.liner.fields.curveTypes.crest}</option>
                      <option value="sag">{ja.liner.fields.curveTypes.sag}</option>
                    </select>
                  ) : (
                    <span aria-hidden="true">—</span>
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => {
                      rowKeys.current.splice(elementIndex, 1);
                      applyChange(removeVerticalElement(verticalAlignment, elementIndex));
                    }}
                    disabled={verticalAlignment.elements.length <= 1}
                    data-testid={`remove-liner-vertical-element-${element.id}`}
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
