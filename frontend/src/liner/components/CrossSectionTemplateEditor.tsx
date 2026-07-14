import { FilePlus2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { ja } from "../../i18n/ja";
import type {
  CrossSectionOffsetLineDraft,
  CrossSectionOffsetLineRole,
  CrossSectionTemplateDraft,
} from "../schema/types";
import { CompositionAwareInput } from "./CompositionAwareInput";

export type CrossSectionTemplateEditorProps = {
  template: CrossSectionTemplateDraft;
  onTemplateChange: (template: CrossSectionTemplateDraft) => void;
  onInputValidityChange?: (fieldKey: string, valid: boolean) => void;
  onCompositionStateChange?: (composing: boolean) => void;
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

function parseOptionalRole(value: string): CrossSectionOffsetLineRole | undefined {
  if (OFFSET_LINE_ROLES.includes(value as CrossSectionOffsetLineRole)) {
    return value as CrossSectionOffsetLineRole;
  }
  return undefined;
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

function removeOffsetLine(template: CrossSectionTemplateDraft, targetLineIndex: number): CrossSectionTemplateDraft {
  if (template.offsetLines.length <= 1) {
    return template;
  }

  return {
    ...template,
    offsetLines: template.offsetLines.filter((_, lineIndex) => lineIndex !== targetLineIndex),
  };
}

function updateOffsetLine(
  template: CrossSectionTemplateDraft,
  targetLineIndex: number,
  patch: OffsetLineFieldPatch,
): CrossSectionTemplateDraft {
  return {
    ...template,
    offsetLines: template.offsetLines.map((line, lineIndex): CrossSectionOffsetLineDraft => {
      if (lineIndex !== targetLineIndex) {
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

function offsetLineRoleLabel(role: CrossSectionOffsetLineRole): string {
  return ja.liner.fields.offsetLineRoles[role];
}

let offsetLineRowKeySequence = 0;

export function CrossSectionTemplateEditor({
  template,
  onTemplateChange,
  onInputValidityChange,
  onCompositionStateChange,
}: CrossSectionTemplateEditorProps) {
  const [numericInputText, setNumericInputText] = useState<Record<string, string>>({});
  const rowKeys = useRef<string[]>([]);
  while (rowKeys.current.length < template.offsetLines.length) {
    offsetLineRowKeySequence += 1;
    rowKeys.current.push(`offset-line-row-${offsetLineRowKeySequence}`);
  }
  const applyChange = (nextTemplate: CrossSectionTemplateDraft) => {
    onTemplateChange(nextTemplate);
  };

  return (
    <section className="liner-edit-panel" aria-labelledby="liner-edit-cross-section-template-title">
      <h2 id="liner-edit-cross-section-template-title">{ja.liner.editor.crossSectionTemplateSection}</h2>

      <div className="liner-edit-form-grid">
        <label>
          <span>{ja.liner.fields.templateId}</span>
          <CompositionAwareInput
            value={template.id ?? ""}
            onCompositionStateChange={onCompositionStateChange}
            onValueChange={(value) =>
              applyChange(updateTemplateFields(template, { id: value }))
            }
            data-testid="cross-section-template-id"
          />
        </label>
        <label>
          <span>{ja.liner.fields.templateName}</span>
          <CompositionAwareInput
            value={template.name ?? ""}
            onCompositionStateChange={onCompositionStateChange}
            onValueChange={(value) =>
              applyChange(updateTemplateFields(template, { name: value }))
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
            {template.offsetLines.map((line, lineIndex) => {
              const rowKey = rowKeys.current[lineIndex]!;
              const offsetInputKey = `${rowKey}:offset`;
              const elevationInputKey = `${rowKey}:elevation`;
              return (
              <tr key={rowKey} data-testid={`cross-section-offset-line-row-${line.id}`}>
                <td>
                  <CompositionAwareInput
                    value={line.id ?? ""}
                    onCompositionStateChange={onCompositionStateChange}
                    onValueChange={(value) =>
                      applyChange(
                        updateOffsetLine(template, lineIndex, {
                          id: value,
                        }),
                      )
                    }
                    data-testid={`cross-section-offset-line-id-${line.id}`}
                  />
                </td>
                <td>
                  <CompositionAwareInput
                    type="number"
                    value={numericInputText[offsetInputKey] ?? numericValue(line.offset)}
                    onCompositionStateChange={onCompositionStateChange}
                    onValueChange={(text) => {
                      const parsed = Number(text);
                      const valid = text.trim() !== "" && Number.isFinite(parsed);
                      setNumericInputText((current) => ({ ...current, [offsetInputKey]: text }));
                      onInputValidityChange?.(`crossSection:${lineIndex}:offset`, valid);
                      if (valid) {
                        applyChange(updateOffsetLine(template, lineIndex, { offset: parsed }));
                      }
                    }}
                    data-testid={`cross-section-offset-line-offset-${line.id}`}
                  />
                </td>
                <td>
                  <CompositionAwareInput
                    type="number"
                    value={numericInputText[elevationInputKey] ?? numericValue(line.elevation)}
                    onCompositionStateChange={onCompositionStateChange}
                    title={ja.liner.editor.templateElevationTooltip}
                    aria-describedby="liner-cross-section-sign-convention-help"
                    onValueChange={(text) => {
                      const trimmed = text.trim();
                      const valid = trimmed !== "" && Number.isFinite(Number(trimmed));
                      setNumericInputText((current) => ({ ...current, [elevationInputKey]: text }));
                      onInputValidityChange?.(`crossSection:${lineIndex}:elevation`, valid);
                      if (valid) {
                        applyChange(updateOffsetLine(template, lineIndex, { elevation: Number(trimmed) }));
                      }
                    }}
                    data-testid={`cross-section-offset-line-elevation-${line.id}`}
                  />
                </td>
                <td>
                  <select
                    value={line.role ?? ""}
                    onChange={(event) =>
                      applyChange(
                        updateOffsetLine(template, lineIndex, {
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
                  <CompositionAwareInput
                    value={line.label ?? ""}
                    onCompositionStateChange={onCompositionStateChange}
                    onValueChange={(value) =>
                      applyChange(
                        updateOffsetLine(template, lineIndex, {
                          label: value,
                        }),
                      )
                    }
                    data-testid={`cross-section-offset-line-label-${line.id}`}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => {
                      rowKeys.current.splice(lineIndex, 1);
                      applyChange(removeOffsetLine(template, lineIndex));
                    }}
                    disabled={template.offsetLines.length <= 1}
                    data-testid={`remove-cross-section-offset-line-${line.id}`}
                    title={ja.liner.editor.removeOffsetLine}
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
