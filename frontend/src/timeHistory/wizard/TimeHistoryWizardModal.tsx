import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Play, X } from "lucide-react";
import locale from "../../i18n/locales/ja.json";
import type { ProjectModel, StructuredMessage, TimeHistoryResult } from "../../types";
import { ResultSummaryCard } from "./ResultSummaryCard";
import { StatusBadge } from "./StatusBadge";
import { SectionAnalysis } from "./sections/SectionAnalysis";
import { SectionGroundMotion } from "./sections/SectionGroundMotion";
import { SectionInputCheck } from "./sections/SectionInputCheck";
import { SectionIntro } from "./sections/SectionIntro";
import { SectionResults } from "./sections/SectionResults";
import { SectionRun } from "./sections/SectionRun";
import { TimeHistoryWizardSideNav } from "./TimeHistoryWizardSideNav";
import {
  buildStepStates,
  selectTimeHistoryMainStatus,
  timeHistoryWizardSteps,
  type TimeHistoryWizardStepId,
} from "./wizardState";

type TimeHistoryWizardModalProps = {
  open: boolean;
  project: ProjectModel;
  result?: TimeHistoryResult | null;
  error?: StructuredMessage | null;
  running?: boolean;
  onClose: () => void;
  onRun?: () => void;
  onProjectChange: (project: ProjectModel) => void;
  onAnimationOverrideChange?: (override: Map<string, { x: number; y: number; z: number }> | null) => void;
};

export function TimeHistoryWizardModal({
  open,
  project,
  result = null,
  error = null,
  running = false,
  onClose,
  onRun,
  onProjectChange,
  onAnimationOverrideChange,
}: TimeHistoryWizardModalProps) {
  const text = locale.thAnalysis;
  const [activeStep, setActiveStep] = useState<TimeHistoryWizardStepId>("intro");
  const status = selectTimeHistoryMainStatus(project, result, { running, hasResult: Boolean(result), error });
  const stepIndex = useMemo(
    () => timeHistoryWizardSteps.findIndex((step) => step.id === activeStep),
    [activeStep],
  );
  const currentStep = timeHistoryWizardSteps[stepIndex] ?? timeHistoryWizardSteps[0];
  const stepStates = useMemo(
    () => buildStepStates(project, result, activeStep),
    [activeStep, project, result],
  );

  useEffect(() => {
    if (open && result) setActiveStep("results");
  }, [open, result]);

  if (!open) return null;

  const goPrevious = () => {
    const previous = timeHistoryWizardSteps[Math.max(stepIndex - 1, 0)];
    if (previous) setActiveStep(previous.id);
  };
  const goNext = () => {
    const next = timeHistoryWizardSteps[Math.min(stepIndex + 1, timeHistoryWizardSteps.length - 1)];
    if (next) setActiveStep(next.id);
  };

  return (
    <div className="time-history-wizard-backdrop" role="presentation">
      <section
        className="time-history-wizard-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="time-history-wizard-title"
      >
        <header className="time-history-wizard-header">
          <div className="time-history-title-block">
            <span className="time-history-breadcrumb">{text.breadcrumb}</span>
            <span className="time-history-wizard-eyebrow">{text.guideLabel}</span>
            <h2 id="time-history-wizard-title">{text.title}</h2>
            <p>{text.description}</p>
          </div>
          <div className="time-history-wizard-header-status">
            <StatusBadge status={status} />
          </div>
          <div className="time-history-wizard-header-actions">
            <button type="button" onClick={() => setActiveStep("check")} aria-label={text.actions.inputCheck}>
              <ClipboardCheck aria-hidden="true" size={16} />
              {text.actions.inputCheck}
            </button>
            <button type="button" onClick={() => setActiveStep("run")} aria-label={text.actions.run}>
              <Play aria-hidden="true" size={16} />
              {text.actions.run}
            </button>
            <button type="button" onClick={onClose} aria-label={text.actions.close}>
              <X aria-hidden="true" size={16} />
              {text.actions.close}
            </button>
          </div>
        </header>
        <div className="time-history-wizard-body">
          <TimeHistoryWizardSideNav
            activeStep={activeStep}
            stepStates={stepStates}
            onStepChange={setActiveStep}
          />
          <main className="time-history-wizard-main">
            <div className="time-history-wizard-current-step">
              <span>{text.currentStep} {stepIndex + 1} / {timeHistoryWizardSteps.length}</span>
              <strong>{currentStep.label}</strong>
              <small>{currentStep.description}</small>
            </div>
            <div className="time-history-step-guidance">
              <strong>{text.pageGuidance}</strong>
              <span>{currentStep.description}</span>
            </div>
            {activeStep === "intro" && <SectionIntro />}
            {activeStep === "check" && <SectionInputCheck project={project} onStepChange={setActiveStep} />}
            {activeStep === "groundMotion" && (
              <SectionGroundMotion project={project} onProjectChange={onProjectChange} />
            )}
            {activeStep === "analysis" && (
              <SectionAnalysis
                project={project}
                running={running}
                onRun={onRun}
                onProjectChange={onProjectChange}
              />
            )}
            {activeStep === "run" && (
              <SectionRun
                project={project}
                running={running}
                error={error}
                onRun={onRun}
                onStepChange={setActiveStep}
              />
            )}
            {activeStep === "results" && (
              <SectionResults
                project={project}
                result={result}
                error={error}
                onAnimationOverrideChange={onAnimationOverrideChange}
              />
            )}
          </main>
          <aside className="time-history-wizard-summary">
            <ResultSummaryCard result={result} />
          </aside>
        </div>
        <footer className="time-history-wizard-footer">
          <button type="button" onClick={goPrevious} disabled={stepIndex <= 0}>
            {text.actions.back}
          </button>
          <span className="time-history-footer-hint">{currentStep.label}: {currentStep.description}</span>
          <button type="button" onClick={goNext} disabled={stepIndex >= timeHistoryWizardSteps.length - 1}>
            {text.actions.next}
          </button>
          <button
            type="button"
            className="time-history-primary-action"
            onClick={onRun}
            disabled={running || !onRun}
          >
            {running ? text.actions.running : text.actions.runAnalysis}
          </button>
        </footer>
      </section>
    </div>
  );
}
