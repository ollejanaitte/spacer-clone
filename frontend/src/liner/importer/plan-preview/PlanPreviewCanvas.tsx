import type { PlanPreviewRenderResult } from "./PlanPreviewRenderer";

export type PlanPreviewCanvasProps = {
  result: PlanPreviewRenderResult;
  width?: number;
  height?: number;
};

export function PlanPreviewCanvas({
  result,
  width = 480,
  height = 320,
}: PlanPreviewCanvasProps) {
  const padding = 24;
  const points = result.points.filter((point) => point.kind !== "undefined");

  if (points.length === 0) {
    return (
      <svg
        width={width}
        height={height}
        className="plan-preview-canvas"
        data-testid="plan-preview-canvas"
        role="img"
        aria-label="平面プレビュー"
      >
        <text x={width / 2} y={height / 2} textAnchor="middle">
          XY 座標データ不足
        </text>
      </svg>
    );
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  const scaleX = (value: number) => padding + ((value - minX) / spanX) * plotWidth;
  const scaleY = (value: number) =>
    padding + plotHeight - ((value - minY) / spanY) * plotHeight;

  const currentSectionId = result.currentSectionId;

  return (
    <svg
      width={width}
      height={height}
      className="plan-preview-canvas"
      data-testid="plan-preview-canvas"
      role="img"
      aria-label="平面プレビュー"
    >
      <rect x={0} y={0} width={width} height={height} fill="#f8fafc" />
      {result.sections.map((section) => {
        const sectionPoints = points.filter((point) => point.sectionId === section.id);
        if (sectionPoints.length < 2) {
          return null;
        }
        const polyline = sectionPoints
          .map((point) => `${scaleX(point.x)},${scaleY(point.y)}`)
          .join(" ");
        const isCurrent = section.id === currentSectionId;
        return (
          <polyline
            key={section.id}
            points={polyline}
            fill="none"
            stroke={isCurrent ? "#2563eb" : "#94a3b8"}
            strokeWidth={isCurrent ? 2.5 : 1.5}
            strokeDasharray={isCurrent ? undefined : "4 3"}
            data-testid={`plan-preview-section-line-${section.id}`}
          />
        );
      })}
      {points.map((point) => {
        const color =
          point.kind === "partial"
            ? "#f59e0b"
            : point.sectionId === currentSectionId
              ? "#2563eb"
              : "#64748b";
        return (
          <circle
            key={point.pointId}
            cx={scaleX(point.x)}
            cy={scaleY(point.y)}
            r={point.sectionId === currentSectionId ? 4 : 3}
            fill={color}
            data-testid={`plan-preview-point-${point.pointId}`}
          />
        );
      })}
    </svg>
  );
}
