import { Activity, Download, FileText, FolderOpen, LineChart, Map, MapPinned, Play, RotateCcw, Save, ShieldCheck, Waves } from "lucide-react";
import { ja } from "../i18n/ja";
import { Trash2 } from "lucide-react";

type ToolbarProps = {
  projectName: string;
  appVersion: string;
  dirty: boolean;
  validationStatus: string;
  analysisStatus: string;
  canRun: boolean;
  canSave?: boolean;
  nativeFileDialogs?: boolean;
  canExportResults: boolean;
  canExportCsv: boolean;
  canExportPdf: boolean;
  onBackToTop: () => void;
  onNew: () => void;
  onResetModel: () => void;
  onOpen: (file: File) => void;
  onOpenClick?: () => void;
  onSave: () => void;
  onValidate: () => void;
  onRun: () => void;
  onRunEigen: () => void;
  onRunInfluence: () => void;
  onRunMovingLoad: () => void;
  onRunResponseSpectrum: () => void;
  onOpenTimeHistoryWizard?: () => void;
  onExportResultJson: () => void;
  onExportResultCsv: () => void;
  onExportResultPdf: () => void;
  onExportLinerPlanDxf?: () => void;
  onExportLinerProfileDxf?: () => void;
  onExportLinerFrameStl?: () => void;
  onOpenBridgeWizard: () => void;
  onOpenModelComparison?: () => void;
  onOpenLinerList?: () => void;
  onOpenApolloPhase1?: () => void;
  apolloPhase1EntryTitle?: string;
  onOpenSiteContext?: () => void;
};

const t = ja.toolbar;

export function Toolbar({
  projectName,
  appVersion,
  dirty,
  validationStatus,
  analysisStatus,
  canRun,
  canSave = true,
  nativeFileDialogs = false,
  canExportResults,
  canExportCsv,
  canExportPdf,
  onBackToTop,
  onNew,
  onResetModel,
  onOpen,
  onOpenClick,
  onSave,
  onValidate,
  onRun,
  onRunEigen,
  onRunInfluence,
  onRunMovingLoad,
  onRunResponseSpectrum,
  onOpenTimeHistoryWizard,
  onExportResultJson,
  onExportResultCsv,
  onExportResultPdf,
  onExportLinerPlanDxf,
  onExportLinerProfileDxf,
  onExportLinerFrameStl,
  onOpenBridgeWizard,
  onOpenModelComparison = () => undefined,
  onOpenLinerList,
  onOpenApolloPhase1,
  apolloPhase1EntryTitle,
  onOpenSiteContext,
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
          <button type="button" onClick={onBackToTop} title={t.backToTopTitle} data-testid="back-to-top">
            {t.backToTopButton}
          </button>
          <button type="button" onClick={onNew} title={t.newTitle}>
            <RotateCcw size={16} />
            {t.newButton}
          </button>
          <button type="button" onClick={onResetModel} title={t.resetTitle} data-testid="reset-model">
            <Trash2 size={16} />
            {t.resetButton}
          </button>
          {nativeFileDialogs ? (
            <button
              type="button"
              onClick={onOpenClick}
              title={t.openNativeTitle}
              data-testid="open-project-native"
            >
              <FolderOpen size={16} />
              {t.openButton}
            </button>
          ) : (
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
          )}
          <button
            type="button"
            onClick={onOpenBridgeWizard}
            title={t.bridgeWizardTitle}
            data-testid="open-bridge-wizard"
          >
            <LineChart size={16} />
            {t.bridgeWizardButton}
          </button>
          {onOpenLinerList && (
            <button
              type="button"
              onClick={onOpenLinerList}
              title={ja.liner.toolbar.openTitle}
              data-testid="open-liner-list"
            >
              <Map size={16} />
              {ja.liner.toolbar.openButton}
            </button>
          )}
          {onOpenSiteContext && (
            <button
              type="button"
              onClick={onOpenSiteContext}
              title={ja.workflow.toolbar.openSiteContextTitle}
              data-testid="open-site-context"
            >
              <MapPinned size={16} />
              {ja.workflow.toolbar.openSiteContext}
            </button>
          )}
          {(onOpenApolloPhase1 || apolloPhase1EntryTitle) && (
            <button
              type="button"
              onClick={onOpenApolloPhase1}
              disabled={!onOpenApolloPhase1}
              title={apolloPhase1EntryTitle ?? "Apollo Phase 1-NN shell"}
              aria-disabled={onOpenApolloPhase1 ? "false" : "true"}
              data-testid="open-apollo-phase1"
            >
              Apollo
            </button>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            title={canSave ? t.saveTitle : t.saveBlockedTitle}
          >
            <Save size={16} />
            {t.saveButton}
          </button>
          {onOpenTimeHistoryWizard && (
            <button
              type="button"
              onClick={onOpenTimeHistoryWizard}
              title={t.timeHistoryButtonTitle}
              data-testid="open-time-history-wizard"
            >
              <Activity size={16} />
              {t.timeHistoryButton}
            </button>
          )}
          <button type="button" data-testid="open-model-comparison" onClick={onOpenModelComparison}>
            {t.modelComparisonButton}
          </button>
        </div>
        <div className="toolbar-group">
          <button
            type="button"
            onClick={onValidate}
            disabled={!canSave}
            title={canSave ? t.validateTitle : t.validateBlockedTitle}
          >
            <ShieldCheck size={16} />
            {t.validateButton}
          </button>
          <button
            type="button"
            onClick={onRun}
            disabled={!canRun}
            title={canRun ? t.runStaticTitle : t.runBlockedTitle}
          >
            <Play size={16} />
            {t.runStaticButton}
          </button>
          <button
            type="button"
            onClick={onRunEigen}
            disabled={!canRun}
            title={canRun ? t.runEigenTitle : t.runBlockedTitle}
          >
            <Waves size={16} />
            {t.runEigenButton}
          </button>
          <button
            type="button"
            onClick={onRunResponseSpectrum}
            disabled={!canRun}
            title={canRun ? t.runResponseTitle : t.runBlockedTitle}
          >
            <Activity size={16} />
            {t.runResponseButton}
          </button>
          <button
            type="button"
            onClick={onRunInfluence}
            disabled={!canRun}
            title={canRun ? t.runInfluenceTitle : t.runBlockedTitle}
          >
            <LineChart size={16} />
            {t.runInfluenceButton}
          </button>
          <button
            type="button"
            onClick={onRunMovingLoad}
            disabled={!canRun}
            title={canRun ? t.movingLoadTitle : t.runBlockedTitle}
          >
            <LineChart size={16} />
            {t.movingLoadButton}
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
          {onExportLinerPlanDxf && (
            <button type="button" onClick={onExportLinerPlanDxf} title="LINER plan DXF" data-testid="export-liner-plan-dxf">
              <Download size={16} />
              Plan DXF
            </button>
          )}
          {onExportLinerProfileDxf && (
            <button
              type="button"
              onClick={onExportLinerProfileDxf}
              title="LINER profile DXF"
              data-testid="export-liner-profile-dxf"
            >
              <Download size={16} />
              Profile DXF
            </button>
          )}
          {onExportLinerFrameStl && (
            <button type="button" onClick={onExportLinerFrameStl} title="LINER frame STL" data-testid="export-liner-frame-stl">
              <Download size={16} />
              Frame STL
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
