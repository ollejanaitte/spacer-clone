import { ArrowLeft, List, Pencil } from "lucide-react";
import { useMemo } from "react";
import { ja } from "../../i18n/ja";
import { buildLinerPreviewFromDraft } from "../adapters/linerPreviewAdapter";
import type { LinerDraft } from "../adapters/linerUiAdapter";
import { LinerGridPreview } from "../components/LinerGridPreview";
import type { LinerUiDiagnosticDisplay } from "../uiPreparation";

export type LinerPreviewPageProps = {
  draft: LinerDraft;
  onClose: () => void;
  onBackToList: () => void;
  onBackToSetup: () => void;
};

export function LinerPreviewPage({ draft, onClose, onBackToList, onBackToSetup }: LinerPreviewPageProps) {
  const preview = useMemo(() => buildLinerPreviewFromDraft(draft), [draft]);
  const { viewModel } = preview;

  return (
    <main className="liner-preview-page" data-testid="liner-preview-page">
      <header className="liner-preview-header">
        <div>
          <h1>{ja.liner.preview.title}</h1>
          <p>{ja.liner.preview.lead}</p>
        </div>
        <div className="liner-preview-header-actions">
          <button type="button" onClick={onClose} data-testid="close-liner-preview">
            <ArrowLeft size={16} />
            {ja.liner.list.close}
          </button>
          <button type="button" onClick={onBackToSetup} data-testid="back-to-liner-setup">
            <Pencil size={16} />
            {ja.liner.preview.backToSetup}
          </button>
          <button type="button" onClick={onBackToList} data-testid="back-to-liner-list">
            <List size={16} />
            {ja.liner.list.backToList}
          </button>
        </div>
      </header>

      <div className="liner-preview-layout">
        <section className="liner-preview-canvas-panel" aria-label={ja.liner.preview.canvasLabel}>
          <LinerGridPreview viewModel={viewModel} />
        </section>

        <aside className="liner-preview-side-panel" aria-label={ja.liner.preview.summaryTitle}>
          <section>
            <h2>{ja.liner.preview.summaryTitle}</h2>
            <dl className="liner-preview-summary">
              <SummaryRow label={ja.liner.preview.totalLength} value={ja.liner.editor.meters(viewModel.summary.totalLength)} />
              <SummaryRow label={ja.liner.preview.axisPoints} value={ja.liner.editor.count(viewModel.summary.axisPointCount)} />
              <SummaryRow label={ja.liner.preview.gridPoints} value={ja.liner.editor.count(viewModel.summary.gridPointCount)} />
              <SummaryRow label={ja.liner.preview.gridLines} value={ja.liner.editor.count(viewModel.summary.gridLineCount)} />
              <SummaryRow label={ja.liner.preview.stations} value={ja.liner.editor.count(viewModel.summary.stationCount)} />
              <SummaryRow label={ja.liner.preview.diagnostics} value={ja.liner.editor.count(viewModel.summary.diagnosticCount)} />
            </dl>
          </section>

          <section className="liner-preview-diagnostics">
            <h2>{ja.liner.diagnostics.panelTitle}</h2>
            {viewModel.diagnostics.length === 0 ? (
              <p>{ja.liner.preview.emptyDiagnostics}</p>
            ) : (
              <ul>
                {viewModel.diagnostics.map((diagnostic, index) => (
                  <li key={`${diagnostic.code}-${index}`} className={`liner-preview-diagnostic-${diagnostic.level}`}>
                    <strong>{diagnosticSeverityLabel(diagnostic.level)}</strong>
                    <span>{diagnosticMessage(diagnostic)}</span>
                    <code>{diagnostic.code}</code>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function diagnosticSeverityLabel(level: LinerUiDiagnosticDisplay["level"]): string {
  if (level === "error") {
    return ja.liner.diagnostics.severityError;
  }
  if (level === "warning") {
    return ja.liner.diagnostics.severityWarning;
  }
  return ja.liner.diagnostics.severityInfo;
}

function diagnosticMessage(diagnostic: LinerUiDiagnosticDisplay): string {
  if (diagnostic.messageKey?.startsWith("liner.errors.")) {
    const errorKey = diagnostic.messageKey.replace("liner.errors.", "") as keyof typeof ja.liner.errors;
    return ja.liner.errors[errorKey] ?? diagnostic.code;
  }
  return diagnostic.messageKey ?? diagnostic.code;
}
