import locale from "../../i18n/locales/ja.json";
import type { TimeHistoryMainStatus } from "./wizardState";

type StatusBadgeProps = {
  status: TimeHistoryMainStatus;
};

const labels: Record<TimeHistoryMainStatus, string> = {
  "not-set": locale.thAnalysis.status.notSet,
  unconfigured: locale.thAnalysis.status.notSet,
  incomplete: locale.thAnalysis.status.incomplete,
  ready: locale.thAnalysis.status.ready,
  running: locale.thAnalysis.status.running,
  done: locale.thAnalysis.status.complete,
  complete: locale.thAnalysis.status.complete,
  error: locale.thAnalysis.status.error,
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`time-history-status-badge ${status}`} role="status">
      {labels[status]}
    </span>
  );
}
