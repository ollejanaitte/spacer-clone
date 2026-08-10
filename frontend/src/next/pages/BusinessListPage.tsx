import { useEffect, useState } from "react";
import { navigateTo, NEXT_BUSINESS_LIST_PATH } from "../routes";
import type { ProjectSummary } from "../types";

type LoadState = "loading" | "ready" | "error";

export function BusinessListPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    // R1-01: 業務一覧の実データは R1-04 で Project Repository へ接続する。
    // この段階では Repository が空の状態を正しく表示できる骨格のみ。
    setLoadState("ready");
    setProjects([]);
  }, []);

  return (
    <section className="next-page" data-testid="business-list-page">
      <h1 className="next-page-title">業務一覧</h1>
      <div className="next-actions">
        <button
          type="button"
          data-testid="new-project-button"
          onClick={() => navigateTo(NEXT_BUSINESS_LIST_PATH)}
        >
          ＋ 新しい業務
        </button>
      </div>

      {loadState === "loading" && <p className="next-hint">読み込み中…</p>}
      {loadState === "error" && (
        <p className="next-error" role="alert" data-testid="business-list-error">
          業務一覧を読み込めませんでした。
        </p>
      )}
      {loadState === "ready" && projects.length === 0 && (
        <div className="next-empty" data-testid="business-list-empty">
          <p>業務がまだありません。</p>
          <p className="next-hint">「新しい業務」から最初の業務を作成してください。</p>
        </div>
      )}
      {loadState === "ready" && projects.length > 0 && (
        <ul className="next-project-list" data-testid="business-list">
          {projects.map((project) => (
            <li key={project.projectId} className="next-project-card">
              <div className="next-project-name">{project.name}</div>
              <div className="next-project-meta">
                <span>更新: {project.updatedAt}</span>
                <span>schema: {project.schemaVersion}</span>
                <span className="next-project-id">{project.projectId}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
