import { useState } from "react";
import { ja } from "../../../i18n/ja";
import { TimeHistorySettingsPanel } from "../../TimeHistorySettingsPanel";
import type { ProjectModel } from "../../../types";

type SectionAnalysisProps = {
  project: ProjectModel;
  running?: boolean;
  onChange: (project: ProjectModel) => void;
  onRun?: () => void;
};

export function SectionAnalysis({ project, running, onChange, onRun }: SectionAnalysisProps) {
  const labels = ja.timeHistoryWizard.analysis;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const settings = project.analysisSettings.timeHistory;
  const dt = settings?.timeStep ?? 0;
  const duration = settings?.duration ?? 0;
  const damping = settings?.damping?.beta ?? 0;
  const beta = settings?.beta ?? 0.25;
  const gamma = settings?.gamma ?? 0.5;

  return (
    <section className="time-history-wizard-section section-analysis" aria-label={labels.heading}>
      <h2>{labels.heading}</h2>
      <p className="time-history-wizard-help">{labels.help}</p>
      <div className="summary-list">
        <span title={labels.tooltipDt}>{ja.timeHistory.fields.timeStep}: {dt.toFixed(4)}</span>
        <span title={labels.tooltipDt}>{ja.timeHistory.fields.duration}: {duration.toFixed(2)}</span>
        <span title={labels.tooltipDamping}>{ja.timeHistory.fields.rayleighBeta}: {damping.toFixed(4)}</span>
      </div>
      <button
        type="button"
        aria-expanded={detailsOpen}
        onClick={() => setDetailsOpen((current) => !current)}
      >
        {labels.detailsToggle}
      </button>
      {detailsOpen && (
        <div className="time-history-wizard-details">
          <p title={labels.tooltipNewmark}>{ja.timeHistory.fields.newmarkBeta}: {beta.toFixed(2)}</p>
          <p title={labels.tooltipNewmark}>{ja.timeHistory.fields.newmarkGamma}: {gamma.toFixed(2)}</p>
          <p title={labels.tooltipRayleigh}>{ja.timeHistory.fields.rayleighAlpha}: {(settings?.damping?.alpha ?? 0).toFixed(4)}</p>
        </div>
      )}
      <TimeHistorySettingsPanel
        project={project}
        running={running}
        onRun={onRun}
        onChange={onChange}
      />
    </section>
  );
}
