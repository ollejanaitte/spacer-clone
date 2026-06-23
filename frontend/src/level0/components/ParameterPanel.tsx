import styles from "./ParameterPanel.module.css";
import { ja } from "../../i18n/ja";

export type Level0Parameters = {
  bridgeLength: number;
  pierHeight: number;
  pierCount: number;
  loadMultiplier: number;
};

type ParameterPanelProps = {
  parameters: Level0Parameters;
  onChange: (params: Level0Parameters) => void;
  onReset: () => void;
  onCalculate: () => void;
};

const DEFAULT_PARAMETERS: Level0Parameters = {
  bridgeLength: 50,
  pierHeight: 10,
  pierCount: 2,
  loadMultiplier: 1.0,
};

export function getDefaultParameters(): Level0Parameters {
  return { ...DEFAULT_PARAMETERS };
}

export function ParameterPanel({
  parameters,
  onChange,
  onReset,
  onCalculate,
}: ParameterPanelProps) {
  const handleChange = (key: keyof Level0Parameters, value: number) => {
    onChange({ ...parameters, [key]: value });
  };

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>{ja.level0.parameterPanelHeading}</h2>
      <p className={styles.description}>
        {ja.level0.parameterPanelLead}
      </p>

      <div className={styles.parameters}>
        <div className={styles.parameter}>
          <label className={styles.label}>
            {ja.level0.bridgeLengthShort} <span className={styles.value}>{ja.level0.bridgeLengthUnitMeters(parameters.bridgeLength)}</span>
          </label>
          <input
            type="range"
            min={20}
            max={100}
            step={5}
            value={parameters.bridgeLength}
            onChange={(e) => handleChange("bridgeLength", Number(e.target.value))}
            className={styles.slider}
          />
          <div className={styles.rangeLabels}>
            <span>20 m</span>
            <span>100 m</span>
          </div>
        </div>

        <div className={styles.parameter}>
          <label className={styles.label}>
            {ja.level0.pierHeightShort} <span className={styles.value}>{ja.level0.bridgeLengthUnitMeters(parameters.pierHeight)}</span>
          </label>
          <input
            type="range"
            min={5}
            max={30}
            step={1}
            value={parameters.pierHeight}
            onChange={(e) => handleChange("pierHeight", Number(e.target.value))}
            className={styles.slider}
          />
          <div className={styles.rangeLabels}>
            <span>5 m</span>
            <span>30 m</span>
          </div>
        </div>

        <div className={styles.parameter}>
          <label className={styles.label}>
            {ja.level0.pierCountShort} <span className={styles.value}>{ja.level0.pierCountValue(parameters.pierCount)}</span>
          </label>
          <div className={styles.stepper}>
            {[1, 2, 3, 4].map((count) => (
              <button
                key={count}
                type="button"
                className={`${styles.stepperButton} ${
                  parameters.pierCount === count ? styles.active : ""
                }`}
                onClick={() => handleChange("pierCount", count)}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.parameter}>
          <label className={styles.label}>
            {ja.level0.loadMultiplierShort} <span className={styles.value}>{ja.level0.loadMultiplierValue(parameters.loadMultiplier.toFixed(1))}</span>
          </label>
          <input
            type="range"
            min={0.5}
            max={2.0}
            step={0.1}
            value={parameters.loadMultiplier}
            onChange={(e) => handleChange("loadMultiplier", Number(e.target.value))}
            className={styles.slider}
          />
          <div className={styles.rangeLabels}>
            <span>{ja.level0.multiplierSmall}</span>
            <span>{ja.level0.multiplierLarge}</span>
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.resetButton} onClick={onReset}>
          {ja.level0.resetToDefaults}
        </button>
        <button type="button" className={styles.calculateButton} onClick={onCalculate}>
          {ja.level0.calculateResult}
        </button>
      </div>
    </div>
  );
}
