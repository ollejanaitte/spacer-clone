import type { Section } from "../types";
import { renderCrossSection } from "./CrossSectionRenderer";
import { CrossSectionCanvas } from "./CrossSectionCanvas";
import { CrossSectionLegend } from "./CrossSectionLegend";

export type CrossSectionSvgProps = {
  section: Section;
};

export function CrossSectionSvg({ section }: CrossSectionSvgProps) {
  const result = renderCrossSection(section);

  return (
    <section className="cross-section-svg" data-testid="cross-section-svg">
      <header>
        <h3>横断図プレビュー</h3>
        <span data-testid="cross-section-renderability">
          描画: {result.renderability.crossSection}
        </span>
      </header>
      <CrossSectionCanvas result={result} />
      <CrossSectionLegend />
    </section>
  );
}
