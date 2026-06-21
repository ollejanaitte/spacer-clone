import styles from "./ParameterPanel.module.css";

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
      <h2 className={styles.title}>条件を変えて試す</h2>
      <p className={styles.description}>
        スライダーを動かして、橋の条件を少し変えてみましょう。
      </p>

      <div className={styles.parameters}>
        <div className={styles.parameter}>
          <label className={styles.label}>
            橋長: <span className={styles.value}>{parameters.bridgeLength} m</span>
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
            橋脚高さ: <span className={styles.value}>{parameters.pierHeight} m</span>
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
            橋脚本数: <span className={styles.value}>{parameters.pierCount} 本</span>
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
            荷重倍率: <span className={styles.value}>{parameters.loadMultiplier.toFixed(1)} 倍</span>
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
            <span>0.5 倍</span>
            <span>2.0 倍</span>
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.resetButton} onClick={onReset}>
          初期値に戻す
        </button>
        <button type="button" className={styles.calculateButton} onClick={onCalculate}>
          結果を計算
        </button>
      </div>
    </div>
  );
}
