import locale from "../../../i18n/locales/ja.json";
import type { ProjectModel } from "../../../types";
import { TimeHistorySettingsPanel } from "../../TimeHistorySettingsPanel";

type SectionAnalysisProps = {
  project: ProjectModel;
  running: boolean;
  onRun?: () => void;
  onProjectChange: (project: ProjectModel) => void;
  onContinue?: () => void;
};

export function SectionAnalysis({
  project,
  running,
  onRun,
  onProjectChange,
  onContinue,
}: SectionAnalysisProps) {
  const text = locale.thAnalysis.analysisConfig;
  return (
    <section className="time-history-wizard-section">
      <div className="time-history-section-heading">
        <div>
          <h3>{text.heading}</h3>
          <p>{text.description}</p>
        </div>
        <span className="time-history-info-tip" title={text.description}>i</span>
      </div>
      <TimeHistorySettingsPanel
        project={project}
        running={running}
        onRun={onRun}
        onChange={onProjectChange}
        onContinue={onContinue}
      />
    </section>
  );
}
