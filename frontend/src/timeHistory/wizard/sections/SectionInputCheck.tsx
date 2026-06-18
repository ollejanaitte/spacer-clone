import locale from "../../../i18n/locales/ja.json";
import type { ProjectModel } from "../../../types";
import type { TimeHistoryWizardStepId } from "../wizardState";
import { buildTimeHistoryChecks, formatCheckStatus } from "../wizardState";

type SectionInputCheckProps = {
  project: ProjectModel;
  onStepChange: (step: TimeHistoryWizardStepId) => void;
};

export function SectionInputCheck({ project, onStepChange }: SectionInputCheckProps) {
  const text = locale.thAnalysis;
  const checks = buildTimeHistoryChecks(project);
  return (
    <section className="time-history-wizard-section">
      <div className="time-history-section-heading">
        <div>
          <h3>{text.inputCheck.heading}</h3>
          <p>{text.inputCheck.description}</p>
        </div>
        <span className="time-history-info-tip" title={text.inputCheck.description}>
          i
        </span>
      </div>
      <div className="time-history-check-list">
        {checks.map((check) => (
          <article key={check.id} className={`time-history-check-card ${check.status}`}>
            <div className="time-history-check-card-heading">
              <strong>{check.label}</strong>
              <span className={`time-history-check-badge ${check.status}`}>
                {formatCheckStatus(check.status)}
              </span>
            </div>
            <p>{check.reason}</p>
            <small>{check.action}</small>
            <footer>
              <span className="time-history-check-scope">
                {check.readOnly ? text.inputCheck.readOnly : text.inputCheck.editable}
              </span>
              {!check.readOnly && check.status !== "ok" && (
                <button
                  type="button"
                  aria-label={`${text.actions.fix}: ${check.label}`}
                  onClick={() => onStepChange(check.section)}
                >
                  {text.actions.fix}
                </button>
              )}
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}
