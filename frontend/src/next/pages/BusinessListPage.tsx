import { useMemo, useState } from "react";
import type { Project } from "../project/schema";
import { getProjectManager } from "../project/projectManagerInstance";
import { designStageDisplayName, getBusinessNumber } from "../project/businessMetadata";
import { DeleteConfirm, useDeleteConfirm } from "../components/DeleteConfirm";
import { exportProjectToPackage } from "../persistence/package/projectPackageExporter";
import { navigateTo, NEXT_PROJECT_HOME_PATH, NEXT_HOME_PATH } from "../routes";
import { loadReferenceBusinessSample } from "../samples/referenceBusiness001Loader";

export function BusinessListPage() {
  const [projects, setProjects] = useState<Project[]>(() => [...getProjectManager().listProjects()]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [sampleLoading, setSampleLoading] = useState(false);
  const deleteConfirm = useDeleteConfirm();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return projects;
    return projects.filter((p) => {
      const name = p.name.toLowerCase();
      const number = getBusinessNumber(p).toLowerCase();
      const stage = designStageDisplayName(p).toLowerCase();
      return name.includes(q) || number.includes(q) || stage.includes(q) || p.projectId.includes(q);
    });
  }, [projects, query]);

  function refresh() {
    setProjects([...getProjectManager().listProjects()]);
  }

  async function handleLoadReferenceBusiness() {
    setSampleLoading(true);
    setMessage(null);
    try {
      const result = await loadReferenceBusinessSample();
      if (result.ok) {
        setMessage(`Reference Business 001 を読み込みました: ${result.name}`);
        refresh();
      } else {
        setMessage(result.reason);
      }
    } finally {
      setSampleLoading(false);
    }
  }

  function handleDuplicate(project: Project) {
    const result = getProjectManager().duplicateProject(project.projectId);
    if (!result.ok) {
      setMessage("複製に失敗しました。");
      return;
    }
    setMessage(`複製しました: ${result.project.name}`);
    refresh();
  }

  function handleConfirmDelete() {
    const pendingId = projects.find((p) => p.name === deleteConfirm.pendingName)?.projectId;
    if (pendingId !== undefined) {
      getProjectManager().deleteProject(pendingId);
      setMessage("削除しました。");
    }
    deleteConfirm.cancel();
    refresh();
  }

  async function handleExport(project: Project) {
    setExportingId(project.projectId);
    const result = await exportProjectToPackage(project);
    setExportingId(null);
    if (result.ok) {
      setMessage(`書き出しました: ${result.filePath}`);
    } else if (result.reason === "canceled") {
      setMessage("書き出しをキャンセルしました。");
    } else {
      setMessage("書き出しに失敗しました。");
    }
  }

  return (
    <section className="next-page next-page-wide" data-testid="business-list-page">
      <h1 className="next-page-title">業務一覧</h1>
      <div className="next-actions next-actions-large">
        <button
          type="button"
          className="next-entry-new"
          data-testid="new-project-button"
          onClick={() => navigateTo("/app/business/new")}
        >
          ＋ 新規作成
        </button>
        <button
          type="button"
          className="next-entry-load"
          data-testid="load-business-button"
          onClick={() => navigateTo("/app/business/load")}
        >
          ⇩ 業務データ読み込み
        </button>
        <button
          type="button"
          className="next-entry-sample"
          data-testid="load-reference-business-button"
          onClick={() => void handleLoadReferenceBusiness()}
          disabled={sampleLoading}
        >
          {sampleLoading ? "読み込み中..." : "サンプル業務読み込み"}
        </button>
      </div>

      <details className="next-dev-info" data-testid="business-search-collapsible">
        <summary>業務検索・開発者向け</summary>
        <div className="next-search">
          <input
            type="search"
            placeholder="業務検索（業務名・件番・設計段階）"
            data-testid="business-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
        />
        </div>
      </details>

      {message !== null && (
        <div className="next-message" data-testid="business-message">
          {message}
          <button type="button" className="next-message-close" onClick={() => setMessage(null)}>
            ×
          </button>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="next-empty" data-testid="business-list-empty">
          <p>業務がまだありません。</p>
          <p className="next-hint">「＋ 新規作成」から最初の業務を作成してください。</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="next-empty" data-testid="business-search-empty">
          <p>検索条件に一致する業務がありません。</p>
        </div>
      ) : (
        <div className="next-table-wrap">
          <table className="next-table" data-testid="business-table">
            <thead>
              <tr>
                <th>No</th>
                <th>業務件番</th>
                <th>業務名</th>
                <th>設計段階</th>
                <th>更新日時</th>
                <th>システム内部プロジェクトID</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((project, index) => (
                <tr key={project.projectId} data-testid="business-row">
                  <td>{index + 1}</td>
                  <td data-testid="business-number">{getBusinessNumber(project)}</td>
                  <td data-testid="business-name">{project.name}</td>
                  <td data-testid="business-stage">{designStageDisplayName(project)}</td>
                  <td data-testid="business-updated">{project.updatedAt}</td>
                  <td className="next-table-id" data-testid="business-internal-id">{project.projectId}</td>
                  <td className="next-table-actions">
                    <button type="button" data-testid="business-open" onClick={() => navigateTo(`${NEXT_PROJECT_HOME_PATH}/${project.projectId}`)}>
                      業務を開く
                    </button>
                    <button type="button" data-testid="business-edit" onClick={() => navigateTo(`/app/business/${project.projectId}/edit`)}>
                      業務編集✐
                    </button>
                    <button type="button" data-testid="business-export" onClick={() => void handleExport(project)} disabled={exportingId === project.projectId}>
                      {exportingId === project.projectId ? "書き出し中..." : "外部へ書き出し"}
                    </button>
                    <button type="button" data-testid="business-duplicate" onClick={() => handleDuplicate(project)}>
                      複製
                    </button>
                    <button type="button" className="next-danger" data-testid="business-delete" onClick={() => deleteConfirm.requestDelete(project.name)}>
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteConfirm.pendingName !== null && (
        <DeleteConfirm
          projectName={deleteConfirm.pendingName}
          onConfirm={handleConfirmDelete}
          onCancel={deleteConfirm.cancel}
        />
      )}

      <div className="next-footer-actions">
        <button
          type="button"
          className="next-footer-back"
          data-testid="business-back-home"
          onClick={() => navigateTo(NEXT_HOME_PATH)}
        >
          戻る
        </button>
      </div>
    </section>
  );
}