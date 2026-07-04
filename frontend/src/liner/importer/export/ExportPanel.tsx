import { useCallback, useMemo, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { defaultImporterProjectService } from "../ImporterProjectService";
import type { JipLinerImporterProject } from "../types";
import { buildValidationViewModel } from "./ExportValidator";
import { convertImporterToPhase35Draft } from "./ImporterToPhase35Adapter";
import { conversionLogFileName, defaultConversionLogWriter } from "./ConversionLogWriter";

export type ExportPanelProps = {
  projectId: string;
  bridgeId: string;
  onBack: () => void;
  onExported?: (project: JipLinerImporterProject) => void;
};

export function ExportPanel({ projectId, bridgeId, onBack, onExported }: ExportPanelProps) {
  const service = defaultImporterProjectService;
  const [project, setProject] = useState<JipLinerImporterProject | null>(() =>
    service.loadProject(projectId),
  );
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const bridge = useMemo(
    () => project?.bridges.find((entry) => entry.id === bridgeId) ?? null,
    [project, bridgeId],
  );

  const { summary, visible } = useMemo(() => {
    if (!project) {
      return {
        summary: null,
        visible: [],
      };
    }
    return buildValidationViewModel(project, showAcknowledged);
  }, [project, showAcknowledged]);

  const handleExport = useCallback(() => {
    if (!project || !bridge) {
      setErrorMessage("プロジェクトが見つかりません。");
      return;
    }

    setErrorMessage(null);
    const result = convertImporterToPhase35Draft(project, bridgeId);

    if (result.renderability.export === "blocked" || result.draft == null) {
      setErrorMessage("エクスポート不可: 最小要件または Error 診断を解消してください。");
      return;
    }

    if (result.conversionLog) {
      defaultConversionLogWriter.write(projectId, result.conversionLog);
    }

    const draftJson = JSON.stringify(result.draft, null, 2);
    const logJson = result.conversionLog
      ? defaultConversionLogWriter.write(projectId, result.conversionLog)
      : "";

    const draftBlob = new Blob([draftJson], { type: "application/json" });
    const draftUrl = URL.createObjectURL(draftBlob);
    const draftLink = document.createElement("a");
    draftLink.href = draftUrl;
    draftLink.download = `${project.name}-phase35-draft.json`;
    draftLink.click();
    URL.revokeObjectURL(draftUrl);

    if (logJson.length > 0) {
      const logBlob = new Blob([logJson], { type: "application/json" });
      const logUrl = URL.createObjectURL(logBlob);
      const logLink = document.createElement("a");
      logLink.href = logUrl;
      logLink.download = conversionLogFileName(projectId);
      logLink.click();
      URL.revokeObjectURL(logUrl);
    }

    service.updateLastEditedStep(projectId, "export", { bridgeId });
    setStatusMessage(
      result.renderability.export === "partial"
        ? "Warning 付きで Phase 3.5 draft をエクスポートしました。"
        : "Phase 3.5 draft をエクスポートしました。",
    );
    onExported?.(project);
  }, [bridge, bridgeId, onExported, project, projectId, service]);

  if (!project || !bridge || !summary) {
    return (
      <main className="liner-list-page export-panel" data-testid="export-panel">
        <header className="liner-list-header">
          <div>
            <h1>Phase 3.5 エクスポート</h1>
            <p>プロジェクトが見つかりません。</p>
          </div>
          <button type="button" onClick={onBack} data-testid="export-panel-back">
            <ArrowLeft size={16} />
            戻る
          </button>
        </header>
      </main>
    );
  }

  const exportDisabled = summary.exportBlocked;

  return (
    <main className="liner-list-page export-panel" data-testid="export-panel">
      <header className="liner-list-header">
        <div>
          <h1>Phase 3.5 エクスポート</h1>
          <p>
            {project.name} / {bridge.name}
          </p>
        </div>
        <div className="liner-list-header-actions">
          <button type="button" onClick={onBack} data-testid="export-panel-back">
            <ArrowLeft size={16} />
            戻る
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exportDisabled}
            data-testid="export-panel-export"
          >
            <Download size={16} />
            エクスポート
          </button>
        </div>
      </header>

      {statusMessage && (
        <p className="export-panel-status" data-testid="export-panel-status">
          {statusMessage}
        </p>
      )}
      {errorMessage && (
        <p className="export-panel-error" data-testid="export-panel-error">
          {errorMessage}
        </p>
      )}

      <section className="export-panel-summary" data-testid="export-panel-summary">
        <p>
          Renderability: export = {summary.renderability.export} / Error {summary.errorCount} /
          Warning {summary.warningCount}
        </p>
        <label>
          <input
            type="checkbox"
            checked={showAcknowledged}
            onChange={(event) => setShowAcknowledged(event.target.checked)}
            data-testid="export-panel-show-acknowledged"
          />
          確認済み診断を表示
        </label>
      </section>

      <section className="validation-panel" data-testid="validation-panel">
        <h2>バリデーション</h2>
        <ul className="validation-list">
          {visible.map((item) => (
            <li key={item.id} className={`validation-item diagnostic-${item.level}`}>
              <strong>{item.code}</strong> — {item.message}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export function ValidationPanelPage({
  projectId,
  bridgeId,
  onBack,
  onOpenExport,
}: {
  projectId: string;
  bridgeId: string;
  onBack: () => void;
  onOpenExport: () => void;
}) {
  const service = defaultImporterProjectService;
  const project = service.loadProject(projectId);
  const { summary, visible } = project
    ? buildValidationViewModel(project)
    : { summary: null, visible: [] };

  if (!project || !summary) {
    return (
      <main className="liner-list-page validation-panel-page" data-testid="validation-panel-page">
        <p>プロジェクトが見つかりません。</p>
        <button type="button" onClick={onBack}>
          戻る
        </button>
      </main>
    );
  }

  return (
    <main className="liner-list-page validation-panel-page" data-testid="validation-panel-page">
      <header className="liner-list-header">
        <div>
          <h1>バリデーション</h1>
          <p>
            {project.name} — Error {summary.errorCount} / Warning {summary.warningCount}
          </p>
        </div>
        <button type="button" onClick={onBack} data-testid="validation-panel-back">
          <ArrowLeft size={16} />
          戻る
        </button>
      </header>

      <section className="validation-panel" data-testid="validation-panel">
        <ul className="validation-list">
          {visible.map((item) => (
            <li key={item.id} className={`validation-item diagnostic-${item.level}`}>
              <strong>{item.code}</strong> — {item.message}
            </li>
          ))}
        </ul>
      </section>

      <footer className="validation-panel-footer">
        <button type="button" onClick={onBack}>
          戻る
        </button>
        <button type="button" onClick={onOpenExport} data-testid="validation-panel-to-export">
          エクスポートへ
        </button>
      </footer>
    </main>
  );
}
