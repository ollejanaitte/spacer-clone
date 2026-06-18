import { Activity, Download, FileText, FolderOpen, LineChart, Play, RotateCcw, Save, ShieldCheck, Waves } from "lucide-react";
import { ja } from "../i18n/ja";

type ToolbarProps = {
  projectName: string;
  appVersion: string;
  dirty: boolean;
  validationStatus: string;
  analysisStatus: string;
  canRun: boolean;
  canExportResults: boolean;
  canExportCsv: boolean;
  canExportPdf: boolean;
  onNew: () => void;
  onOpen: (file: File) => void;
  onSave: () => void;
  onValidate: () => void;
  onRun: () => void;
  onRunEigen: () => void;
  onRunInfluence: () => void;
  onRunResponseSpectrum: () => void;
  onOpenTimeHistoryWizard?: () => void;
  onExportResultJson: () => void;
  onExportResultCsv: () => void;
  onExportResultPdf: () => void;
  onOpenBridgeWizard: () => void;
  onOpenModelComparison?: () => void;
};

const t = ja.toolbar;

export function Toolbar({
  projectName,
  appVersion,
  dirty,
  validationStatus,
  analysisStatus,
  canRun,
  canExportResults,
  canExportCsv,
  canExportPdf,
  onNew,
  onOpen,
  onSave,
  onValidate,
  onRun,
  onRunEigen,
  onRunInfluence,
  onRunResponseSpectrum,
  onOpenTimeHistoryWizard,
  onExportResultJson,
  onExportResultCsv,
  onExportResultPdf,
  onOpenBridgeWizard,
  onOpenModelComparison = () => undefined,
}: ToolbarProps) {
  return (
    <header className="toolbar">
      <div className="project-strip">
        <span className="app-mark">{ja.app.appMark}</span>
        <div>
          <h1>{projectName}</h1>
          <p>
            {dirty ? t.unsavedChanges : t.saved} / {validationStatus} / {analysisStatus}
          </p>
          <p className="app-version" aria-label="app-version">{ja.app.versionPrefix} {appVersion}</p>
        </div>
      </div>
      <div className="toolbar-actions">
        <div className="toolbar-group">
          <button type="button" onClick={onNew} title={t.newTitle}>
            <RotateCcw size={16} />
            {t.newButton}
          </button>
          <label className="button-like" title={t.openTitle}>
            <FolderOpen size={16} />
            {t.openButton}
            <input
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onOpen(file);
                event.currentTarget.value = "";
              }}
            />
          </label>
          <button
            type="button"
            onClick={onOpenBridgeWizard}
            title={t.bridgeWizardTitle}
            data-testid="open-bridge-wizard"
          >
            <LineChart size={16} />
            {t.bridgeWizardButton}
          </button>
          <button type="button" onClick={onSave} title={t.saveTitle}>
            <Save size={16} />
            {t.saveButton}
          </button>
          {onOpenTimeHistoryWizard && (
            <button
              type="button"
              onClick={onOpenTimeHistoryWizard}
              title="時刻歴応答解析を開く"
              data-testid="open-time-history-wizard"
            >
              <Activity size={16} />
              時刻歴応答解析を開く
            </button>
          )}
          <button type="button" data-testid="open-model-comparison" onClick={onOpenModelComparison}>
            A/B 比較
          </button>
        </div>
        <div className="toolbar-group">
          <button type="button" onClick={onValidate} title={t.validateTitle}>
            <ShieldCheck size={16} />
            {t.validateButton}
          </button>
          <button type="button" onClick={onRun} disabled={!canRun} title={t.runStaticTitle}>
            <Play size={16} />
            {t.runStaticButton}
          </button>
          <button type="button" onClick={onRunEigen} disabled={!canRun} title={t.runEigenTitle}>
            <Waves size={16} />
            {t.runEigenButton}
          </button>
          <button type="button" onClick={onRunResponseSpectrum} disabled={!canRun} title={t.runResponseTitle}>
            <Activity size={16} />
            {t.runResponseButton}
          </button>
          <button type="button" onClick={onRunInfluence} disabled={!canRun} title={t.runInfluenceTitle}>
            <LineChart size={16} />
            {t.runInfluenceButton}
          </button>
        </div>
        <div className="toolbar-group output-group" aria-label={t.outputGroupAriaLabel}>
          <span className="toolbar-group-label">{t.outputGroupLabel}</span>
          <button type="button" onClick={onExportResultCsv} disabled={!canExportCsv} title={t.exportCsvTitle}>
            <Download size={16} />
            {t.exportCsvButton}
          </button>
          <button type="button" onClick={onExportResultPdf} disabled={!canExportPdf} title={t.exportPdfTitle}>
            <FileText size={16} />
            {t.exportPdfButton}
          </button>
          <button type="button" onClick={onExportResultJson} disabled={!canExportResults} title={t.exportJsonTitle}>
            <Download size={16} />
            {t.exportJsonButton}
          </button>
        </div>
      </div>
    </header>
  );
}
