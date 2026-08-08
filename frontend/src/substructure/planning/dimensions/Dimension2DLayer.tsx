// Phase C1 (M2-06) 2D 寸法表示レイヤ（SVG）
import type { DimensionLine2D, DimensionSet } from "./dimensionModel";

export interface Dimension2DLayerProps {
  dimensions: DimensionSet;
  /** モデル座標 → SVG 座標変換（PlanPreviewSvg と同一規則） */
  toSvg: (x: number, y: number) => [number, number];
}

const KIND_COLOR: Record<DimensionLine2D["kind"], string> = {
  width: "#22c55e",
  length: "#22c55e",
  diameter: "#b08ad0",
  spacing: "#f97316",
  edge: "#f97316",
  height: "#3b82f6",
  thickness: "#eab308",
};

export function Dimension2DLayer(props: Dimension2DLayerProps) {
  const { dimensions, toSvg } = props;
  return (
    <g data-testid="dimension-2d-layer">
      {dimensions.lines2D.map((d) => {
        const [ax, ay] = toSvg(d.a.x, d.a.y);
        const [bx, by] = toSvg(d.b.x, d.b.y);
        const color = KIND_COLOR[d.kind];
        return (
          <g key={d.id} data-testid={`dim2d-${d.id}`}>
            <line
              x1={ax}
              y1={ay}
              x2={bx}
              y2={by}
              stroke={color}
              strokeWidth="1.2"
              data-dim-kind={d.kind}
            />
            <text
              x={(ax + bx) / 2}
              y={(ay + by) / 2 - 4}
              textAnchor="middle"
              fill={color}
              fontSize="11"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}
