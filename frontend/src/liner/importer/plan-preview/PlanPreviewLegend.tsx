export function PlanPreviewLegend() {
  return (
    <ul className="plan-preview-legend" data-testid="plan-preview-legend">
      <li>
        <span className="legend-swatch legend-current" /> 現在 Section
      </li>
      <li>
        <span className="legend-swatch legend-adjacent" /> 前後 Section
      </li>
      <li>
        <span className="legend-swatch legend-partial" /> 部分描画 (azimuth/STA 欠落)
      </li>
    </ul>
  );
}
