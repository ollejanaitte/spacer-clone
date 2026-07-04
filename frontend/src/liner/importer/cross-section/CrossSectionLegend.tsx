export function CrossSectionLegend() {
  return (
    <ul className="cross-section-legend" data-testid="cross-section-legend">
      <li>
        <span className="legend-swatch legend-normal" /> 正常点
      </li>
      <li>
        <span className="legend-swatch legend-undefined" /> 未定義点
      </li>
      <li>
        <span className="legend-swatch legend-warning" /> 警告点
      </li>
    </ul>
  );
}
