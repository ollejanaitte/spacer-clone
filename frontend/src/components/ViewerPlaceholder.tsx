import type { ProjectModel, SectionKey } from "../types";

type ViewerPlaceholderProps = {
  project: ProjectModel;
  selected: SectionKey;
};

export function ViewerPlaceholder({ project, selected }: ViewerPlaceholderProps) {
  return (
    <main className="viewer-shell">
      <div className="viewer-header">
        <div>
          <h2>3D表示</h2>
          <p>選択中: {selected}</p>
        </div>
        <div className="viewer-stats">
          <span>節点 {project.nodes.length}</span>
          <span>部材 {project.members.length}</span>
          <span>荷重ケース {project.loadCases.length}</span>
        </div>
      </div>
      <div className="model-placeholder" role="img" aria-label="モデル概要">
        <div className="axis x-axis">X</div>
        <div className="axis y-axis">Y</div>
        <div className="axis z-axis">Z</div>
        <div className="member-line" />
        {project.nodes.slice(0, 8).map((node, index) => (
          <span
            key={node.id}
            className={selected === "nodes" ? "node-dot selected" : "node-dot"}
            style={{
              left: `${24 + index * 8}%`,
              top: `${52 - Math.min(Math.max(node.y, -4), 4) * 3}%`,
            }}
            title={node.id}
          />
        ))}
      </div>
    </main>
  );
}
