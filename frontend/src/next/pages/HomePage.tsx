import { useEffect, useState } from "react";
import type { Project } from "../project/schema";
import { getProjectManager } from "../project/projectManagerInstance";
import { designStageDisplayName, getBusinessNumber } from "../project/businessMetadata";
import { navigateTo, NEXT_BUSINESS_LIST_PATH, NEXT_QUICK_PATH, LEGACY_SYSTEM_PATH } from "../routes";

export type RecentDataItem =
  | { kind: "project"; project: Project }
  | { kind: "quickAnalysis"; label: string };

function loadRecentItems(): RecentDataItem[] {
  const projects = getProjectManager()
    .listProjects()
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return projects.map((project) => ({ kind: "project" as const, project }));
}

export function HomePage() {
  const [recent, setRecent] = useState<RecentDataItem[]>(() => loadRecentItems());

  useEffect(() => {
    setRecent(loadRecentItems());
  }, []);

  return (
    <section className="next-page" data-testid="home-page">
      <h1 className="next-page-title" data-testid="home-title">
        橋梁設計統合システム
      </h1>

      <div className="next-home-grid" data-testid="home-entry-grid">
        <article className="next-home-card" data-testid="home-business-entry">
          <h2 className="next-home-card-title">計画・設計～成果品作成一括</h2>
          <p className="next-hint">現況データから設計、計算書の作成まで一括で行います。</p>
          <button
            type="button"
            className="next-home-primary"
            data-testid="home-go-business"
            onClick={() => navigateTo(NEXT_BUSINESS_LIST_PATH)}
          >
            業務一覧へ ➥
          </button>
        </article>

        <article className="next-home-card" data-testid="home-quick-entry">
          <h2 className="next-home-card-title">クイック検討</h2>
          <p className="next-hint">モデル作成、骨組み解析、時刻歴応答解析などピンポイントで検討する場合はこちら。</p>
          <button
            type="button"
            className="next-home-secondary"
            data-testid="home-go-quick"
            onClick={() => navigateTo(NEXT_QUICK_PATH)}
          >
            レガシーモード ➥
          </button>
        </article>
      </div>

      <details className="next-dev-info" data-testid="home-dev-info">
        <summary>開発者向け情報</summary>
        <p className="next-hint">
          本環境（/app）がproduction正です。canonicalデータの書込みはすべて /app 経由で行います。
          <button
            type="button"
            className="next-link-button"
            data-testid="home-legacy-reference"
            onClick={() => window.location.assign(LEGACY_SYSTEM_PATH)}
          >
            legacy /pro（資産確認・参照用）
          </button>
        </p>
      </details>

      <div className="next-home-recent" data-testid="home-recent">
        <h2 className="next-home-section-title">最近使用したデータ</h2>
        {recent.length === 0 ? (
          <div className="next-empty" data-testid="home-recent-empty">
            <p>最近使用したデータはありません。</p>
            <p className="next-hint">業務一覧からProjectを作成・開くと、ここに表示されます。</p>
          </div>
        ) : (
          <ul className="next-recent-list" data-testid="home-recent-list">
            {recent.map((item) =>
              item.kind === "project" ? (
                <li key={item.project.projectId} className="next-recent-item" data-testid="home-recent-project">
                  <span className="next-recent-kind">Project</span>
                  <span className="next-recent-name">{item.project.name}</span>
                  <span className="next-recent-meta">{getBusinessNumber(item.project)}</span>
                  <span className="next-recent-meta">{designStageDisplayName(item.project)}</span>
                  <span className="next-recent-meta">{item.project.updatedAt}</span>
                </li>
              ) : (
                <li key={item.label} className="next-recent-item" data-testid="home-recent-quick">
                  <span className="next-recent-kind">単体計算</span>
                  <span className="next-recent-name">{item.label}</span>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </section>
  );
}