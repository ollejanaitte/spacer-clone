import { ArrowLeft, Eye, FilePlus2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ja } from "../../i18n/ja";
import { ContinuityDiagnosticsPanel } from "../components/ContinuityDiagnosticsPanel";
import { CrossSectionPreview } from "../components/CrossSectionPreview";
import { CrossSectionTemplateEditor } from "../components/CrossSectionTemplateEditor";
import { CurveSamplingControl } from "../components/CurveSamplingControl";
import { HorizontalElementEditor } from "../components/HorizontalElementEditor";
import { LinerStationProfilePanel } from "../components/LinerStationProfilePanel";
import { SetupTabPlaceholder } from "../components/SetupTabPlaceholder";
import { SuperelevationEditor } from "../components/SuperelevationEditor";
import { VerticalElementEditor } from "../components/VerticalElementEditor";
import { VerticalProfileChart } from "../components/VerticalProfileChart";
import {
  createDefaultCrossSectionTemplate,
  createDefaultLinerDraft,
  createDefaultVerticalAlignment,
  summarizeLinerDraft,
  updateLinerAlignmentMetadata,
  updateLinerCrossSectionTemplate,
  updateLinerCrossSlope,
  updateLinerVerticalAlignment,
  type LinerDraft,
  type LinerDraftUpdate,
} from "../adapters/linerUiAdapter";
import type { LinerSetupTabId } from "../uiPreparation";
import { LinerSetupTabs } from "./LinerSetupTabs";

export type LinerEditPageProps = {
  draft?: LinerDraft;
  initialDraft?: LinerDraft;
  onDraftChange?: (update: LinerDraftUpdate) => void;
  onOpenPreview?: () => void;
  onOpenMappingReview?: () => void;
  onClose: () => void;
  onBackToList: () => void;
};

function LinerSetupTabStub({
  label,
  tabId,
  variant,
}: {
  label: string;
  tabId: LinerSetupTabId;
  variant: "height" | "review";
}) {
  return <SetupTabPlaceholder tabId={tabId} variant={variant} />;
}

