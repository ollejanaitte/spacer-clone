import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, FilePlus2, FolderOpen, Trash2, Upload } from "lucide-react";
import {
  defaultImporterProjectService,
  type ProjectListEntry,
} from "../ImporterProjectService";

export type ImporterProjectListPageProps = {
  onClose: () => void;
  onOpenProject?: (projectId: string, bridgeId: string) => void;
};

function formatUpdatedAt(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return value;
  }
  return new Date(timestamp).toLocaleString("ja-JP");
}

export function ImporterProjectListPage({ onClose, onOpenProject }: ImporterProjectListPageProps) {
  const service = defaultImporterProjectService;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [projects, setProjects] = useState<ProjectListEntry[]>(() => service.listProjects());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshProjects = useCallback(() => {
    setProjects(service.listProjects());
  }, [service]);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  const handleOpen = (projectId: string) => {
    setErrorMessage(null);
    let project = service.loadProject(projectId);
    if (!project) {
      setErrorMessage("プロジェクトが見つかりません。");
      return;
    }

    if (project.bridges.length === 0) {
      project = service.createBridge(projectId, "新規橋梁");
    }

    const bridge = project.bridges[0];
    if (!bridge) {
      setErrorMessage("橋梁の作成に失敗しました。");
      return;
    }

    onOpenProject?.(project.id, bridge.id);
  };

  const handleCreate = () => {
    setErrorMessage(null);
    const created = service.createEmptyProject();
    setStatusMessage(`プロジェクトを作成しました: ${created.name}`);
    refreshProjects();
  };

  const handleDelete = (projectId: string, projectName: string) => {
    if (!window.confirm(`「${projectName}」を削除しますか？`)) {
      return;
    }

    setErrorMessage(null);
    service.deleteProject(projectId);
    setStatusMessage(`プロジェクトを削除しました: ${projectName}`);
    refreshProjects();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setErrorMessage(null);
    try {
      const jsonText = await file.text();
      const imported = service.importProjectJson(jsonText);
      if (!imported.ok || !imported.project) {
        setErrorMessage(
          imported.diagnostics.map((entry) => entry.message).join("\n") ||
            "JSON の読み込みに失敗しました。",
        );
        return;
      }

      service.saveProject(imported.project);
      setStatusMessage(`JSON を読み込みました: ${imported.project.name}`);
      refreshProjects();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "JSON の読み込みに失敗しました。");
    }
  };

  return (
    <main className="liner-list-page importer-project-list-page" data-testid="importer-project-list-page">
      <header className="liner-list-header">
        <div>
          <h1>Phase 3.6 Importer Projects</h1>
          <p>JIP-LINER PDF 入力プロジェクトの作成・保存・読み込み</p>
        </div>
        <div className="liner-list-header-actions">
          <button type="button" onClick={onClose} data-testid="close-importer-project-list">
            <ArrowLeft size={16} />
            戻る
          </button>
          <button type="button" onClick={handleCreate} data-testid="create-importer-project">
            <FilePlus2 size={16} />
            新規作成
          </button>
          <button type="button" onClick={handleImportClick} data-testid="import-importer-project-json">
            <Upload size={16} />
            JSON読み込み
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={handleImportFile}
            data-testid="importer-project-json-input"
          />
        </div>
      </header>

      {statusMessage && (
        <p className="importer-project-list-status" data-testid="importer-project-list-status">
          {statusMessage}
        </p>
      )}
      {errorMessage && (
        <p className="importer-project-list-error" data-testid="importer-project-list-error">
          {errorMessage}
        </p>
      )}

      <section className="liner-list-content" aria-label="保存済み Importer プロジェクト一覧">
        {projects.length === 0 ? (
          <div className="liner-list-empty" data-testid="importer-project-list-empty">
            <h2>保存済みプロジェクトがありません</h2>
            <p>新規作成または JSON 読み込みから開始してください。</p>
            <button type="button" onClick={handleCreate}>
              <FilePlus2 size={16} />
              新規作成
            </button>
          </div>
        ) : (
          <div className="liner-list-table-wrap">
            <table className="liner-list-table">
              <caption>保存済み一覧</caption>
              <thead>
                <tr>
                  <th>プロジェクト名</th>
                  <th>橋梁数</th>
                  <th>保存済みスナップショット</th>
                  <th>最終更新</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} data-testid={`importer-project-row-${project.id}`}>
                    <td>{project.name}</td>
                    <td>{project.bridgeCount}</td>
                    <td>{project.snapshotCount}</td>
                    <td>{formatUpdatedAt(project.updatedAt)}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleOpen(project.id)}
                        data-testid={`open-importer-project-${project.id}`}
                      >
                        <FolderOpen size={16} />
                        開く
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(project.id, project.name)}
                        data-testid={`delete-importer-project-${project.id}`}
                      >
                        <Trash2 size={16} />
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
