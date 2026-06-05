import type { ProjectModel, SectionKey } from "../types";

const treeItems: Array<{ key: SectionKey; label: string }> = [
  { key: "project", label: "プロジェクト" },
  { key: "nodes", label: "節点" },
  { key: "members", label: "部材" },
  { key: "materials", label: "材料" },
  { key: "sections", label: "断面" },
  { key: "supports", label: "支点条件" },
  { key: "loadCases", label: "荷重ケース" },
  { key: "nodalLoads", label: "節点荷重" },
  { key: "memberLoads", label: "部材荷重" },
  { key: "massCases", label: "質量" },
  { key: "analysisSettings", label: "解析設定" },
  { key: "results", label: "解析結果" },
];

type ProjectTreeProps = {
  project: ProjectModel;
  selected: SectionKey;
  onSelect: (section: SectionKey) => void;
};

export function ProjectTree({ project, selected, onSelect }: ProjectTreeProps) {
  const counts: Partial<Record<SectionKey, number>> = {
    nodes: project.nodes.length,
    members: project.members.length,
    materials: project.materials.length,
    sections: project.sections.length,
    supports: project.supports.length,
    loadCases: project.loadCases.length,
    nodalLoads: project.nodalLoads.length,
    memberLoads: project.memberLoads.length,
    massCases: project.massCases?.[0]?.items.length ?? 0,
  };

  return (
    <aside className="project-tree" aria-label="プロジェクトツリー">
      {treeItems.map((item) => (
        <button
          key={item.key}
          type="button"
          className={selected === item.key ? "tree-item active" : "tree-item"}
          onClick={() => onSelect(item.key)}
        >
          <span>{item.label}</span>
          {counts[item.key] !== undefined && <strong>{counts[item.key]}</strong>}
        </button>
      ))}
    </aside>
  );
}
