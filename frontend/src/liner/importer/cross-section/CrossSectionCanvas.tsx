import type { CrossSectionRenderPoint, CrossSectionRenderResult } from "./CrossSectionRenderer";

export type CrossSectionCanvasProps = {
  result: CrossSectionRenderResult;
  width?: number;
  height?: number;
};

export function CrossSectionCanvas({
  result,
  width = 480,
  height = 240,
}: CrossSectionCanvasProps) {
  const padding = 24;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  const points = result.points.filter(
    (point): point is CrossSectionRenderPoint & { cumulativeWidth: number; designElevation: number } =>
      point.kind !== "undefined" &&
      point.cumulativeWidth != null &&
      point.designElevation != null,
  );
  if (points.length === 0) {
    return (
      <svg
        width={width}
        height={height}
        className="cross-section-canvas"
        data-testid="cross-section-canvas"
        role="img"
        aria-label="横断図プレビュー"
      >
        <text x={width / 2} y={height / 2} textAnchor="middle">
          描画データ不足
        </text>
      </svg>
    );
  }

  const widths = points.map((point) => point.cumulativeWidth);
  const elevations = points.map((point) => point.designElevation);
  const minWidth = Math.min(...widths);
  const maxWidth = Math.max(...widths);
  const minElev = Math.min(...elevations);
  const maxElev = Math.max(...elevations);
  const widthSpan = maxWidth - minWidth || 1;
  const elevSpan = maxElev - minElev || 1;

  const scaleX = (value: number) => padding + ((value - minWidth) / widthSpan) * plotWidth;
  const scaleY = (value: number) =>
    padding + plotHeight - ((value - minElev) / elevSpan) * plotHeight;

  const polyline = points.map((point) => `${scaleX(point.cumulativeWidth)},${scaleY(point.designElevation)}`).join(" ");

  return (
    <svg
      width={width}
      height={height}
      className="cross-section-canvas"
      data-testid="cross-section-canvas"
      role="img"
      aria-label="横断図プレビュー"
    >
      <rect x={0} y={0} width={width} height={height} fill="#fafafa" />
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#999" />
      <line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        stroke="#999"
      />
      <polyline points={polyline} fill="none" stroke="#2563eb" strokeWidth={2} />
      {result.points.map((point) => (
        <CrossSectionPoint key={point.id} point={point} scaleX={scaleX} scaleY={scaleY} />
      ))}
    </svg>
  );
}

function CrossSectionPoint({
  point,
  scaleX,
  scaleY,
}: {
  point: CrossSectionRenderPoint;
  scaleX: (value: number) => number;
  scaleY: (value: number) => number;
}) {
  if (point.kind === "undefined") {
    return null;
  }

  const color =
    point.kind === "warning" ? "#f59e0b" : point.kind === "normal" ? "#16a34a" : "#94a3b8";

  if (point.cumulativeWidth == null || point.designElevation == null) {
    return null;
  }

  return (
    <g data-testid={`cross-section-point-${point.id}`}>
      <circle
        cx={scaleX(point.cumulativeWidth)}
        cy={scaleY(point.designElevation)}
        r={4}
        fill={color}
      />
      <text
        x={scaleX(point.cumulativeWidth) + 6}
        y={scaleY(point.designElevation) - 6}
        fontSize={10}
        fill="#333"
      >
        {point.lineLabel}
      </text>
    </g>
  );
}
