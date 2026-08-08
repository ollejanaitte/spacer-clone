import { ja } from "../../i18n/ja";
import type { LinerGridPreviewViewModel } from "../adapters/linerPreviewAdapter";
import { VISUAL_COLORS, objectColor } from "../core/visual/svgFoundation";
import type { DiagramPayload, VisualState } from "../core/visual/contract";

export type LinerGridPreviewProps = {
  viewModel: LinerGridPreviewViewModel;
  /** Optional schematic payload for field->diagram highlight (S3-UX02). */
  diagramPayload?: DiagramPayload;
  visualState?: VisualState;
};

export function LinerGridPreview({
  viewModel,
  diagramPayload,
  visualState = "CALCULATED",
}: LinerGridPreviewProps) {
  const axisPoints = toPolylinePoints(viewModel.axisPolyline);

  return (
    <figure className="liner-grid-preview" data-testid="liner-grid-preview">
      <svg
        className="liner-grid-preview-svg"
        role="img"
        aria-label={ja.liner.preview.canvasLabel}
        viewBox={`0 0 ${viewModel.width} ${viewModel.height}`}
      >
        <BackgroundGrid viewModel={viewModel} />
        <g className="liner-grid-preview-lines">
          {viewModel.gridLines.map((line) => (
            <polyline
              key={line.id}
              className={`liner-grid-preview-line liner-grid-preview-line-${line.direction}`}
              points={toPolylinePoints(line.points)}
            />
          ))}
        </g>
        {axisPoints && (
          <polyline
            className="liner-grid-preview-axis"
            points={axisPoints}
            stroke={axisStrokeColor(diagramPayload, visualState)}
          />
        )}
        <g className="liner-grid-preview-points">
          {viewModel.gridPoints.map((point) => (
            <circle
              key={point.id}
              className="liner-grid-preview-point"
              cx={point.sx}
              cy={point.sy}
              r={4}
            />
          ))}
        </g>
      </svg>
      <figcaption className="liner-grid-preview-caption">
        {ja.liner.preview.bounds(
          viewModel.bounds.minX,
          viewModel.bounds.maxX,
          viewModel.bounds.minY,
          viewModel.bounds.maxY,
        )}
      </figcaption>
    </figure>
  );
}

/** Axis stroke color derived from the schematic visual state. */
export function axisStrokeColor(
  payload: DiagramPayload | undefined,
  state: VisualState,
): string {
  if (!payload || payload.objects.length === 0) {
    if (state === "INPUT") return VISUAL_COLORS.input;
    if (state === "VALIDATED") return VISUAL_COLORS.validated;
    return VISUAL_COLORS.calculated;
  }
  // If any diagram object has an error, the axis is red; else warning amber.
  if (payload.errors.length > 0) return VISUAL_COLORS.error;
  if (payload.warnings.length > 0) return VISUAL_COLORS.warning;
  if (state === "INPUT") return VISUAL_COLORS.input;
  if (state === "VALIDATED") return VISUAL_COLORS.validated;
  return VISUAL_COLORS.calculated;
}

function BackgroundGrid({ viewModel }: LinerGridPreviewProps) {
  const lines = [];
  const spacing = 80;
  for (let x = viewModel.padding; x <= viewModel.width - viewModel.padding; x += spacing) {
    lines.push(<line key={`x-${x}`} x1={x} y1={viewModel.padding} x2={x} y2={viewModel.height - viewModel.padding} />);
  }
  for (let y = viewModel.padding; y <= viewModel.height - viewModel.padding; y += spacing) {
    lines.push(<line key={`y-${y}`} x1={viewModel.padding} y1={y} x2={viewModel.width - viewModel.padding} y2={y} />);
  }

  return <g className="liner-grid-preview-background">{lines}</g>;
}

function toPolylinePoints(points: readonly { sx: number; sy: number }[]): string {
  return points.map((point) => `${point.sx},${point.sy}`).join(" ");
}
