import type { SourceRef } from "../types";

export type SourceRefEditorProps = {
  sourceRef: SourceRef;
  onChange: (sourceRef: Partial<SourceRef>) => void;
};

export function SourceRefEditor({ sourceRef, onChange }: SourceRefEditorProps) {
  return (
    <fieldset className="source-ref-editor" data-testid="source-ref-editor">
      <legend>sourceRef</legend>
      <label>
        pdfPage
        <input
          type="number"
          value={sourceRef.pdfPage}
          onChange={(event) => onChange({ pdfPage: Number(event.target.value) })}
          data-testid="source-ref-pdf-page"
        />
      </label>
      <label>
        row
        <input
          type="number"
          value={sourceRef.row ?? ""}
          onChange={(event) =>
            onChange({ row: event.target.value === "" ? null : Number(event.target.value) })
          }
          data-testid="source-ref-row"
        />
      </label>
      <label>
        col
        <input
          type="number"
          value={sourceRef.col ?? ""}
          onChange={(event) =>
            onChange({ col: event.target.value === "" ? null : Number(event.target.value) })
          }
          data-testid="source-ref-col"
        />
      </label>
      <label>
        field
        <input
          type="text"
          value={sourceRef.field ?? ""}
          onChange={(event) => onChange({ field: event.target.value || undefined })}
          data-testid="source-ref-field"
        />
      </label>
    </fieldset>
  );
}
