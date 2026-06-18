import { useEffect, useMemo, useState } from "react";
import type { ProjectModel, StructuredMessage, TimeHistoryResult } from "../../types";
import { ResultSummaryCard } from "./ResultSummaryCard";
import { StatusBadge } from "./StatusBadge";
import { SectionAnalysis } from "./sections/SectionAnalysis";
import { SectionGroundMotion } from "./sections/SectionGroundMotion";
import { SectionInputCheck } from "./sections/SectionInputCheck";
import { SectionIntro } from "./sections/SectionIntro";
import { SectionOutput } from "./sections/SectionOutput";
import { SectionResults } from "./sections/SectionResults";
import { SectionRun } from "./sections/SectionRun";
import { TimeHistoryWizardSideNav } from "./TimeHistoryWizardSideNav";
import {
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
  const [activeStep, setActiveStep] = useState<TimeHistoryWizardStepId>("intro");
  const status = selectTimeHistoryMainStatus(project, result, { running, hasResult: Boolean(result), error });
  const stepIndex = useMemo(() => timeHistoryWizardSteps.findIndex((step) => step.id === activeStep), [activeStep]);
  const currentStep = timeHistoryWizardSteps[stepIndex] ?? timeHistoryWizardSteps[0];

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
          <div>
            <span className="time-history-wizard-eyebrow">初心者向けガイド画面</span>
            <h2 id="time-history-wizard-title">時刻歴応答解析を開く</h2>
            <p>上から順番に進めるだけで、地震波の読み込み、入力チェック、解析実行、結果確認までできます。</p>
          </div>
          <div className="time-history-wizard-header-actions">
            <StatusBadge status={status} />
            <button type="button" onClick={() => setActiveStep("check")}>入力チェックへ</button>
            <button type="button" onClick={() => setActiveStep("run")}>解析実行へ</button>
            <button type="button" onClick={onClose}>閉じる</button>
          </div>
        </header>
        <div className="time-history-wizard-body">
          <TimeHistoryWizardSideNav activeStep={activeStep} onStepChange={setActiveStep} />
          <main className="time-history-wizard-main">
            <div className="time-history-wizard-current-step">
              <span>ステップ {stepIndex + 1} / {timeHistoryWizardSteps.length}</span>
              <strong>{currentStep.label}</strong>
              <small>{currentStep.description}</small>
            </div>
            <div className="time-history-step-guidance">
              <strong>このページでやること</strong>
              <span>{currentStep.description}。迷った場合は、画面下の「次へ」で進めてください。</span>
            </div>
            {activeStep === "intro" && <SectionIntro />}
            {activeStep === "check" && <SectionInputCheck project={project} onStepChange={setActiveStep} />}
            {activeStep === "groundMotion" && <SectionGroundMotion project={project} onProjectChange={onProjectChange} />}
            {activeStep === "analysis" && (
              <SectionAnalysis project={project} running={running} onRun={onRun} onProjectChange={onProjectChange} />
            )}
            {activeStep === "output" && <SectionOutput project={project} />}
            {activeStep === "run" && (
              <SectionRun project={project} running={running} error={error} onRun={onRun} onStepChange={setActiveStep} />
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
          <button type="button" onClick={goPrevious} disabled={stepIndex <= 0}>戻る</button>
          <span className="time-history-footer-hint">{currentStep.label}: {currentStep.description}</span>
          <button type="button" onClick={goNext} disabled={stepIndex >= timeHistoryWizardSteps.length - 1}>次へ</button>
          <button type="button" className="time-history-primary-action" onClick={onRun} disabled={running || !onRun}>
            {running ? "解析中" : "この条件で時刻歴解析を実行"}
          </button>
        </footer>
      </section>
    </div>
  );
}
