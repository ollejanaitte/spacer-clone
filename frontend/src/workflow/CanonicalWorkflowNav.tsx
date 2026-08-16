import { useCallback } from "react";
import { ja } from "../i18n/ja";
import {
  CANONICAL_WORKFLOW_TOTAL_STEPS,
  canonicalWorkflowSteps,
  isWorkflowStepEntryEnabled,
  resolveWorkflowNavigation,
  workflowProgress,
  type CanonicalWorkflowStep,
  type CanonicalWorkflowStepId,
} from "./canonicalWorkflow";
import styles from "./CanonicalWorkflowNav.module.css";

export interface CanonicalWorkflowNavProps {
  readonly currentStepId: CanonicalWorkflowStepId;
  readonly onNavigateStep: (step: CanonicalWorkflowStep) => void;
}

export function CanonicalWorkflowNav({ currentStepId, onNavigateStep }: CanonicalWorkflowNavProps) {
  const steps = canonicalWorkflowSteps();
  const navigation = resolveWorkflowNavigation(currentStepId);
  const text = ja.workflow;

  const goPrev = useCallback(() => {
    if (navigation.prev === null) return;
    const step = steps.find((entry) => entry.id === navigation.prev);
    if (step && isWorkflowStepEntryEnabled(step)) {
      onNavigateStep(step);
    }
  }, [navigation.prev, steps, onNavigateStep]);

  const goNext = useCallback(() => {
    if (navigation.next === null) return;
    const step = steps.find((entry) => entry.id === navigation.next);
    if (step && isWorkflowStepEntryEnabled(step)) {
      onNavigateStep(step);
    }
  }, [navigation.next, steps, onNavigateStep]);

  return (
    <nav className={styles.nav} aria-label={text.nav.currentStep} data-testid="canonical-workflow-nav">
      <div className={styles.header}>
        <span className={styles.currentLabel}>{text.nav.currentStep}</span>
        <span className={styles.currentValue}>{text.stepLabels[currentStepId]}</span>
        <span className={styles.progress}>
          {text.nav.progress
            .replace("{current}", String(workflowProgress(currentStepId)))
            .replace("{total}", String(CANONICAL_WORKFLOW_TOTAL_STEPS))}
        </span>
      </div>
      <ol className={styles.stepList}>
        {steps.map((step) => {
          const enabled = isWorkflowStepEntryEnabled(step);
          const isCurrent = step.id === currentStepId;
          const isPrev = navigation.prev === step.id;
          const isNext = navigation.next === step.id;
          const statusKey = step.connectionStatus;
          return (
            <li key={step.id}>
              <button
                type="button"
                className={`${styles.step} ${isCurrent ? styles.stepCurrent : ""} ${
                  isPrev ? styles.stepPrev : ""
                } ${isNext ? styles.stepNext : ""}`}
                disabled={!enabled}
                onClick={() => onNavigateStep(step)}
                data-testid={`workflow-step-${step.id}`}
                data-status={statusKey}
                aria-current={isCurrent ? "step" : undefined}
              >
                <span className={styles.stepOrder}>{step.order}</span>
                <span className={styles.stepBody}>
                  <span className={styles.stepName}>{text.stepLabels[step.id]}</span>
                  <span className={styles.stepDescription}>{text.stepDescriptions[step.id]}</span>
                </span>
                <span className={`${styles.statusBadge} ${styles[`status-${statusKey}`]}`}>
                  {text.connectionStatus[statusKey]}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className={styles.footer}>
        <button
          type="button"
          className={styles.guideButton}
          onClick={goPrev}
          disabled={!navigation.hasPrev}
          data-testid="workflow-prev"
        >
          {text.nav.prev}
        </button>
        <button
          type="button"
          className={styles.guideButton}
          onClick={goNext}
          disabled={!navigation.hasNext}
          data-testid="workflow-next"
        >
          {text.nav.next}
        </button>
      </div>
    </nav>
  );
}