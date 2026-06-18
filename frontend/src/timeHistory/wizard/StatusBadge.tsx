import type { TimeHistoryMainStatus } from "./wizardState";

type StatusBadgeProps = {
  status: TimeHistoryMainStatus;
};

const labels: Record<TimeHistoryMainStatus, string> = {
  "not-set": "未設定",
  incomplete: "入力不足",
  ready: "解析可能",
  running: "解析中",
  done: "解析済み",
  error: "エラーあり",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const className = "time-history-status-badge " + status;
  return <span className={className}>{labels[status]}</span>;
}
