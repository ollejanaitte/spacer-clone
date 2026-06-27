import { ja } from "../../i18n/ja";
import type { LinerGridPreviewViewModel } from "../adapters/linerPreviewAdapter";

export type LinerGridPreviewProps = {
  viewModel: LinerGridPreviewViewModel;
};

export function LinerGridPreview({ viewModel }: LinerGridPreviewProps) {
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
        {axisPoints && <polyline className="liner-grid-preview-axis" points={axisPoints} />}
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
