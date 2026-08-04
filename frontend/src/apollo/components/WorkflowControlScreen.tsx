import { useMemo, useState } from "react";
import type { ProjectModel } from "../../types";
import { buildWorkflowStateModel } from "../workflow/index";
import type { WorkflowStateModel, WorkflowStepId } from "../workflow/types";
import { WorkflowProgressSummary } from "./WorkflowProgressSummary";
import { WorkflowStepCard } from "./WorkflowStepCard";
import { WorkflowStatusBadge } from "./WorkflowStatusBadge";
import { AuthorizationBanner } from "./AuthorizationBanner";
import { TechnicalDetails } from "./TechnicalDetails";

export type WorkflowNavigationHandler = (target: WorkflowStateModel["steps"][number]["definition"]["navigationTarget"]) => void;

type Props = {
  readonly project: ProjectModel;
  readonly onNavigate: WorkflowNavigationHandler;
  readonly onPrimaryAction: (stepId: WorkflowStateModel["steps"][number]["workflowStepId"]) => void;
};

const STEP_IDS: readonly WorkflowStepId[] = [
  "WF-01","WF-02","WF-03","WF-04","WF-05",
  "WF-06","WF-07","WF-08","WF-09","WF-10",
  "WF-11","WF-12","WF-13","WF-14","WF-15",
];

export function WorkflowControlScreen({ project, onNavigate, onPrimaryAction }: Props) {
  const model = useMemo(() => buildWorkflowStateModel(project), [project]);
  const auth = model.authorizationSummary;

  const [selectedStepId, setSelectedStepId] = useState<WorkflowStepId>(
    () => (model.currentRecommendedStepId ?? "WF-01"),
  );

  const selectedStep = model.steps.find((s) => s.workflowStepId === selectedStepId) ?? model.steps[0];

  const goBack = () => {
    const idx = STEP_IDS.indexOf(selectedStepId);
    if (idx > 0) setSelectedStepId(STEP_IDS[idx - 1]);
  };

  const goNext = () => {
    const idx = STEP_IDS.indexOf(selectedStepId);
    if (idx < STEP_IDS.length - 1) setSelectedStepId(STEP_IDS[idx + 1]);
  };

  return (
    <section className="apollo-wf-screen" data-testid="apollo-workflow-control-screen" aria-label="設計ワークフロー制御">
      <header className="apollo-wf-header">
        <h2>設計ワークフロー制御</h2>
        <p>
          状態は現在の入力データと成果物の整合から自動判定されます。工程は対応パネルへ案内する制御画面であり、入力画面そのものは既存パネルです。
        </p>
      </header>
      <AuthorizationBanner
        testId="apollo-wf-authorization-summary"
        keys={["UNVERIFIED_DEVELOPMENT_ONLY", "NOT_GRANTED", "PROHIBITED"]}
      />
      <TechnicalDetails
        testId="apollo-wf-authorization-tech"
        title="認可トークン"
        lines={[
          `numericDesignAuthorization=${auth.numericDesignAuthorization}`,
          `formalReleaseReadiness=${auth.formalReleaseReadiness}`,
          `designOrConstructionUse=${auth.designOrConstructionUse}`,
        ]}
      />
      <WorkflowProgressSummary progress={model.progress} currentRecommendedStepId={model.currentRecommendedStepId} />

      <div className="apollo-wf-master-detail" data-testid="apollo-wf-master-detail">
        <nav className="apollo-wf-navigator" data-testid="apollo-wf-navigator" aria-label="工程ナビゲーター">
          <ol className="apollo-wf-navigator-list">
            {model.steps.map((step) => {
              const isSelected = step.workflowStepId === selectedStepId;
              return (
                <li key={step.workflowStepId}>
                  <button
                    type="button"
                    className={`apollo-wf-navigator-item${isSelected ? " selected" : ""}${step.isRecommended ? " recommended" : ""}`}
                    data-testid={`apollo-wf-nav-${step.workflowStepId}`}
                    aria-current={isSelected ? "true" : undefined}
                    onClick={() => setSelectedStepId(step.workflowStepId)}
                  >
                    <span className="apollo-wf-navigator-id">{step.workflowStepId}</span>
                    <span className="apollo-wf-navigator-label">{step.definition.label}</span>
                    <WorkflowStatusBadge status={step.status} isRecommended={step.isRecommended} />
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="apollo-wf-detail-panel" data-testid="apollo-wf-detail-panel">
          <div className="apollo-wf-detail-nav">
            <button
              type="button"
              className="apollo-wf-detail-nav-btn"
              data-testid="apollo-wf-detail-prev"
              disabled={STEP_IDS.indexOf(selectedStepId) <= 0}
              onClick={goBack}
            >
              ◀ 前へ
            </button>
            <span className="apollo-wf-detail-nav-position" data-testid="apollo-wf-detail-position">
              {STEP_IDS.indexOf(selectedStepId) + 1} / {STEP_IDS.length}
            </span>
            <button
              type="button"
              className="apollo-wf-detail-nav-btn"
              data-testid="apollo-wf-detail-next"
              disabled={STEP_IDS.indexOf(selectedStepId) >= STEP_IDS.length - 1}
              onClick={goNext}
            >
              次へ ▶
            </button>
          </div>
          <WorkflowStepCard
            step={selectedStep}
            onNavigate={onNavigate}
            onPrimaryAction={(entry) => onPrimaryAction(entry.workflowStepId)}
          />
        </div>
      </div>
    </section>
  );
}