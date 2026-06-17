import { useMemo } from "react";
import { ja } from "../../../i18n/ja";
import { GroundMotionManagerPanel } from "../../GroundMotionManagerPanel";
import { computeGroundMotionConsistency, type WizardErrorCard } from "../wizardState";
import type { ProjectModel, TimeHistoryResult } from "../../../types";
import { toWizardError } from "../wizardState";

type SectionGroundMotionProps = {
  project: ProjectModel;
  result: TimeHistoryResult | null | undefined;
  onChange: (project: ProjectModel) => void;
  onMatchDuration: () => void;
  onShowMismatchCard: (card: WizardErrorCard) => void;
};

export function SectionGroundMotion({
  project,
  result,
  onChange,
  onMatchDuration,
  onShowMismatchCard,
}: SectionGroundMotionProps) {
  const labels = ja.timeHistoryWizard.groundMotion;
  const groundMotion = project.groundMotions?.[0];
  const settings = project.analysisSettings.timeHistory;
  const timeStep = settings?.timeStep ?? groundMotion?.timeStep ?? 0;
  const duration = settings?.duration ?? groundMotion?.duration ?? 0;
  const consistency = useMemo(
    () =>
      computeGroundMotionConsistency({
        samples: groundMotion?.samples,
        timeStep,
        duration,
      }),
    [groundMotion?.samples, timeStep, duration],
  );

  return (
    <section className="time-history-wizard-section section-ground-motion" aria-label={labels.heading}>
      <h2>{labels.heading}</h2>
      <h3>{labels.stepImportLabel}</h3>
      <p className="time-history-wizard-help">{labels.stepImportHelp}</p>
      <div className="summary-list result-toolbar">
        <button
          type="button"
          aria-label={labels.goToSectionButton}
          onClick={() => document.getElementById("time-history-ground-motion-manager")?.scrollIntoView({ behavior: "smooth" })}
        >
          {labels.importButton}
        </button>
        <button
          type="button"
          onClick={() => {
            const card = toWizardError("ground-motion-mismatch", {
              groundMotion: {
                sampleCount: consistency.sampleCount,
                timeStep: consistency.timeStep,
                motionDuration: consistency.motionDuration,
                duration: consistency.currentDuration,
              },
            });
            onShowMismatchCard(card);
          }}
          disabled={consistency.ok}
          aria-label={labels.matchDurationButton}
        >
          {labels.matchDurationButton}
        </button>
      </div>
      <h3>{labels.selectLabel}</h3>
      <p className="time-history-wizard-help">{labels.selectHelp}</p>
      <h3>{labels.unitHeading}</h3>
      <div className="summary-list">
        <span>{labels.unitGal}</span>
        <span>{labels.unitMeterPerSecondSquared}</span>
      </div>
      <p className="time-history-wizard-help">{labels.unitHelp}</p>
      <h3>{labels.cardHeading}</h3>
      <div className="time-history-ground-motion-card" id="time-history-ground-motion-manager">
        <div className="summary-list">
          <span>{labels.cardSampleCount({ n: consistency.sampleCount })}</span>
          <span>{labels.cardTimeStep({ dt: consistency.timeStep })}</span>
          <span>{labels.cardDuration({ d: consistency.motionDuration })}</span>
        </div>
        <div className="summary-list">
          <span>{labels.cardCurrentDuration({ d: consistency.currentDuration })}</span>
          <span>{labels.cardExpectedSamples({ n: consistency.expectedSamples })}</span>
        </div>
        <div className={"summary-list " + (consistency.matches ? "ok" : "ng")}>
          <span>{consistency.matches ? labels.cardMatchOk : labels.cardMatchMismatch}</span>
        </div>
        {!consistency.matches && consistency.sampleCount > 0 && consistency.timeStep > 0 && (
          <p className="time-history-wizard-help">{labels.mismatchHelp}</p>
        )}
        <p className="time-history-wizard-help">{labels.durationFormula}</p>
      </div>
      <h3>{labels.previewHeading}</h3>
      <GroundMotionManagerPanel project={project} onChange={onChange} />
      {/* Helper action: clicking the dedicated match button also notifies the
          modal-level error card so the user sees the same context anywhere in
          the wizard. */}
      <button
        type="button"
        hidden
        aria-hidden
        onClick={onMatchDuration}
      />
      {/* result retained for future per-section overrides */}
      <input type="hidden" value={result?.meta?.analysisId ?? ""} readOnly />
    </section>
  );
}
