import type { ImporterDiagnostic, Section } from "../types";
import { SectionPointEditor } from "./SectionPointEditor";
import type { CellAddress } from "./sectionEditorHooks";

export type SectionEditorGridProps = {
  section: Section;
  focusCell: CellAddress;
  diagnostics: ImporterDiagnostic[];
  onFocus: (address: CellAddress) => void;
  onChange: (address: CellAddress, text: string) => void;
};

export function SectionEditorGrid({
  section,
  focusCell,
  diagnostics,
  onFocus,
  onChange,
}: SectionEditorGridProps) {
  return (
    <div className="section-editor-grid-wrap" data-testid="section-editor-grid-wrap">
      <table className="section-editor-grid" data-testid="section-editor-grid">
        <caption>横断面数値入力 — PDF Page {section.pdfPage}</caption>
        <thead>
          <tr>
            <th>行</th>
            <th>X</th>
            <th>Y</th>
            <th>計画高</th>
            <th>横断勾配</th>
            <th>単位距離</th>
            <th>累加距離</th>
            <th>単位幅</th>
            <th>累加幅</th>
            <th>測点</th>
          </tr>
        </thead>
        <tbody>
          {section.points.map((point) => (
            <SectionPointEditor
              key={point.id}
              point={point}
              focusCell={focusCell}
              diagnostics={diagnostics}
              onFocus={onFocus}
              onChange={onChange}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
