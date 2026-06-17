import { ja } from "../../../i18n/ja";
import type { TimeHistoryCheckItem } from "../wizardState";

type SectionRunProps = {
  items: TimeHistoryCheckItem[];
  running: boolean;
  canRun: boolean;
  onRun: () => void;
};

export function SectionRun({ items, running, canRun, onRun }: SectionRunProps) {
  const labels = ja.timeHistoryWizard.run;
  const okItems = items.filter((item) => item.state === "ok");
  const warningItems = items.filter((item) => item.state === "warning");
  const ngItems = items.filter((item) => item.state === "ng");
  return (
    <section className="time-history-wizard-section section-run" aria-label={labels.heading}>
      <h2>{labels.heading}</h2>
      <h3>{labels.summaryHeading}</h3>
      <div className="summary-list">
        <span>{labels.okGroup}: {okItems.length}</span>
        <span>{labels.warningGroup}: {warningItems.length}</span>
        <span>{labels.ngGroup}: {ngItems.length}</span>
      </div>
      {ngItems.length > 0 && (
        <ul className="time-history-wizard-ng-list">
          {ngItems.map((item) => (
            <li key={item.id}>{item.reason}</li>
          ))}
        </ul>
      )}
      {running ? (
        <p className="time-history-wizard-help">{labels.runningMessage}</p>
      ) : (
        <button
          type="button"
          disabled={!canRun || running}
          aria-label={labels.runButton}
          onClick={onRun}
        >
          {labels.runButton}
        </button>
      )}
      {!canRun && !running && <p className="time-history-wizard-help">{labels.disabledMessage}</p>}
    </section>
  );
}
