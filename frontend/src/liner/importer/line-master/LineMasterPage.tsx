import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { defaultImporterProjectService } from "../ImporterProjectService";
import type { Bridge, JipLinerImporterProject } from "../types";
import { LineMasterHelpButton, LineMasterHelpModal } from "./LineMasterHelpModal";
import { LineMasterTable } from "./LineMasterTable";
import { LineMasterToolbar } from "./LineMasterToolbar";
import {
  findCopySourceBridge,
  REFERENCE_MODE_OPTIONS,
  resolvePrimaryGirderLineSet,
  useLineMasterEditor,
} from "./lineMasterHooks";

export type LineMasterPageProps = {
  projectId: string;
  bridgeId: string;
  onBack: () => void;
  onSaved?: (project: JipLinerImporterProject) => void;
};

export function LineMasterPage({ projectId, bridgeId, onBack, onSaved }: LineMasterPageProps) {
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

  const initialSet = useMemo(
    () => (bridge ? resolvePrimaryGirderLineSet(bridge) : null),
    [bridge],
  );

  const {
    draft,
    orderedLines,
    setName,
    setReferenceMode,
    setAppliesToSpanIds,
    updateLine,
    addLine,
    removeLine,
    reorderLine,
    importCsv,
    replaceFromSet,
    resetDraft,
  } = useLineMasterEditor(initialSet ?? {
    id: "placeholder",
    name: "CL",
    referenceMode: "pdf-row-master",
    appliesToSpanIds: [],
    lines: [],
  });

  useEffect(() => {
    if (initialSet) {
      resetDraft(initialSet);
    }
  }, [initialSet, resetDraft]);

  useEffect(() => {
    return () => {
      if (project) {
        service.updateLastEditedStep(projectId, "lineMaster", { bridgeId });
      }
    };
  }, [project, projectId, bridgeId, service]);

  const copySourceBridge = useMemo(
    () => (project ? findCopySourceBridge(project, bridgeId) : null),
    [project, bridgeId],
  );

  const handleCopyFromPreviousBridge = useCallback(() => {
    if (!copySourceBridge || copySourceBridge.girderLineSets.length === 0) {
      return;
    }
    replaceFromSet(copySourceBridge.girderLineSets[0]!);
    setStatusMessage(`${copySourceBridge.name} から橋軸線設定をコピーしました。`);
    setErrorMessage(null);
  }, [copySourceBridge, replaceFromSet]);

  const handleSave = useCallback(() => {
    if (!bridge) {
      setErrorMessage("橋梁が見つかりません。");
      return;
    }

    setErrorMessage(null);
    try {
      const saved = service.saveBridgeGirderLineSet(projectId, bridgeId, draft);
      setProject(saved);
      setStatusMessage("基準ライン / 橋軸線マスタを保存しました。");
      onSaved?.(saved);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存に失敗しました。");
    }
  }, [bridge, bridgeId, draft, onSaved, projectId, service]);

  if (!project || !bridge || !initialSet) {
    return (
      <main className="liner-list-page line-master-page" data-testid="line-master-page">
        <header className="liner-list-header">
          <div>
            <h1>基準ライン / 橋軸線マスタ</h1>
            <p>プロジェクトまたは橋梁が見つかりません。</p>
          </div>
          <button type="button" onClick={onBack} data-testid="line-master-back">
            <ArrowLeft size={16} />
            戻る
          </button>
        </header>
      </main>
    );
  }

  return (
    <main className="liner-list-page line-master-page" data-testid="line-master-page">
      <header className="liner-list-header">
        <div>
          <h1>基準ライン / 橋軸線マスタ</h1>
          <p>
            {project.name} / {bridge.name}
          </p>
        </div>
        <div className="liner-list-header-actions">
          <LineMasterHelpButton onOpen={() => setHelpOpen(true)} />
          <button type="button" onClick={onBack} data-testid="line-master-back">
            <ArrowLeft size={16} />
            戻る
          </button>
          <button type="button" onClick={handleSave} data-testid="line-master-save">
            <Save size={16} />
            保存
          </button>
        </div>
      </header>

      {statusMessage && (
        <p className="line-master-status" data-testid="line-master-status">
          {statusMessage}
        </p>
      )}
      {errorMessage && (
        <p className="line-master-error" data-testid="line-master-error">
          {errorMessage}
        </p>
      )}

      <section className="line-master-settings" data-testid="line-master-settings">
        <label className="line-master-field">
          <span>基準ライン名</span>
          <input
            type="text"
            value={draft.name}
            onChange={(event) => setName(event.target.value)}
            data-testid="line-master-set-name"
          />
        </label>
        <label className="line-master-field">
          <span>参照方式</span>
          <select
            value={draft.referenceMode}
            onChange={(event) =>
              setReferenceMode(event.target.value as typeof draft.referenceMode)
            }
            data-testid="line-master-reference-mode"
          >
            {REFERENCE_MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {bridge.spans.length > 0 && (
          <fieldset className="line-master-span-fieldset">
            <legend>対象径間</legend>
            {bridge.spans.map((span) => {
              const checked = draft.appliesToSpanIds.includes(span.id);
              return (
                <label key={span.id} className="line-master-span-option">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      const nextIds = event.target.checked
                        ? [...draft.appliesToSpanIds, span.id]
                        : draft.appliesToSpanIds.filter((spanId) => spanId !== span.id);
                      setAppliesToSpanIds(nextIds);
                    }}
                    data-testid={`line-master-span-${span.id}`}
                  />
                  {span.name}
                </label>
              );
            })}
          </fieldset>
        )}
      </section>

      <LineMasterToolbar
        canCopyFromPreviousBridge={copySourceBridge != null}
        onAddLine={addLine}
        onImportCsv={(text) => {
          importCsv(text);
          setStatusMessage("CSV を橋軸線一覧へ追加しました。");
          setErrorMessage(null);
        }}
        onCopyFromPreviousBridge={handleCopyFromPreviousBridge}
      />

      <LineMasterTable
        lines={orderedLines}
        spans={bridge.spans}
        appliesToSpanIds={draft.appliesToSpanIds}
        onChange={updateLine}
        onRemove={removeLine}
        onMove={reorderLine}
      />

      <footer className="line-master-footer">
        <button type="button" onClick={onBack}>
          戻る
        </button>
        <button type="button" onClick={handleSave} data-testid="line-master-save-footer">
          保存して次へ
        </button>
      </footer>

      <LineMasterHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </main>
  );
}

export function resolveBridgeForLineMaster(project: JipLinerImporterProject, bridgeId?: string): Bridge | null {
  if (bridgeId) {
    return project.bridges.find((bridge) => bridge.id === bridgeId) ?? null;
  }
  return project.bridges[0] ?? null;
}
