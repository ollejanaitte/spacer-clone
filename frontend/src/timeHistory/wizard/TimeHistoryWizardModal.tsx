import { useCallback, useEffect, useMemo, useState } from "react";
import { ja } from "../../i18n/ja";
import type { ProjectModel, StructuredMessage, TimeHistoryResult } from "../../types";
import { useTimeHistoryAnalysis } from "../useTimeHistoryAnalysis";
import {
  buildTimeHistoryCheckItems,
  computeMatchDuration,
  isXyzAnimationAvailable,
  toWizardError,
  TIME_HISTORY_SECTION_IDS,
  type TimeHistorySectionId,
  type WizardErrorCard,
} from "./wizardState";
import { TimeHistoryWizardSideNav } from "./TimeHistoryWizardSideNav";
import { SectionIntro } from "./sections/SectionIntro";
import { SectionInputCheck } from "./sections/SectionInputCheck";
import { SectionGroundMotion } from "./sections/SectionGroundMotion";
import { SectionAnalysis } from "./sections/SectionAnalysis";
import { SectionOutput } from "./sections/SectionOutput";
import { SectionRun } from "./sections/SectionRun";
import { SectionResults } from "./sections/SectionResults";

type TimeHistoryWizardModalProps = {
  open: boolean;
  project: ProjectModel;
  result: TimeHistoryResult | null | undefined;
  selectedNodeId?: string | null;
  selectedMemberId?: string | null;
  onSelectNode?: (id: string) => void;
  onSelectMember?: (id: string) => void;
  onProjectChange: (project: ProjectModel) => void;
  onAnimationOverrideChange?: (override: Map<string, { x: number; y: number; z: number }> | null) => void;
  onClose: () => void;
};

