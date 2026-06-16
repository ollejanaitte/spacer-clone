import { ja } from "../i18n/ja";
import type { ProjectModel, SectionKey } from "../types";

const treeItems: Array<{ key: SectionKey; label: string }> = [
  { key: "project", label: ja.propertyPanel.sectionTitles.project },
  { key: "nodes", label: ja.propertyPanel.sectionTitles.nodes },
  { key: "members", label: ja.propertyPanel.sectionTitles.members },
  { key: "materials", label: ja.propertyPanel.sectionTitles.materials },
  { key: "sections", label: ja.propertyPanel.sectionTitles.sections },
  { key: "supports", label: ja.propertyPanel.sectionTitles.supports },
  { key: "loadCases", label: ja.propertyPanel.sectionTitles.loadCases },
  { key: "nodalLoads", label: ja.propertyPanel.sectionTitles.nodalLoads },
  { key: "memberLoads", label: ja.propertyPanel.sectionTitles.memberLoads },
  { key: "massCases", label: ja.propertyPanel.sectionTitles.massCases },
  { key: "analysisSettings", label: ja.propertyPanel.sectionTitles.analysisSettings },
  { key: "results", label: ja.propertyPanel.sectionTitles.results },
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
    <aside className="project-tree" aria-label={ja.propertyPanel.treeAriaLabel}>
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
