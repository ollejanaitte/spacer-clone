import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, HelpCircle, Save } from "lucide-react";
import { defaultImporterProjectService } from "../ImporterProjectService";
import type { JipLinerImporterProject } from "../types";
import { calculateBridgeInputRate } from "../utils/importerUtils";
import { mergeBridgeIntoProject, useSectionListEditor } from "./sectionListHooks";
import { SectionListTable } from "./SectionListTable";
import { SectionListToolbar } from "./SectionListToolbar";

export type SectionListPageProps = {
  projectId: string;
  bridgeId: string;
  onBack: () => void;
  onEditSection: (sectionId: string) => void;
  onNext?: () => void;
  onSaved?: (project: JipLinerImporterProject) => void;
};

export function SectionListPage({
  projectId,
  bridgeId,
  onBack,
  onEditSection,
  onNext,
  onSaved,
}: SectionListPageProps) {
  const service = defaultImporterProjectService;
  const [project, setProject] = useState<JipLinerImporterProject | null>(() =>
    service.loadProject(projectId),
  );
  const [helpOpen, setHelpOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const bridge = useMemo(
    () => project?.bridges.find((entry) => entry.id === bridgeId) ?? null,
    [project, bridgeId],
  );

  const {
    draft,
    summaries,
    resetDraft,
    addSection,
    removeSection,
    duplicateSection,
    bulkCreateByPdfPages,
  } = useSectionListEditor(
    bridge ?? {
      id: bridgeId,
      name: "",
      girderLineSets: [],
      spans: [],
      sections: [],
    },
  );

  useEffect(() => {
    if (bridge) {
      resetDraft(bridge);
    }
  }, [bridge, resetDraft]);

  useEffect(() => {
    return () => {
      if (project) {
        service.updateLastEditedStep(projectId, "sectionList", { bridgeId });
      }
    };
  }, [project, projectId, bridgeId, service]);

  const inputRate = useMemo(() => calculateBridgeInputRate(draft), [draft]);

  const handleSave = useCallback(() => {
    if (!project || !bridge) {
      setErrorMessage("橋梁が見つかりません。");
      return;
    }

    setErrorMessage(null);
    try {
      const saved = service.saveBridgeSections(projectId, bridgeId, draft.sections);
      setProject(saved);
      setStatusMessage("横断面リストを保存しました。");
      onSaved?.(saved);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存に失敗しました。");
    }
  }, [bridge, bridgeId, draft.sections, onSaved, project, projectId, service]);

  const handleSaveAndNext = useCallback(() => {
    handleSave();
    onNext?.();
  }, [handleSave, onNext]);

  const handleDelete = useCallback(
    (sectionId: string) => {
      if (!window.confirm("この横断面を削除しますか？")) {
        return;
      }
      removeSection(sectionId);
      setStatusMessage("横断面を削除しました（保存で確定）。");
    },
    [removeSection],
  );

  if (!project || !bridge) {
    return (
      <main className="liner-list-page section-list-page" data-testid="section-list-page">
        <header className="liner-list-header">
          <div>
            <h1>横断面リスト</h1>
            <p>プロジェクトまたは橋梁が見つかりません。</p>
          </div>
          <button type="button" onClick={onBack} data-testid="section-list-back">
            <ArrowLeft size={16} />
            戻る
          </button>
        </header>
      </main>
    );
  }

  return (
    <main className="liner-list-page section-list-page" data-testid="section-list-page">
      <header className="liner-list-header">
        <div>
          <h1>横断面リスト</h1>
          <p>
            {project.name} / {bridge.name} — 入力率 {inputRate}%
          </p>
        </div>
        <div className="liner-list-header-actions">
          <button
            type="button"
            className="importer-help-header"
            onClick={() => setHelpOpen((open) => !open)}
            data-testid="section-list-help"
          >
            <HelpCircle size={16} />
            わからん
          </button>
          <button type="button" onClick={onBack} data-testid="section-list-back">
            <ArrowLeft size={16} />
            戻る
          </button>
          <button type="button" onClick={handleSave} data-testid="section-list-save">
            <Save size={16} />
            保存
          </button>
        </div>
      </header>

      {helpOpen && (
        <dialog open className="section-list-help-dialog" data-testid="section-list-help-dialog">
          <h2>横断面リスト ヘルプ</h2>
          <p>PDF 1 ページ = 1 横断面として登録します。入力率と描画可否を確認してから編集へ進んでください。</p>
          <button type="button" onClick={() => setHelpOpen(false)}>
            閉じる (Esc)
          </button>
        </dialog>
      )}

      {statusMessage && (
        <p className="section-list-status" data-testid="section-list-status">
          {statusMessage}
        </p>
      )}
      {errorMessage && (
        <p className="section-list-error" data-testid="section-list-error">
          {errorMessage}
        </p>
      )}

      <SectionListToolbar
        onAddSection={addSection}
        onDuplicatePrevious={() => duplicateSection("")}
        onBulkCreate={bulkCreateByPdfPages}
      />

      <SectionListTable
        summaries={summaries}
        onEdit={onEditSection}
        onDuplicate={duplicateSection}
        onDelete={handleDelete}
      />

      <footer className="section-list-footer">
        <button type="button" onClick={onBack}>
          戻る
        </button>
        <button type="button" onClick={handleSaveAndNext} data-testid="section-list-save-next">
          保存して次へ
        </button>
      </footer>
    </main>
  );
}

export { mergeBridgeIntoProject };
