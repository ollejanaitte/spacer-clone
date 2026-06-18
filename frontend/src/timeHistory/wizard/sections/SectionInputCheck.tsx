import type { ProjectModel } from "../../../types";
import type { TimeHistoryWizardStepId } from "../wizardState";
import { buildTimeHistoryChecks, formatCheckStatus } from "../wizardState";

type SectionInputCheckProps = {
  project: ProjectModel;
  onStepChange: (step: TimeHistoryWizardStepId) => void;
};

export function SectionInputCheck({ project, onStepChange }: SectionInputCheckProps) {
  const checks = buildTimeHistoryChecks(project);
  return (
    <section className="time-history-wizard-section">
      <h3>入力チェック</h3>
      <p>解析前に必要な入力が揃っているかを確認します。</p>
      <div className="time-history-check-list">
        {checks.map((check) => (
          <article key={check.id} className={`time-history-check-card ${check.status}`}>
            <div>
              <strong>{check.label}</strong>
              <span>{formatCheckStatus(check.status)}</span>
            </div>
            <p>{check.reason}</p>
            <small>{check.action}</small>
            <button type="button" onClick={() => onStepChange(check.section)}>
              該当セクションへ移動
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
