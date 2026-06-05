import type { NodalLoad, NodeItem, ProjectModel } from "../types";
import type { ThreeViewportProps, ViewerSelection } from "./types";

const WIDTH = 1000;
const HEIGHT = 700;
const PAD = 70;

type ProjectedNode = NodeItem & {
  sx: number;
  sy: number;
};

type ProjectionAxis = "y" | "z";

export function Fallback2DViewport({
  project,
  selectedSection,
  selection,
  visibility,
  selectedLoadCaseId,
  fitRequest,
  onSelectionChange,
}: ThreeViewportProps) {
  const projected = projectNodes(project);
  const nodeMap = new Map(projected.nodes.map((node) => [node.id, node]));
  const forceMax = Math.max(
    ...project.nodalLoads
      .filter((load) => load.loadCaseId === selectedLoadCaseId)
      .map((load) => forceMagnitude(load, projected.axis)),
    1,
  );

  return (
    <div className="fallback2d-viewport" aria-label="2D簡易モデル表示">
      <svg
        role="img"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        data-viewer-mode="fallback2d"
        data-fit-request={fitRequest}
      >
        <defs>
          <marker id="fallback-force-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" />
          </marker>
        </defs>
        {visibility.grid && <FallbackGrid />}
        {visibility.axes && <FallbackAxes axis={projected.axis} />}
        {visibility.members &&
          project.members.map((member) => {
            const start = nodeMap.get(member.nodeI);
            const end = nodeMap.get(member.nodeJ);
            if (!start || !end) return null;
            const selected = isSelected(selection, "member", member.id) || selectedSection === "members";
            return (
              <g key={member.id} className={selected ? "fallback-member selected" : "fallback-member"}>
                <line
                  data-testid="fallback-member"
                  x1={start.sx}
                  y1={start.sy}
                  x2={end.sx}
                  y2={end.sy}
                  onClick={() => onSelectionChange({ type: "member", id: member.id })}
                />
                {visibility.labels && visibility.memberLabels && (
                  <text x={(start.sx + end.sx) / 2} y={(start.sy + end.sy) / 2 - 10}>
                    {member.id}
                  </text>
                )}
              </g>
            );
          })}
        {visibility.supports &&
          project.supports.map((support) => {
            const node = nodeMap.get(support.nodeId);
            if (!node) return null;
            return <SupportGlyph key={support.nodeId} x={node.sx} y={node.sy} fixed={isFullyFixed(support)} />;
          })}
        {visibility.loads &&
          project.nodalLoads
            .filter((load) => load.loadCaseId === selectedLoadCaseId)
            .map((load) => {
              const node = nodeMap.get(load.nodeId);
              if (!node) return null;
              return <NodalLoadGlyph key={load.id} load={load} node={node} axis={projected.axis} forceMax={forceMax} />;
            })}
        {visibility.nodes &&
          projected.nodes.map((node) => {
            const selected = isSelected(selection, "node", node.id) || selectedSection === "nodes";
            return (
              <g key={node.id} className={selected ? "fallback-node selected" : "fallback-node"}>
                <circle
                  data-testid="fallback-node"
                  cx={node.sx}
                  cy={node.sy}
                  r={selected ? 8 : 6}
                  onClick={() => onSelectionChange({ type: "node", id: node.id })}
                />
                {visibility.labels && visibility.nodeLabels && (
                  <text x={node.sx + 10} y={node.sy - 10}>
                    {node.id}
                  </text>
                )}
              </g>
            );
          })}
      </svg>
      {project.nodes.length === 0 && <div className="fallback-empty">表示できる節点・部材がありません。</div>}
    </div>
  );
}

function FallbackGrid() {
  const lines = [];
  for (let x = PAD; x <= WIDTH - PAD; x += 80) {
    lines.push(<line key={`x-${x}`} x1={x} y1={PAD} x2={x} y2={HEIGHT - PAD} />);
  }
  for (let y = PAD; y <= HEIGHT - PAD; y += 80) {
    lines.push(<line key={`y-${y}`} x1={PAD} y1={y} x2={WIDTH - PAD} y2={y} />);
  }
  return <g className="fallback-grid">{lines}</g>;
}

function FallbackAxes({ axis }: { axis: ProjectionAxis }) {
  return (
    <g className="fallback-axes">
      <line x1={PAD} y1={HEIGHT - PAD} x2={PAD + 92} y2={HEIGHT - PAD} />
      <line x1={PAD} y1={HEIGHT - PAD} x2={PAD} y2={HEIGHT - PAD - 92} />
      <text x={PAD + 102} y={HEIGHT - PAD + 4}>X</text>
      <text x={PAD - 5} y={HEIGHT - PAD - 102}>{axis.toUpperCase()}</text>
    </g>
  );
}