export function LinerEditPage({
  draft: controlledDraft,
  initialDraft,
  onDraftChange,
  onOpenPreview,
  onOpenMappingReview,
  onClose,
  onBackToList,
}: LinerEditPageProps) {
  const [localDraft, setLocalDraft] = useState<LinerDraft>(() => initialDraft ?? createDefaultLinerDraft());
  const [activeTab, setActiveTab] = useState<LinerSetupTabId>("line");
  const [commitError, setCommitError] = useState<string | null>(null);
  const draft = localDraft;
  useEffect(() => {
    if (controlledDraft) {
      setLocalDraft(controlledDraft);
      setCommitError(null);
    }
  }, [controlledDraft]);
  const changeDraft = (update: LinerDraftUpdate) => {
    setCommitError(null);
    setLocalDraft((current) => (typeof update === "function" ? update(current) : update));
  };
  const commitDraft = (): boolean => {
    if (!onDraftChange) {
      return true;
    }
    try {
      onDraftChange(draft);
      setCommitError(null);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setCommitError(message);
      return false;
    }
  };
  const commitAndRun = (action: () => void) => {
    if (commitDraft()) {
      action();
    }
  };
  const summary = useMemo(() => summarizeLinerDraft(draft), [draft]);
  const verticalAlignment =
    draft.verticalAlignment ?? createDefaultVerticalAlignment(summary.totalDeclaredLength, draft.z ?? 0);
  const crossSectionTemplate =
    draft.crossSections?.[0] ?? createDefaultCrossSectionTemplate(draft.offsets ?? [0]);

  return (
    <main className="liner-edit-page" data-testid="liner-edit-page">
      <header className="liner-edit-header">
        <div>
          <h1>{ja.liner.editor.title}</h1>
          <p>{ja.liner.editor.lead}</p>
        </div>
        <div className="liner-edit-header-actions">
          <button type="button" onClick={() => commitAndRun(onClose)} data-testid="close-liner-edit">
            <ArrowLeft size={16} />
            {ja.liner.list.close}
          </button>
          <button type="button" onClick={() => commitAndRun(onBackToList)} data-testid="back-to-liner-list">
            {ja.liner.list.backToList}
          </button>
          {onOpenPreview && (
            <button type="button" onClick={() => commitAndRun(onOpenPreview)} data-testid="open-liner-preview">
              <Eye size={16} />
              {ja.liner.preview.openPreview}
            </button>
          )}
          {onOpenMappingReview && (
            <button type="button" onClick={() => commitAndRun(onOpenMappingReview)} data-testid="open-liner-mapping-review">
              <FilePlus2 size={16} />
              {ja.liner.mappingReview.openReview}
            </button>
          )}
        </div>
      </header>
      {commitError && (
        <p className="liner-edit-help" role="alert" data-testid="liner-draft-commit-error">
          {commitError}
        </p>
      )}

      <div className="liner-edit-layout">
        <LinerSetupTabs activeTab={activeTab} onTabChange={setActiveTab}>
          {activeTab === "line" && (
            <>
              <section className="liner-edit-panel" aria-labelledby="liner-edit-metadata-title">
                <h2 id="liner-edit-metadata-title">{ja.liner.editor.metadataSection}</h2>
                <div className="liner-edit-form-grid">
                  <label>
                    <span>{ja.liner.fields.alignmentId}</span>
                    <input
                      value={draft.alignment.id}
                      data-testid="liner-alignment-id"
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        changeDraft((current) => updateLinerAlignmentMetadata(current, { id: value }));
                      }}
                    />
                  </label>
                  <label>
                    <span>{ja.liner.fields.linerModelId}</span>
                    <input
                      value={draft.alignment.linerModelId}
                      data-testid="liner-model-id"
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        changeDraft((current) =>
                          updateLinerAlignmentMetadata(current, { linerModelId: value }),
                        );
                      }}
                    />
                  </label>
                  <label>
                    <span>{ja.liner.fields.coordinatePolicyId}</span>
                    <input
                      value={draft.alignment.coordinatePolicyId}
                      data-testid="liner-coordinate-policy-id"
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        changeDraft((current) =>
                          updateLinerAlignmentMetadata(current, { coordinatePolicyId: value }),
                        );
                      }}
                    />
                  </label>
                </div>
              </section>

              <HorizontalElementEditor draft={draft} onDraftChange={changeDraft} />
            </>
          )}

          {activeTab === "station" && (
            <>
              <LinerStationProfilePanel draft={draft} onDraftChange={changeDraft} />
              <ContinuityDiagnosticsPanel draft={draft} />
              <CurveSamplingControl draft={draft} onDraftChange={changeDraft} />
            </>
          )}

          {activeTab === "height" && (
            <LinerSetupTabStub
              label={ja.liner.setupTabs.height}
              tabId="height"
              variant="height"
            />
          )}

          {activeTab === "vertical" && (
            <div className="liner-tab-vertical">
              <VerticalElementEditor
                verticalAlignment={verticalAlignment}
                onVerticalAlignmentChange={(nextVerticalAlignment) =>
                  changeDraft((current) => updateLinerVerticalAlignment(current, nextVerticalAlignment))
                }
              />
              <VerticalProfileChart verticalAlignment={verticalAlignment} />
            </div>
          )}

          {activeTab === "crossSection" && (
            <div className="liner-tab-cross-section">
              <CrossSectionTemplateEditor
                template={crossSectionTemplate}
                onTemplateChange={(nextTemplate) =>
                  changeDraft((current) => updateLinerCrossSectionTemplate(current, nextTemplate))
                }
              />
              <SuperelevationEditor
                crossSlope={crossSectionTemplate.crossSlope}
                onCrossSlopeChange={(nextCrossSlope) =>
                  changeDraft((current) => updateLinerCrossSlope(current, nextCrossSlope))
                }
              />
              <CrossSectionPreview template={crossSectionTemplate} />
            </div>
          )}

          {activeTab === "review" && (
            <LinerSetupTabStub
              label={ja.liner.setupTabs.review}
              tabId="review"
              variant="review"
            />
          )}
        </LinerSetupTabs>

        <aside className="liner-edit-summary" aria-label={ja.liner.editor.summarySection}>
          <h2>{ja.liner.editor.summarySection}</h2>
          <dl>
            <div>
              <dt>{ja.liner.editor.summaryElements}</dt>
              <dd>{ja.liner.editor.count(summary.elementCount)}</dd>
            </div>
            <div>
              <dt>{ja.liner.editor.summaryOffsets}</dt>
              <dd>{ja.liner.editor.count(summary.offsetCount)}</dd>
            </div>
            <div>
              <dt>{ja.liner.editor.summaryLength}</dt>
              <dd data-testid="liner-summary-length">{ja.liner.editor.meters(summary.totalDeclaredLength)}</dd>
            </div>
          </dl>
          <p>{ja.liner.editor.localDraftNotice}</p>
        </aside>
      </div>
    </main>
  );
}
