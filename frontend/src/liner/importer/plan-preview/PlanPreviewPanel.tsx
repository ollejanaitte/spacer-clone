import type { Section } from "../types";
import { renderPlanPreview } from "./PlanPreviewRenderer";
import { PlanPreviewCanvas } from "./PlanPreviewCanvas";
import { PlanPreviewLegend } from "./PlanPreviewLegend";

export type PlanPreviewPanelProps = {
  sections: Section[];
  currentSectionId: string;
  bridgeId: string;
};

export function PlanPreviewPanel({
  sections,
  currentSectionId,
  bridgeId,
}: PlanPreviewPanelProps) {
  const result = renderPlanPreview(sections, currentSectionId, bridgeId);

  return (
    <section className="plan-preview-panel" data-testid="plan-preview-panel">
      <header>
        <h3>平面プレビュー</h3>
        <span data-testid="plan-preview-renderability">
          描画: {result.renderability.planPreview}
        </span>
      </header>
      <PlanPreviewCanvas result={result} />
      <PlanPreviewLegend />
    </section>
  );
}
