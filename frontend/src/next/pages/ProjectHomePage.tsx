import { navigateTo, NEXT_BUSINESS_LIST_PATH } from "../routes";

export type ProjectHomeSectionId =
  | "overview"
  | "road"
  | "terrain"
  | "bridgeLayout"
  | "substructure"
  | "superstructure"
  | "analysis"
  | "cim"
  | "deliverables";

const SECTIONS: ReadonlyArray<{ id: ProjectHomeSectionId; label: string; implemented: boolean }> = [
  { id: "overview", label: "業務概要", implemented: true },
  { id: "road", label: "道路", implemented: false },
  { id: "terrain", label: "地形・現況", implemented: false },
  { id: "bridgeLayout", label: "橋梁配置", implemented: false },
  { id: "substructure", label: "下部工", implemented: false },
  { id: "superstructure", label: "上部工", implemented: false },
  { id: "analysis", label: "FEM / 構造解析", implemented: false },
  { id: "cim", label: "CIM / 統合3D", implemented: false },
  { id: "deliverables", label: "成果品", implemented: false },
];

export function ProjectHomePage({ projectId }: { projectId: string }) {
  return (
    <section className="next-page" data-testid="project-home-page">
      <h1 className="next-page-title">Project Home</h1>
      <button
        type="button"
        className="next-link-button"
        data-testid="project-home-back"
        onClick={() => navigateTo(NEXT_BUSINESS_LIST_PATH)}
      >
        ← 業務一覧へ
      </button>
      <p className="next-hint" data-testid="project-home-id">
        Project ID: {projectId}
      </p>

      <ul className="next-section-list" data-testid="project-home-sections">
        {SECTIONS.map((section) => (
          <li key={section.id} className="next-section-item">
            <div className="next-section-label">{section.label}</div>
            <div className="next-section-status">
              {section.implemented ? (
                <span className="next-badge next-badge-implemented">実装済み</span>
              ) : (
                <span className="next-badge next-badge-todo" data-testid={`section-${section.id}-todo`}>
                  未実装（後続Phaseで実装）
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
