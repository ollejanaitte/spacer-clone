import type { Level0Parameters } from "./ParameterPanel";
import { ja } from "../../i18n/ja";
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
      <h3 className={styles.title}>{ja.level0.currentConditionsHeading}</h3>
      <div className={styles.conditions}>
        <div className={styles.condition}>
          <span className={styles.label}>{ja.level0.bridgeLengthShort}</span>
          <span className={styles.value}>{ja.level0.bridgeLengthUnitMeters(parameters.bridgeLength)}</span>
        </div>
        <div className={styles.condition}>
          <span className={styles.label}>{ja.level0.pierHeightShort}</span>
          <span className={styles.value}>{ja.level0.bridgeLengthUnitMeters(parameters.pierHeight)}</span>
        </div>
        <div className={styles.condition}>
          <span className={styles.label}>{ja.level0.pierCountShort}</span>
          <span className={styles.value}>{ja.level0.pierCountValue(parameters.pierCount)}</span>
        </div>
        <div className={styles.condition}>
          <span className={styles.label}>{ja.level0.loadMultiplierShort}</span>
          <span className={styles.value}>{ja.level0.loadMultiplierValue(parameters.loadMultiplier.toFixed(1))}</span>
        </div>
      </div>
      {hasUnreflectedParams && (
        <p className={styles.note}>
          {ja.level0.unreflectedNote}
        </p>
      )}
    </div>
  );
}
