import type { TimeHistoryWizardStepId } from "./wizardState";
import { timeHistoryWizardSteps } from "./wizardState";

type TimeHistoryWizardSideNavProps = {
  activeStep: TimeHistoryWizardStepId;
  onStepChange: (step: TimeHistoryWizardStepId) => void;
};

export function TimeHistoryWizardSideNav({ activeStep, onStepChange }: TimeHistoryWizardSideNavProps) {
  return (
    <nav className="time-history-wizard-sidenav" aria-label="時刻歴応答解析ステップ">
      {timeHistoryWizardSteps.map((step, index) => (
        <button
          key={step.id}
          type="button"
          className={step.id === activeStep ? "active" : ""}
          onClick={() => onStepChange(step.id)}
        >
          <span className="step-number">{index + 1}</span>
          <span>
            <strong>{step.label}</strong>
            <small>{step.description}</small>
          </span>
        </button>
      ))}
    </nav>
  );
}
