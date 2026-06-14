import type { RoadAlignment } from "../types";

type Props = {
  alignment: RoadAlignment;
  height?: number;
};

/**
 * 道路中心線の 2D プレビュー (SVG)。
 * 上面図と同じ思想で、X=station, Y=横断 y の表示。
 * 中心線形 (world x, y) は「上から見た平面図」のまま X 横、Y 縦として描く。
 * データ変換は行わない (display-only)。
 */
export function AlignmentPreview({ alignment, height = 200 }: Props) {
  const pts = alignment.points;
  if (pts.length < 2) {
    return <div className="bw-alignment-empty">中心線形がありません。</div>;
  }
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  const padding = 16;
  const width = 600;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const scaleX = innerW / spanX;
  const scaleY = innerH / spanY;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = padding + (innerW - spanX * scale) / 2;
  const offsetY = padding + (innerH - spanY * scale) / 2;
  const project = (x: number, y: number) => [
    offsetX + (x - minX) * scale,
    height - (offsetY + (y - minY) * scale),
  ];
  const path = pts
    .map((p, i) => {
      const [sx, sy] = project(p.x, p.y);
      return `${i === 0 ? "M" : "L"} ${sx.toFixed(2)} ${sy.toFixed(2)}`;
    })
    .join(" ");
  return (
    <svg
      className="bw-alignment-svg"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="中心線形プレビュー"
    >
      <rect x={0} y={0} width={width} height={height} fill="#f7fafc" />
      <path d={path} stroke="#1f3a55" strokeWidth={2} fill="none" />
      {pts.map((p, i) => {
        const [sx, sy] = project(p.x, p.y);
        return (
          <g key={i}>
            <circle cx={sx} cy={sy} r={3} fill="#1f3a55" />
            <text x={sx + 6} y={sy - 6} fontSize={10} fill="#243447">
              {i}
            </text>
          </g>
        );
      })}
      <text x={padding} y={height - 4} fontSize={10} fill="#526173">
        X (m)
      </text>
      <text x={width - 36} y={14} fontSize={10} fill="#526173">
        Y (m)
      </text>
    </svg>
  );
}
