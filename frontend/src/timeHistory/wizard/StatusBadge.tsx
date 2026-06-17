import { ja } from "../../i18n/ja";
import type { TimeHistoryMainStatus } from "./wizardState";

const labels = ja.timeHistoryWizard.status;

const labelMap: Record<TimeHistoryMainStatus, string> = {
  unconfigured: labels.unconfigured,
  incomplete: labels.incomplete,
  ready: labels.ready,
  running: labels.running,
  complete: labels.complete,
  error: labels.error,
};

const classMap: Record<TimeHistoryMainStatus, string> = {
  unconfigured: "time-history-status-badge unconfigured",
  incomplete: "time-history-status-badge incomplete",
  ready: "time-history-status-badge ready",
  running: "time-history-status-badge running",
  complete: "time-history-status-badge complete",
  error: "time-history-status-badge error",
};

type StatusBadgeProps = {
  status: TimeHistoryMainStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={classMap[status]}>{labelMap[status]}</span>;
}
