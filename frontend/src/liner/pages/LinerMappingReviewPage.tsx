import { ArrowLeft, CheckCircle2, Eye, List, Pencil } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ja } from "../../i18n/ja";
import type { ProjectModel, SectionKey } from "../../types";
import { Viewer3D } from "../../viewer/Viewer3D";
import type { ViewerSelection } from "../../viewer/types";
import { buildLinerViewerReviewFromDraft } from "../adapters/linerViewerAdapter";
import type { LinerDraft } from "../adapters/linerUiAdapter";
import type { LinerUiDiagnosticDisplay } from "../uiPreparation";

export type LinerMappingReviewPageProps = {
  draft: LinerDraft;
  project: ProjectModel;
  onClose: () => void;
  onBackToList: () => void;
  onBackToSetup: () => void;
  onBackToPreview: () => void;
  onConfirmProject: (project: ProjectModel) => void;
  onOpenProjectInViewer: (project: ProjectModel) => void;
};

export function LinerMappingReviewPage({
  draft,
  project,
  onClose,
  onBackToList,
  onBackToSetup,
  onBackToPreview,
  onConfirmProject,
  onOpenProjectInViewer,
}: LinerMappingReviewPageProps) {
  const review = useMemo(() => buildLinerViewerReviewFromDraft(draft, project), [draft, project]);
  const viewerProject = review.viewerProject;
  const [selection, setSelection] = useState<ViewerSelection>(null);
  const [activeLoadCase, setActiveLoadCase] = useState(() => viewerProject?.loadCases[0]?.id ?? "");
  const [selectedSection] = useState<SectionKey>("members");
  const canCommit = review.summary.validationReady && viewerProject !== null;

  useEffect(() => {
    setActiveLoadCase(viewerProject?.loadCases[0]?.id ?? "");
  }, [viewerProject]);

  return (
    <main className="liner-mapping-page" data-testid="liner-mapping-review-page">
      <header className="liner-mapping-header">
        <div>
          <h1>{ja.liner.mappingReview.title}</h1>
          <p>{ja.liner.mappingReview.lead}</p>
        </div>
        <div className="liner-mapping-header-actions">
          <button type="button" onClick={onClose} data-testid="close-liner-mapping-review">
            <ArrowLeft size={16} />
            {ja.liner.list.close}
          </button>
          <button type="button" onClick={onBackToSetup} data-testid="back-to-liner-setup">
            <Pencil size={16} />
            {ja.liner.preview.backToSetup}
          </button>
          <button type="button" onClick={onBackToPreview} data-testid="back-to-liner-preview">
            <Eye size={16} />
            {ja.liner.mappingReview.backToPreview}
          </button>
          <button type="button" onClick={onBackToList} data-testid="back-to-liner-list">
            <List size={16} />
            {ja.liner.list.backToList}
          </button>
        </div>
      </header>

      <div className="liner-mapping-layout">
        <section className="liner-mapping-viewer-panel" aria-label={ja.liner.mappingReview.viewerLabel}>
          {viewerProject ? (
            <Viewer3D
              project={viewerProject}
              result={null}
              selectedSection={selectedSection}
              selection={selection}
              activeLoadCase={activeLoadCase}
              onSelectionChange={setSelection}
              onActiveLoadCaseChange={setActiveLoadCase}
              viewPanelOpen={true}
            />
          ) : (
            <div className="liner-mapping-empty" data-testid="liner-mapping-no-viewer">
              <h2>{ja.liner.mappingReview.viewerUnavailableTitle}</h2>
              <p>{ja.liner.mappingReview.viewerUnavailableDescription}</p>
            </div>
          )}
        </section>

        <aside className="liner-mapping-side-panel" aria-label={ja.liner.mappingReview.summaryTitle}>
          <section>
            <h2>{ja.liner.mappingReview.summaryTitle}</h2>
            <dl className="liner-mapping-summary">
              <SummaryRow label={ja.liner.mappingReview.nodes} value={ja.liner.editor.count(review.summary.nodeCount)} />
              <SummaryRow label={ja.liner.mappingReview.members} value={ja.liner.editor.count(review.summary.memberCount)} />
              <SummaryRow label={ja.liner.mappingReview.supports} value={ja.liner.editor.count(review.summary.supportCount)} />
              <SummaryRow label={ja.liner.mappingReview.traceEntries} value={ja.liner.editor.count(review.summary.traceCount)} />
              <SummaryRow label={ja.liner.mappingReview.diagnostics} value={ja.liner.editor.count(review.summary.diagnosticCount)} />
              <SummaryRow
                label={ja.liner.mappingReview.validationReady}
                value={review.summary.validationReady ? ja.liner.status.ready : ja.liner.status.error}
              />
            </dl>
          </section>

          <section className="liner-mapping-actions" aria-label={ja.liner.mappingReview.actionsLabel}>
            <button
              type="button"
              disabled={!canCommit}
              onClick={() => viewerProject && onConfirmProject(viewerProject)}
              data-testid="confirm-liner-mapping"
            >
              <CheckCircle2 size={16} />
              {ja.liner.mappingReview.confirmMerge}
            </button>
            <button
              type="button"
              disabled={!canCommit}
              onClick={() => viewerProject && onOpenProjectInViewer(viewerProject)}
              data-testid="open-liner-viewer"
            >
              <Eye size={16} />
              {ja.liner.actions.openInViewer}
            </button>
            <p>{ja.liner.mappingReview.mergeNotice}</p>
          </section>

          <section className="liner-mapping-diagnostics">
            <h2>{ja.liner.diagnostics.panelTitle}</h2>
            {review.diagnostics.length === 0 ? (
              <p>{ja.liner.mappingReview.emptyDiagnostics}</p>
            ) : (
              <ul>
                {review.diagnostics.map((diagnostic, index) => (
                  <li key={`${diagnostic.code}-${index}`} className={`liner-mapping-diagnostic-${diagnostic.level}`}>
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
