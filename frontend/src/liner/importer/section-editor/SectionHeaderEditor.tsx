import type { Section } from "../types";
import { formatStationingRef, type CellAddress } from "./sectionEditorHooks";

export type SectionHeaderEditorProps = {
  section: Section;
  focusCell: CellAddress;
  onFocus: (address: CellAddress) => void;
  onChange: (address: CellAddress, text: string) => void;
};

export function SectionHeaderEditor({
  section,
  focusCell,
  onFocus,
  onChange,
}: SectionHeaderEditorProps) {
  const stationing = formatStationingRef(section.stationingRef);

  return (
    <section className="section-header-editor" data-testid="section-header-editor">
      <h2>
        Page {section.pdfPage} — {section.sectionNo ?? section.title ?? section.id}
      </h2>
      <div className="section-header-fields">
        <label>
          方位角
          <input
            type="text"
            value={section.azimuth.value?.notation ?? (section.azimuth.flags.notComputed ? "********" : "")}
            onFocus={() => onFocus({ field: "azimuth" })}
            onChange={(event) => onChange({ field: "azimuth" }, event.target.value)}
            data-testid="section-editor-azimuth"
            className={focusCell.field === "azimuth" ? "is-focused" : undefined}
          />
        </label>
        <label>
          測点ラベル
          <input
            type="text"
            value={stationing.label}
            onFocus={() => onFocus({ field: "stationLabel" })}
            onChange={(event) => onChange({ field: "stationLabel" }, event.target.value)}
            data-testid="section-editor-station-label"
          />
        </label>
        <label>
          測点値
          <input
            type="text"
            value={stationing.value}
            onFocus={() => onFocus({ field: "stationValue" })}
            onChange={(event) => onChange({ field: "stationValue" }, event.target.value)}
            data-testid="section-editor-station-value"
          />
        </label>
      </div>
    </section>
  );
}
