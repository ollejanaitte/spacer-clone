import { FilePlus2, Trash2 } from "lucide-react";
import { ja } from "../../i18n/ja";
import type {
  CrossSectionOffsetLineDraft,
  CrossSectionOffsetLineRole,
  CrossSectionTemplateDraft,
} from "../schema/types";

export type CrossSectionTemplateEditorProps = {
  template: CrossSectionTemplateDraft;
  onTemplateChange: (template: CrossSectionTemplateDraft) => void;
};

type OffsetLineFieldPatch = Partial<{
  id: string;
  offset: number;
  elevation: number;
  role: CrossSectionOffsetLineRole | undefined;
  label: string | undefined;
}>;

const OFFSET_LINE_ROLES: readonly CrossSectionOffsetLineRole[] = [
  "shoulder",
  "lane",
  "median",
  "sidewalk",
  "edge",
  "custom",
];

function numericValue(value: number | undefined): string {
  return Number.isFinite(value) ? String(value) : "";
}

function parseNumericInput(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseOptionalRole(value: string): CrossSectionOffsetLineRole | undefined {
  if (OFFSET_LINE_ROLES.includes(value as CrossSectionOffsetLineRole)) {
    return value as CrossSectionOffsetLineRole;
  }
  return undefined;
}

function nextOffsetLineId(prefix: string, offsetLines: readonly CrossSectionOffsetLineDraft[]): string {
  const ids = new Set(offsetLines.map((line) => line.id));
  let index = offsetLines.length;
  let candidate = `${prefix}-${index}`;
  while (ids.has(candidate)) {
    index += 1;
    candidate = `${prefix}-${index}`;
  }
  return candidate;
}

function updateTemplateFields(
  template: CrossSectionTemplateDraft,
  patch: Partial<Pick<CrossSectionTemplateDraft, "id" | "name">>,
): CrossSectionTemplateDraft {
  return {
    ...template,
    id: patch.id ?? template.id,
    name: patch.name ?? template.name,
  };
}

function addOffsetLine(template: CrossSectionTemplateDraft): CrossSectionTemplateDraft {
  const nextLine: CrossSectionOffsetLineDraft = {
    id: nextOffsetLineId("OL", template.offsetLines),
    offset: 0,
    elevation: 0,
    role: "custom",
  };

  return {
    ...template,
    offsetLines: [...template.offsetLines, nextLine],
  };
}

function removeOffsetLine(template: CrossSectionTemplateDraft, targetLineId: string): CrossSectionTemplateDraft {
  if (template.offsetLines.length <= 1) {
    return template;
  }

  return {
    ...template,
    offsetLines: template.offsetLines.filter((line) => line.id !== targetLineId),
  };
}

function updateOffsetLine(
  template: CrossSectionTemplateDraft,
  targetLineId: string,
  patch: OffsetLineFieldPatch,
): CrossSectionTemplateDraft {
  return {
    ...template,
    offsetLines: template.offsetLines.map((line): CrossSectionOffsetLineDraft => {
      if (line.id !== targetLineId) {
        return line;
      }

      const next: CrossSectionOffsetLineDraft = {
        ...line,
        id: patch.id ?? line.id,
        offset: patch.offset ?? line.offset,
        elevation: patch.elevation ?? line.elevation,
      };

      if ("role" in patch) {
        if (patch.role === undefined) {
          delete next.role;
        } else {
          next.role = patch.role;
        }
      }

      if ("label" in patch) {
        const trimmedLabel = patch.label?.trim();
        if (!trimmedLabel) {
          delete next.label;
        } else {
          next.label = trimmedLabel;
        }
      }

      return next;
    }),
  };
}

function offsetLineRoleLabel(role: CrossSectionOffsetLineRole): string {
  return ja.liner.fields.offsetLineRoles[role];
}

export function CrossSectionTemplateEditor({ template, onTemplateChange }: CrossSectionTemplateEditorProps) {
  const applyChange = (nextTemplate: CrossSectionTemplateDraft) => {
    onTemplateChange(nextTemplate);
  };

  return (
    <section className="liner-edit-panel" aria-labelledby="liner-edit-cross-section-template-title">
      <h2 id="liner-edit-cross-section-template-title">{ja.liner.editor.crossSectionTemplateSection}</h2>

      <div className="liner-edit-form-grid">
        <label>
          <span>{ja.liner.fields.templateId}</span>
          <input
            value={template.id}
            onChange={(event) =>
              applyChange(updateTemplateFields(template, { id: event.currentTarget.value }))
            }
            data-testid="cross-section-template-id"
          />
        </label>
        <label>
          <span>{ja.liner.fields.templateName}</span>
          <input
            value={template.name}
            onChange={(event) =>
              applyChange(updateTemplateFields(template, { name: event.currentTarget.value }))
            }
            data-testid="cross-section-template-name"
          />
        </label>
      </div>

      <p className="liner-edit-help" data-testid="cross-section-sign-convention-help">
        {ja.liner.editor.crossSectionSignConventionHelp}
      </p>

      <div className="liner-edit-section-header">
        <h2>{ja.liner.editor.crossSectionOffsetLineSection}</h2>
        <button
          type="button"
          onClick={() => applyChange(addOffsetLine(template))}
          data-testid="add-cross-section-offset-line"
        >
          <FilePlus2 size={16} />
          {ja.liner.editor.addOffsetLine}
        </button>
      </div>

      <div className="liner-edit-table-wrap">
        <table className="liner-edit-table liner-cross-section-offset-line-table">
          <caption>{ja.liner.editor.crossSectionOffsetLineTableCaption}</caption>
          <thead>
            <tr>
              <th>{ja.liner.fields.offsetLineId}</th>
              <th>{ja.liner.fields.offsetRightPositive}</th>
              <th>{ja.liner.fields.elevationUpPositive}</th>
              <th>{ja.liner.fields.offsetLineRole}</th>
              <th>{ja.liner.fields.offsetLineLabel}</th>
              <th>{ja.liner.fields.actions}</th>
            </tr>
          </thead>
          <tbody>
            {template.offsetLines.map((line) => (
              <tr key={line.id} data-testid={`cross-section-offset-line-row-${line.id}`}>
                <td>
                  <input
                    value={line.id}
                    onChange={(event) =>
                      applyChange(
                        updateOffsetLine(template, line.id, {
                          id: event.currentTarget.value,
                        }),
                      )
                    }
                    data-testid={`cross-section-offset-line-id-${line.id}`}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={numericValue(line.offset)}
                    onChange={(event) =>
                      applyChange(
                        updateOffsetLine(template, line.id, {
                          offset: parseNumericInput(event.currentTarget.value),
                        }),
                      )
                    }
                    data-testid={`cross-section-offset-line-offset-${line.id}`}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={numericValue(line.elevation)}
                    onChange={(event) =>
                      applyChange(
                        updateOffsetLine(template, line.id, {
                          elevation: parseNumericInput(event.currentTarget.value),
                        }),
                      )
                    }
                    data-testid={`cross-section-offset-line-elevation-${line.id}`}
                  />
                </td>
                <td>
                  <select
                    value={line.role ?? ""}
                    onChange={(event) =>
                      applyChange(
                        updateOffsetLine(template, line.id, {
                          role: parseOptionalRole(event.currentTarget.value),
                        }),
                      )
                    }
                    data-testid={`cross-section-offset-line-role-${line.id}`}
                  >
                    <option value="">{ja.liner.fields.offsetLineRoles.unspecified}</option>
                    {OFFSET_LINE_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {offsetLineRoleLabel(role)}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    value={line.label ?? ""}
                    onChange={(event) =>
                      applyChange(
                        updateOffsetLine(template, line.id, {
                          label: event.currentTarget.value,
                        }),
                      )
                    }
                    data-testid={`cross-section-offset-line-label-${line.id}`}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => applyChange(removeOffsetLine(template, line.id))}
                    disabled={template.offsetLines.length <= 1}
                    data-testid={`remove-cross-section-offset-line-${line.id}`}
                    title={ja.liner.editor.removeOffsetLine}
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
