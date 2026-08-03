/**
 * Step 4-A workflow control screen (control plane).
 * Shows WF-01..WF-15 with derived status, reason, next CTA.
 * Existing panels remain work surfaces; this screen only navigates to them.
 */
import { useMemo } from "react";
import type { ProjectModel } from "../../types";
import { buildWorkflowStateModel } from "../workflow/index";
import type { WorkflowStateModel } from "../workflow/types";
import { WorkflowProgressSummary } from "./WorkflowProgressSummary";
import { WorkflowStepCard } from "./WorkflowStepCard";

export type WorkflowNavigationHandler = (target: WorkflowStateModel["steps"][number]["definition"]["navigationTarget"]) => void;

type Props = {
  readonly project: ProjectModel;
  readonly onNavigate: WorkflowNavigationHandler;
  readonly onPrimaryAction: (stepId: WorkflowStateModel["steps"][number]["workflowStepId"]) => void;
};

export function WorkflowControlScreen({ project, onNavigate, onPrimaryAction }: Props) {
  const model = useMemo(() => buildWorkflowStateModel(project), [project]);

  return (
    <section className="apollo-wf-screen" data-testid="apollo-workflow-control-screen" aria-label="設計ワークフロー制御">
      <header className="apollo-wf-header">
        <h2>設計ワークフロー制御（Step 4-A）</h2>
        <p>
          状態は現在の入力データと成果物の整合（revision/checksum）から自動判定されます。工程は対応パネルへ案内する
          control plane であり、入力画面そのものは既存パネルです。
        </p>
      </header>
      <WorkflowProgressSummary progress={model.progress} currentRecommendedStepId={model.currentRecommendedStepId} />
      <p className="apollo-wf-authorization" data-testid="apollo-wf-authorization-summary">
        数値設計認可: {model.authorizationSummary.numericDesignAuthorization} / 正式リリース準備:
        {model.authorizationSummary.formalReleaseReadiness} / 設計・建設用途:
        {model.authorizationSummary.designOrConstructionUse}
      </p>
      <div className="apollo-wf-step-list" data-testid="apollo-wf-step-list" aria-label="工程一覧">
        {model.steps.map((step) => (
          <WorkflowStepCard
            key={step.workflowStepId}
            step={step}
            onNavigate={onNavigate}
            onPrimaryAction={(entry) => onPrimaryAction(entry.workflowStepId)}
          />
        ))}
      </div>
    </section>
  );
}
