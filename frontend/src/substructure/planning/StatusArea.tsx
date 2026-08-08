// Phase C1 (M2-02) ステータスバー（選択・検証状態表示）
import { ja } from "../../i18n/ja";
import styles from "./SubstructurePlanningPage.module.css";
import type { ValidationSummary } from "./SubstructurePlanningPage";

export interface StatusAreaProps {
  primaryName: string;
  validation?: ValidationSummary;
}

export function StatusArea(props: StatusAreaProps) {
  const t = ja.substructure?.planning ?? ({} as Record<string, string>);
  const v = props.validation;
  const fatal = v?.fatalCount ?? 0;
  const warn = v?.warningCount ?? 0;

  return (
    <footer className={styles.statusBar} data-testid="status-area">
      <span>
        {t.statusSelection ?? "選択"}: {props.primaryName}
      </span>
      {fatal > 0 ? (
        <span className={`${styles.statusBadge} ${styles.badgeFatal}`} data-testid="status-fatal">
          FATAL {fatal}
        </span>
      ) : warn > 0 ? (
        <span className={`${styles.statusBadge} ${styles.badgeWarn}`} data-testid="status-warning">
          WARNING {warn}
        </span>
      ) : (
        <span className={`${styles.statusBadge} ${styles.badgeOk}`} data-testid="status-ok">
          {t.statusOk ?? "OK"}
        </span>
      )}
    </footer>
  );
}
