/**
 * Step 4-A workflow step card (control plane).
 * Renders derived status, badges, blocking reason and a primary CTA.
 * Not color-only: symbol + label + text reason always present.
 */
import type { WorkflowStepState } from "../workflow/types";
import { getStatusLabel } from "../i18n";
import { WorkflowStatusBadge } from "./WorkflowStatusBadge";
import { WorkflowDiagnosticsPanel } from "./WorkflowDiagnosticsPanel";
import { TechnicalDetails } from "./TechnicalDetails";

type Props = {
  readonly step: WorkflowStepState;
  readonly onNavigate: (target: WorkflowStepState["definition"]["navigationTarget"]) => void;
  readonly onPrimaryAction: (step: WorkflowStepState) => void;
};

export function WorkflowStepCard({ step, onNavigate, onPrimaryAction }: Props) {
  const def = step.definition;
  const disabled = step.status === "BLOCKED" || step.status === "ERROR" || step.status === "OUT_OF_SCOPE";
  const hasBlocking = step.diagnostics.some((entry) => entry.blocking);
  const blocking = step.diagnostics.filter((entry) => entry.blocking);

  return (
    <article
      className={`apollo-wf-step-card${step.isRecommended ? " apollo-wf-step-card-recommended" : ""}`}
      data-testid={`apollo-wf-step-${def.workflowStepId}`}
      data-status={step.status}
      aria-label={`${def.workflowStepId}: ${def.label}`}
    >
      <div className="apollo-wf-step-card-header">
        <span className="apollo-wf-step-id" data-testid="apollo-wf-step-id">
          {def.workflowStepId}
        </span>
        <h3 className="apollo-wf-step-label">{def.label}</h3>
        <span className="apollo-wf-step-group">{def.group}</span>
      </div>
      <div className="apollo-wf-step-card-body">
        <div className="apollo-wf-step-status">
          <WorkflowStatusBadge status={step.status} isRecommended={step.isRecommended} />
          <ul className="apollo-wf-step-badges" aria-label="追加バッジ">
            {step.badges.map((badge) => (
              <li key={badge} className="apollo-wf-extra-badge">
                {getStatusLabel(badge)}
              </li>
            ))}
          </ul>
        </div>
        {step.isRecommended && step.recommendedAction ? (
          <p className="apollo-wf-recommended-action" data-testid="apollo-wf-recommended-action">
            {step.recommendedAction}
          </p>
        ) : null}
        <p className="apollo-wf-step-criterion">完了条件: {def.completionCriterion}</p>
        <WorkflowDiagnosticsPanel step={step} />
      </div>
      <div className="apollo-wf-step-card-actions">
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-wf-step-navigate"
          onClick={() => onNavigate(def.navigationTarget)}
        >
          {def.navigationTarget.label} を開く
        </button>
        <button
          type="button"
          className="apollo-button-primary"
          data-testid="apollo-wf-step-primary"
          disabled={disabled || def.primaryActionId === "none"}
          onClick={() => onPrimaryAction(step)}
        >
          {primaryActionLabel(step)}
        </button>
      </div>
      {disabled && hasBlocking ? (
        <>
          <p className="apollo-wf-step-disabled-reason" data-testid="apollo-wf-step-disabled-reason">
            {getStatusLabel("BLOCKED")}
          </p>
          <TechnicalDetails
            testId={`apollo-wf-step-${def.workflowStepId}-blocking-tech`}
            title="診断コード"
            lines={blocking.map((entry) => `diagnosticCode=${entry.code}`)}
          />
        </>
      ) : null}
    </article>
  );
}

function primaryActionLabel(step: WorkflowStepState): string {
  switch (step.definition.primaryActionId) {
    case "generate-structure":
      return step.status === "STALE" ? "再計算・再生成" : "構造生成";
    case "regenerate":
      return step.status === "STALE" ? "再計算・再生成" : "生成/再生成";
    case "run-analysis":
      return "解析実行";
    case "review-3d":
      return "3Dを確認";
    case "export":
      return "成果品出力へ";
    case "open-checklist":
      return "確認チェックリストを開く";
    case "open-step":
      return "工程を開く";
    case "none":
      return "選択不可";
  }
}
