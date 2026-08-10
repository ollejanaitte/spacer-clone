import { useState } from "react";
import { designStageDisplayName, getBusinessNumber } from "../project/businessMetadata";
import { getProjectManager } from "../project/projectManagerInstance";
import { navigateTo, NEXT_BUSINESS_LIST_PATH } from "../routes";

export type ProjectSectionId =
  | "businessInfo"
  | "road"
  | "terrain"
  | "bridgeLayout"
  | "substructure"
  | "superstructure"
  | "analysis"
  | "cim"
  | "deliverables";

const SECTIONS: ReadonlyArray<{ id: ProjectSectionId; label: string; implemented: boolean }> = [
  { id: "businessInfo", label: "業務情報", implemented: false },
  { id: "road", label: "道路", implemented: false },
  { id: "terrain", label: "地形・現況", implemented: false },
  { id: "bridgeLayout", label: "橋梁配置", implemented: false },
  { id: "substructure", label: "下部工", implemented: false },
  { id: "superstructure", label: "上部工", implemented: false },
  { id: "analysis", label: "FEM / 構造解析", implemented: false },
  { id: "cim", label: "CIM / 統合3D", implemented: false },
  { id: "deliverables", label: "成果品", implemented: false },
];

export function ProjectTopPage({ projectId }: { projectId: string }) {
  const [project] = useState(() => getProjectManager().getProject(projectId));

  if (!project) {
    return (
      <section className="next-page" data-testid="project-top-page">
        <h1 className="next-page-title">Projectトップ</h1>
        <div className="next-error" data-testid="project-top-not-found">
          Projectが見つかりません。
        </div>
        <button
          type="button"
          className="next-link-button"
          onClick={() => navigateTo(NEXT_BUSINESS_LIST_PATH)}
        >
          ← 業務一覧へ
        </button>
      </section>
    );
  }

  return (
    <section className="next-page" data-testid="project-top-page">
      <h1 className="next-page-title">Projectトップ</h1>
      <button
        type="button"
        className="next-link-button"
        data-testid="project-top-back"
        onClick={() => navigateTo(NEXT_BUSINESS_LIST_PATH)}
      >
        ← 業務一覧へ
      </button>

      <div className="next-project-head" data-testid="project-top-head">
        <h2 className="next-project-head-name" data-testid="project-top-name">
          {project.name}
        </h2>
        <dl className="next-project-head-meta">
          <div>
            <dt>業務件番</dt>
            <dd data-testid="project-top-number">{getBusinessNumber(project)}</dd>
          </div>
          <div>
            <dt>設計段階</dt>
            <dd data-testid="project-top-stage">{designStageDisplayName(project)}</dd>
          </div>
          <div>
            <dt>更新日時</dt>
            <dd data-testid="project-top-updated">{project.updatedAt}</dd>
          </div>
          <div>
            <dt>システム内部Project ID</dt>
            <dd className="next-project-id" data-testid="project-top-internal-id">
              {project.projectId}
            </dd>
          </div>
        </dl>
      </div>

      <ul className="next-section-list" data-testid="project-top-sections">
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
