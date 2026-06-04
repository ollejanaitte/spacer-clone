import type { ProjectModel, SectionKey } from "../types";

const treeItems: Array<{ key: SectionKey; label: string }> = [
  { key: "project", label: "Project" },
  { key: "nodes", label: "Nodes" },
  { key: "members", label: "Members" },
  { key: "materials", label: "Materials" },
  { key: "sections", label: "Sections" },
  { key: "supports", label: "Supports" },
  { key: "loadCases", label: "Load Cases" },
  { key: "nodalLoads", label: "Nodal Loads" },
  { key: "memberLoads", label: "Member Loads" },
  { key: "analysisSettings", label: "Analysis Settings" },
  { key: "results", label: "Results" },
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
  };

  return (
    <aside className="project-tree" aria-label="Project tree">
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