function SupportGlyph({ x, y, fixed }: { x: number; y: number; fixed: boolean }) {
  if (fixed) {
    return <rect data-testid="fallback-support" className="fallback-support fixed" x={x - 13} y={y + 11} width={26} height={13} />;
  }
  return <polygon data-testid="fallback-support" className="fallback-support" points={`${x},${y + 11} ${x - 15},${y + 33} ${x + 15},${y + 33}`} />;
}

function NodalLoadGlyph({
  load,
  node,
  axis,
  forceMax,
}: {
  load: NodalLoad;
  node: ProjectedNode;
  axis: ProjectionAxis;
  forceMax: number;
}) {
  const force = projectedForce(load, axis);
  if (!force) return null;
  const magnitude = Math.hypot(force.x, force.y);
  const length = clamp((magnitude / forceMax) * 82, 34, 92);
  const unit = { x: force.x / magnitude, y: force.y / magnitude };
  const end = { x: node.sx, y: node.sy };
  const start = { x: node.sx - unit.x * length, y: node.sy - unit.y * length };
  return (
    <line
      data-testid="fallback-nodal-load"
      className="fallback-load"
      x1={start.x}
      y1={start.y}
      x2={end.x}
      y2={end.y}
      markerEnd="url(#fallback-force-arrow)"
    />
  );
}

function projectNodes(project: ProjectModel): { nodes: ProjectedNode[]; axis: ProjectionAxis } {
  const axis = chooseVerticalAxis(project.nodes);
  const raw = project.nodes
    .filter((node) => isFiniteNumber(node.x) && isFiniteNumber(node.y) && isFiniteNumber(node.z))
    .map((node) => ({ node, px: node.x, py: axis === "z" ? node.z : node.y }));
  if (raw.length === 0) return { nodes: [], axis };

  const minX = Math.min(...raw.map((item) => item.px));
  const maxX = Math.max(...raw.map((item) => item.px));
  const minY = Math.min(...raw.map((item) => item.py));
  const maxY = Math.max(...raw.map((item) => item.py));
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  const scale = Math.min((WIDTH - PAD * 2) / spanX, (HEIGHT - PAD * 2) / spanY);
  const contentWidth = spanX * scale;
  const contentHeight = spanY * scale;
  const offsetX = (WIDTH - contentWidth) / 2;
  const offsetY = (HEIGHT - contentHeight) / 2;

  return {
    axis,
    nodes: raw.map(({ node, px, py }) => ({
      ...node,
      sx: offsetX + (px - minX) * scale,
      sy: HEIGHT - (offsetY + (py - minY) * scale),
    })),
  };
}

function chooseVerticalAxis(nodes: NodeItem[]): ProjectionAxis {
  const finiteNodes = nodes.filter((node) => isFiniteNumber(node.y) && isFiniteNumber(node.z));
  if (finiteNodes.length === 0) return "y";
  const ySpan = Math.max(...finiteNodes.map((node) => node.y)) - Math.min(...finiteNodes.map((node) => node.y));
  const zSpan = Math.max(...finiteNodes.map((node) => node.z)) - Math.min(...finiteNodes.map((node) => node.z));
  return ySpan <= 1e-9 && zSpan > ySpan ? "z" : "y";
}

function projectedForce(load: NodalLoad, axis: ProjectionAxis): { x: number; y: number } | null {
  const x = load.fx;
  const y = axis === "z" ? -load.fz : -load.fy;
  if (!isFiniteNumber(x) || !isFiniteNumber(y)) return null;
  const magnitude = Math.hypot(x, y);
  if (magnitude <= 1e-12) return null;
  return { x, y };
}

function forceMagnitude(load: NodalLoad, axis: ProjectionAxis): number {
  const force = projectedForce(load, axis);
  return force ? Math.hypot(force.x, force.y) : 0;
}

function isFullyFixed(support: { ux: boolean; uy: boolean; uz: boolean; rx: boolean; ry: boolean; rz: boolean }): boolean {
  return support.ux && support.uy && support.uz && support.rx && support.ry && support.rz;
}

function isSelected(selection: ViewerSelection, type: "node" | "member", id: string): boolean {
  return selection?.type === type && selection.id === id;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
