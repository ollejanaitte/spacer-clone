import { FilePlus2, Trash2 } from "lucide-react";
import { ja } from "../../i18n/ja";
import type {
  VerticalAlignmentDraft,
  VerticalElementDraft,
  VerticalGradeElementDraft,
  VerticalParabolicElementDraft,
} from "../schema/types";

export type VerticalElementEditorProps = {
  verticalAlignment: VerticalAlignmentDraft;
  onVerticalAlignmentChange: (verticalAlignment: VerticalAlignmentDraft) => void;
};

type VerticalElementFieldPatch = Partial<{
  id: string;
  startStation: number;
  endStation: number;
  startElevation: number | undefined;
  grade: number;
  startGrade: number;
  endGrade: number;
  length: number;
  curveType: "crest" | "sag" | undefined;
}>;

function numericValue(value: number | undefined): string {
  return Number.isFinite(value) ? String(value) : "";
}

function optionalNumericValue(value: number | undefined): string {
  if (value === undefined) {
    return "";
  }
  return Number.isFinite(value) ? String(value) : "";
}

function parseNumericInput(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseOptionalNumericInput(value: string): number | undefined {
  if (value.trim() === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseOptionalCurveType(value: string): "crest" | "sag" | undefined {
  if (value === "crest" || value === "sag") {
    return value;
  }
  return undefined;
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

function addGradeElement(verticalAlignment: VerticalAlignmentDraft): VerticalAlignmentDraft {
  const nextElement: VerticalGradeElementDraft = {
    type: "grade",
    id: nextVerticalElementId("VG", verticalAlignment.elements),
    startStation: 0,
    endStation: 50,
    startElevation: 0,
    grade: 0,
    length: 50,
  };

  return {
    ...verticalAlignment,
    elements: [...verticalAlignment.elements, nextElement],
  };
}

function addParabolicElement(verticalAlignment: VerticalAlignmentDraft): VerticalAlignmentDraft {
  const nextElement: VerticalParabolicElementDraft = {
    type: "parabolic",
    id: nextVerticalElementId("VP", verticalAlignment.elements),
    startStation: 0,
    endStation: 50,
    startGrade: 0,
    endGrade: 0,
    length: 50,
  };

  return {
    ...verticalAlignment,
    elements: [...verticalAlignment.elements, nextElement],
  };
}

function removeVerticalElement(
  verticalAlignment: VerticalAlignmentDraft,
  targetElementId: string,
): VerticalAlignmentDraft {
  if (verticalAlignment.elements.length <= 1) {
    return verticalAlignment;
  }

  return {
    ...verticalAlignment,
    elements: verticalAlignment.elements.filter((element) => element.id !== targetElementId),
  };
}

function updateVerticalElement(
  verticalAlignment: VerticalAlignmentDraft,
  targetElementId: string,
  patch: VerticalElementFieldPatch,
): VerticalAlignmentDraft {
  return {
    ...verticalAlignment,
    elements: verticalAlignment.elements.map((element): VerticalElementDraft => {
      if (element.id !== targetElementId) {
        return element;
      }

      if (element.type === "grade") {
        return {
          ...element,
          id: patch.id ?? element.id,
          startStation: patch.startStation ?? element.startStation,
          endStation: patch.endStation ?? element.endStation,
          startElevation: patch.startElevation ?? element.startElevation,
          grade: patch.grade ?? element.grade,
          length: patch.length ?? element.length,
        };
      }

      const next: VerticalParabolicElementDraft = {
        ...element,
        id: patch.id ?? element.id,
        startStation: patch.startStation ?? element.startStation,
        endStation: patch.endStation ?? element.endStation,
        startGrade: patch.startGrade ?? element.startGrade,
        endGrade: patch.endGrade ?? element.endGrade,
        length: patch.length ?? element.length,
      };

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

export function VerticalElementEditor({
  verticalAlignment,
  onVerticalAlignmentChange,
}: VerticalElementEditorProps) {
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
              <th>{ja.liner.fields.grade}</th>
              <th>{ja.liner.fields.startGrade}</th>
              <th>{ja.liner.fields.endGrade}</th>
              <th>{ja.liner.fields.length}</th>
              <th>{ja.liner.fields.curveType}</th>
              <th>{ja.liner.fields.actions}</th>
            </tr>
          </thead>
          <tbody>
            {verticalAlignment.elements.map((element) => (
              <tr key={element.id} data-testid={`liner-vertical-element-row-${element.id}`}>
                <td>
                  <input
                    value={element.id}
                    onChange={(event) =>
                      applyChange(
                        updateVerticalElement(verticalAlignment, element.id, {
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
                    value={numericValue(element.startStation)}
                    onChange={(event) =>
                      applyChange(
                        updateVerticalElement(verticalAlignment, element.id, {
                          startStation: parseNumericInput(event.currentTarget.value),
                        }),
                      )
                    }
                    data-testid={`liner-vertical-element-start-station-${element.id}`}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={numericValue(element.endStation)}
                    onChange={(event) =>
                      applyChange(
                        updateVerticalElement(verticalAlignment, element.id, {
                          endStation: parseNumericInput(event.currentTarget.value),
                        }),
                      )
                    }
                    data-testid={`liner-vertical-element-end-station-${element.id}`}
                  />
                </td>
                <td>
                  {element.type === "grade" ? (
                    <input
                      type="number"
                      value={numericValue(element.startElevation)}
                      onChange={(event) =>
                        applyChange(
                          updateVerticalElement(verticalAlignment, element.id, {
                            startElevation: parseNumericInput(event.currentTarget.value),
                          }),
                        )
                      }
                      data-testid={`liner-vertical-element-start-elevation-${element.id}`}
                    />
                  ) : (
                    <input
                      type="number"
                      value={optionalNumericValue(element.startElevation)}
                      onChange={(event) =>
                        applyChange(
                          updateVerticalElement(verticalAlignment, element.id, {
                            startElevation: parseOptionalNumericInput(event.currentTarget.value),
                          }),
                        )
                      }
                      data-testid={`liner-vertical-element-start-elevation-${element.id}`}
                    />
                  )}
                </td>
                <td>
                  {element.type === "grade" ? (
                    <input
                      type="number"
                      value={numericValue(element.grade)}
                      onChange={(event) =>
                        applyChange(
                          updateVerticalElement(verticalAlignment, element.id, {
                            grade: parseNumericInput(event.currentTarget.value),
                          }),
                        )
                      }
                      data-testid={`liner-vertical-element-grade-${element.id}`}
                    />
                  ) : (
                    <span aria-hidden="true">—</span>
                  )}
                </td>
                <td>
                  {element.type === "parabolic" ? (
                    <input
                      type="number"
                      value={numericValue(element.startGrade)}
                      onChange={(event) =>
                        applyChange(
                          updateVerticalElement(verticalAlignment, element.id, {
                            startGrade: parseNumericInput(event.currentTarget.value),
                          }),
                        )
                      }
                      data-testid={`liner-vertical-element-start-grade-${element.id}`}
                    />
                  ) : (
                    <span aria-hidden="true">—</span>
                  )}
                </td>
                <td>
                  {element.type === "parabolic" ? (
                    <input
                      type="number"
                      value={numericValue(element.endGrade)}
                      onChange={(event) =>
                        applyChange(
                          updateVerticalElement(verticalAlignment, element.id, {
                            endGrade: parseNumericInput(event.currentTarget.value),
                          }),
                        )
                      }
                      data-testid={`liner-vertical-element-end-grade-${element.id}`}
                    />
                  ) : (
                    <span aria-hidden="true">—</span>
                  )}
                </td>
                <td>
                  <input
                    type="number"
                    value={numericValue(element.length)}
                    onChange={(event) =>
                      applyChange(
                        updateVerticalElement(verticalAlignment, element.id, {
                          length: parseNumericInput(event.currentTarget.value),
                        }),
                      )
                    }
                    data-testid={`liner-vertical-element-length-${element.id}`}
                  />
                </td>
                <td>
                  {element.type === "parabolic" ? (
                    <select
                      value={element.curveType ?? ""}
                      onChange={(event) =>
                        applyChange(
                          updateVerticalElement(verticalAlignment, element.id, {
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
                    onClick={() => applyChange(removeVerticalElement(verticalAlignment, element.id))}
                    disabled={verticalAlignment.elements.length <= 1}
                    data-testid={`remove-liner-vertical-element-${element.id}`}
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
