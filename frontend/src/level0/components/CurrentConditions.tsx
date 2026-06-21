import type { Level0Parameters } from "./ParameterPanel";
import styles from "./CurrentConditions.module.css";

type CurrentConditionsProps = {
  parameters: Level0Parameters;
  hasUnreflectedParams?: boolean;
};

export function CurrentConditions({
  parameters,
  hasUnreflectedParams = false,
}: CurrentConditionsProps) {
  return (
    <div className={styles.container}>
      <h3 className={styles.title}>現在の条件</h3>
      <div className={styles.conditions}>
        <div className={styles.condition}>
          <span className={styles.label}>橋長:</span>
          <span className={styles.value}>{parameters.bridgeLength} m</span>
        </div>
        <div className={styles.condition}>
          <span className={styles.label}>橋脚高さ:</span>
          <span className={styles.value}>{parameters.pierHeight} m</span>
        </div>
        <div className={styles.condition}>
          <span className={styles.label}>橋脚本数:</span>
          <span className={styles.value}>{parameters.pierCount} 本</span>
        </div>
        <div className={styles.condition}>
          <span className={styles.label}>荷重倍率:</span>
          <span className={styles.value}>{parameters.loadMultiplier.toFixed(1)} 倍</span>
        </div>
      </div>
      {hasUnreflectedParams && (
        <p className={styles.note}>
          一部の条件は表示説明にのみ反映されます。
        </p>
      )}
    </div>
  );
}
