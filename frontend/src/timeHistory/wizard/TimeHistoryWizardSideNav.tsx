import locale from "../../i18n/locales/ja.json";
import {
  timeHistoryWizardSteps,
  type TimeHistoryStepState,
  type TimeHistoryWizardStepId,
} from "./wizardState";

type TimeHistoryWizardSideNavProps = {
  activeStep: TimeHistoryWizardStepId;
  stepStates: Record<TimeHistoryWizardStepId, TimeHistoryStepState>;
  onStepChange: (step: TimeHistoryWizardStepId) => void;
};

const stateIcon: Record<TimeHistoryStepState, string> = {
  "not-started": "●",
  "in-progress": "◐",
  complete: "✓",
  invalid: "⚠",
};

const stateLabel: Record<TimeHistoryStepState, string> = {
  "not-started": locale.thAnalysis.stepState.notStarted,
  "in-progress": locale.thAnalysis.stepState.inProgress,
  complete: locale.thAnalysis.stepState.complete,
  invalid: locale.thAnalysis.stepState.invalid,
};

export function TimeHistoryWizardSideNav({
  activeStep,
  stepStates,
  onStepChange,
}: TimeHistoryWizardSideNavProps) {
  return (
    <nav className="time-history-wizard-sidenav" aria-label={locale.thAnalysis.title}>
      {timeHistoryWizardSteps.map((step, index) => {
        const state = stepStates[step.id];
        return (
          <button
            key={step.id}
            type="button"
            className={`${step.id === activeStep ? "active" : ""} state-${state}`}
            aria-current={step.id === activeStep ? "step" : undefined}
            onClick={() => onStepChange(step.id)}
          >
            <span className="step-number">{index + 1}</span>
            <span className="step-copy">
              <strong>{step.label}</strong>
              <small>{step.description}</small>
            </span>
            <span className="step-state" aria-label={stateLabel[state]} title={stateLabel[state]}>
              {stateIcon[state]}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
