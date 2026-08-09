import { ja } from "../../i18n/ja";
import type { BusinessReadiness } from "../workflow/businessReadiness";
import { StatusBadge } from "./StatusBadge";
import styles from "./ReadinessPanel.module.css";

export type ReadinessPanelProps = {
  readiness: BusinessReadiness;
};

export function ReadinessPanel({ readiness }: ReadinessPanelProps) {
  const text = ja.designPlatform.readiness;
  return (
    <section className={styles.panel} data-testid="readiness-panel">
      <h3 className={styles.title}>{text.title}</h3>
      <ul className={styles.list}>
        {readiness.sections.map((entry) => (
          <li key={entry.section} className={styles.row}>
            <span className={styles.sectionName}>{text.sectionLabels[entry.section]}</span>
            <StatusBadge status={entry.status} />
          </li>
        ))}
      </ul>
    </section>
  );
}
