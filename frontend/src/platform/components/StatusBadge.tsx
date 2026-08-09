import { ja } from "../../i18n/ja";
import { isAuthoritative, type ValueStatus } from "../workflow/businessReadiness";
import styles from "./StatusBadge.module.css";

export type StatusBadgeProps = {
  status: ValueStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const label = ja.designPlatform.readiness.statusLabels[status];
  const cls = isAuthoritative(status) ? styles.authoritative : styles.pending;
  return (
    <span className={`${styles.badge} ${cls}`} role="status" data-testid={`status-${status}`}>
      {label}
    </span>
  );
}
