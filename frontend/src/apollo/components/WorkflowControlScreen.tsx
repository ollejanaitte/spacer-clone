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
import { AuthorizationBanner } from "./AuthorizationBanner";
import { TechnicalDetails } from "./TechnicalDetails";

export type WorkflowNavigationHandler = (target: WorkflowStateModel["steps"][number]["definition"]["navigationTarget"]) => void;

type Props = {
  readonly project: ProjectModel;
  readonly onNavigate: WorkflowNavigationHandler;
  readonly onPrimaryAction: (stepId: WorkflowStateModel["steps"][number]["workflowStepId"]) => void;
};

export function WorkflowControlScreen({ project, onNavigate, onPrimaryAction }: Props) {
  const model = useMemo(() => buildWorkflowStateModel(project), [project]);
  const auth = model.authorizationSummary;

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