export function TimeHistoryWizardModal({
  open,
  project,
  result,
  selectedNodeId = null,
  selectedMemberId = null,
  onSelectNode,
  onSelectMember,
  onProjectChange,
  onAnimationOverrideChange,
  onClose,
}: TimeHistoryWizardModalProps) {
  const labels = ja.timeHistoryWizard;
  const [active, setActive] = useState<TimeHistorySectionId>("intro");
  const [errorCard, setErrorCard] = useState<WizardErrorCard | null>(null);

  // Local volatile input state. The wizard never mutates the project
  // payload directly: the user actions flow through onProjectChange so
  // the existing persistence / save flow keeps working.
  const [wizardNodeId, setWizardNodeId] = useState<string | null>(selectedNodeId);
  const [wizardMemberId, setWizardMemberId] = useState<string | null>(selectedMemberId);
  useEffect(() => {
    setWizardNodeId(selectedNodeId);
    setWizardMemberId(selectedMemberId);
  }, [selectedNodeId, selectedMemberId]);

  const persistResult = useCallback(
    (envelope: { timeHistoryResult: TimeHistoryResult | null }) => {
      if (!envelope.timeHistoryResult) return;
      const nextAnalysisResults = {
        ...(project.analysisResults ?? {}),
        timeHistory: envelope.timeHistoryResult,
      };
      onProjectChange({ ...project, analysisResults: nextAnalysisResults });
    },
    [project, onProjectChange],
  );

  const analysis = useTimeHistoryAnalysis({ onSuccess: persistResult });
  const latestResult: TimeHistoryResult | null = (() => {
    if (analysis.result?.timeHistoryResult) return analysis.result.timeHistoryResult;
    if (result) return result;
    if (project.analysisResults?.timeHistory) return project.analysisResults.timeHistory;
    return null;
  })();
  const status: string | undefined = analysis.loading
    ? "running"
    : analysis.error
      ? "failed"
      : latestResult
        ? latestResult.meta.status
        : undefined;
  const latestError: StructuredMessage | null = analysis.error
    ? analysis.error
    : (analysis.result?.errors?.[0] ?? null);

  const inputs = useMemo(
    () => ({
      loading: analysis.loading,
      hasError: Boolean(analysis.error),
      hasResult: Boolean(latestResult),
      selectedNodeId: wizardNodeId,
      selectedMemberId: wizardMemberId,
    }),
    [analysis.loading, analysis.error, latestResult, wizardNodeId, wizardMemberId],
  );

  const checkItems = useMemo(
    () => buildTimeHistoryCheckItems({ project, result: latestResult, inputs }),
    [project, latestResult, inputs],
  );

  // Auto-jump to the result section on success / failure.
  useEffect(() => {
    if (status === "failed" || latestError) {
      setActive("results");
    } else if (latestResult && analysis.result) {
      setActive("results");
    }
  }, [status, latestError, latestResult, analysis.result]);

  // Esc closes the modal when it is open. We keep the existing
  // UI convention: no confirmation, because the wizard does not own
  // any persistent state besides what it forwards to onProjectChange.
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const currentIndex = TIME_HISTORY_SECTION_IDS.indexOf(active);
  const goPrev = () => {
    const prev = TIME_HISTORY_SECTION_IDS[Math.max(0, currentIndex - 1)];
    setActive(prev);
  };
  const goNext = () => {
    const next = TIME_HISTORY_SECTION_IDS[Math.min(TIME_HISTORY_SECTION_IDS.length - 1, currentIndex + 1)];
    setActive(next);
  };

  const handleRun = () => {
    if (analysis.loading) return;
    void analysis.run(project).catch(() => undefined);
  };

  const handleMatchDuration = () => {
    const motion = project.groundMotions?.[0];
    if (!motion) return;
    const samples = motion.samples ?? [];
    const timeStep = project.analysisSettings.timeHistory?.timeStep ?? motion.timeStep;
    const nextDuration = computeMatchDuration(timeStep, samples.length);
    if (nextDuration <= 0) return;
    onProjectChange({
      ...project,
      analysisSettings: {
        ...project.analysisSettings,
        timeHistory: {
          enabled: true,
          method: "newmark-beta",
          timeStep,
          duration: nextDuration,
          beta: project.analysisSettings.timeHistory?.beta ?? 0.25,
          gamma: project.analysisSettings.timeHistory?.gamma ?? 0.5,
          massCaseId: project.analysisSettings.timeHistory?.massCaseId ?? project.massCases?.[0]?.id ?? "",
          groundMotionId: project.analysisSettings.timeHistory?.groundMotionId ?? motion.id,
          direction: project.analysisSettings.timeHistory?.direction ?? motion.direction,
          damping: project.analysisSettings.timeHistory?.damping ?? { type: "rayleigh", alpha: 0, beta: 0 },
        },
      },
    });
  };

  const onErrorCardAction = (card: WizardErrorCard, buttonId: string) => {
    if (buttonId === "match-duration") {
      handleMatchDuration();
      setErrorCard(null);
      return;
    }
    if (buttonId === "go-to-section" && card.targetSection) {
      setActive(card.targetSection);
      setErrorCard(null);
      return;
    }
    setErrorCard(null);
  };

  const handleShowMismatchCard = (card: WizardErrorCard) => {
    setErrorCard(card);
  };

  const ngCount = checkItems.filter((item) => item.state === "ng").length;
  const canRun = ngCount === 0 && !analysis.loading;

  return (
    <div className="time-history-wizard-modal" role="dialog" aria-label={labels.modalAriaLabel} aria-modal="true">
      <header className="time-history-wizard-header">
        <h2>{labels.modalHeading}</h2>
        <button type="button" onClick={onClose} aria-label={labels.closeButton}>
          {labels.closeButton}
        </button>
      </header>
      <div className="time-history-wizard-body">
        <TimeHistoryWizardSideNav active={active} onSelect={setActive} />
        <main className="time-history-wizard-main">
          {active === "intro" && <SectionIntro />}
          {active === "inputCheck" && (
            <SectionInputCheck items={checkItems} onNavigate={setActive} />
          )}
          {active === "groundMotion" && (
            <SectionGroundMotion
              project={project}
              result={latestResult}
              onChange={onProjectChange}
              onMatchDuration={handleMatchDuration}
              onShowMismatchCard={handleShowMismatchCard}
            />
          )}
          {active === "analysis" && (
            <SectionAnalysis
              project={project}
              running={analysis.loading}
              onChange={onProjectChange}
              onRun={handleRun}
            />
          )}
          {active === "output" && (
            <SectionOutput
              project={project}
              selectedNodeId={wizardNodeId}
              selectedMemberId={wizardMemberId}
              onSelectNode={(id) => {
                setWizardNodeId(id || null);
                onSelectNode?.(id);
              }}
              onSelectMember={(id) => {
                setWizardMemberId(id || null);
                onSelectMember?.(id);
              }}
              onClear={() => {
                setWizardNodeId(null);
                setWizardMemberId(null);
                onSelectNode?.("");
                onSelectMember?.("");
              }}
            />
          )}
          {active === "run" && (
            <SectionRun
              items={checkItems}
              running={analysis.loading}
              canRun={canRun}
              onRun={handleRun}
            />
          )}
          {active === "results" && (
            <SectionResults
              project={project}
              result={latestResult}
              status={status}
              error={latestError}
              onOverrideChange={onAnimationOverrideChange}
            />
          )}
        </main>
      </div>
      {errorCard && (
        <div className="time-history-wizard-error-card">
          <h3>{errorCard.title}</h3>
          <p>{errorCard.body}</p>
          <p>{"理由: " + errorCard.reason}</p>
          <p>{"対応: " + errorCard.remedy}</p>
          <details>
            <summary>{ja.timeHistoryWizard.errors.detailLabel}</summary>
            <code>{errorCard.detail}</code>
          </details>
          <div className="summary-list result-toolbar">
            {errorCard.buttons.map((button) => (
              <button
                key={button.id}
                type="button"
                className={button.variant === "primary" ? "primary" : "secondary"}
                onClick={() => onErrorCardAction(errorCard, button.id)}
              >
                {button.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <footer className="time-history-wizard-footer">
        <button type="button" onClick={goPrev} disabled={currentIndex <= 0} aria-label={ja.common.back}>
          {ja.common.back}
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={currentIndex >= TIME_HISTORY_SECTION_IDS.length - 1}
          aria-label={ja.common.next}
        >
          {ja.common.next}
        </button>
      </footer>
    </div>
  );
}

// Re-export the XYZ animation availability helper for downstream
// panels that want to surface the same hint without depending on the
// modal. The hook is intentionally a thin wrapper so the existing
// ResultViewer tests keep working.
export { isXyzAnimationAvailable };
export { toWizardError };
