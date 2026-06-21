import { useState, useCallback, useMemo } from "react";
import { L0_STRINGS } from "../data/lobbyStrings";
import { ModeCard } from "../components/ModeCard";
import { ParameterPanel, getDefaultParameters, type Level0Parameters } from "../../level0/components/ParameterPanel";
import { CurrentConditions } from "../../level0/components/CurrentConditions";
import {
  getDefaultParametersForSample,
  hasUnreflectedParameters,
  getParameterDescription,
} from "../../level0/services/level0Parameters";
import styles from "./LobbyHome.module.css";
import parameterStyles from "./Level0TopParameters.module.css";

type Level0TopProps = {
  onNavigate: (path: string) => void;
};

export function Level0Top({ onNavigate }: Level0TopProps) {
  const text = L0_STRINGS.level0;
  const [selectedSample, setSelectedSample] = useState<string | null>(null);
  const [parameters, setParameters] = useState<Level0Parameters>(getDefaultParameters());
  const [calculationResult, setCalculationResult] = useState<string | null>(null);

  const handleSampleSelect = useCallback((sampleId: string) => {
    setSelectedSample(sampleId);
    setParameters(getDefaultParametersForSample(sampleId));
    setCalculationResult(null);
  }, []);

  const handleReset = useCallback(() => {
    if (selectedSample) {
      setParameters(getDefaultParametersForSample(selectedSample));
    } else {
      setParameters(getDefaultParameters());
    }
    setCalculationResult(null);
  }, [selectedSample]);

  const handleCalculate = useCallback(() => {
    const description = getParameterDescription(parameters);
    setCalculationResult(description);
  }, [parameters]);

  const handleCardClick = useCallback(
    (sampleId: string, target: string) => {
      handleSampleSelect(sampleId);
      // Don't navigate, just select the sample
    },
    [handleSampleSelect]
  );

  const hasUnreflected = useMemo(
    () => hasUnreflectedParameters(parameters),
    [parameters]
  );

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{text.title}</h1>
      <p className={styles.subtitle}>{text.subtitle}</p>

      <div className={styles.cards}>
        {text.samples.map((sample) => (
          <ModeCard
            key={sample.id}
            icon={sample.icon}
            name={sample.name}
            catchPhrase={sample.catch}
            description={sample.description}
            audience={sample.audience}
            button={sample.button}
            onClick={() => handleCardClick(sample.id, sample.target)}
          />
        ))}
        <ModeCard
          icon={text.lesson.icon}
          name={text.lesson.name}
          catchPhrase={text.lesson.catch}
          description={text.lesson.description}
          audience={text.lesson.audience}
          button={text.lesson.button}
          onClick={() => onNavigate("/level0/lesson")}
        />
      </div>

      {selectedSample && (
        <div className={parameterStyles.parameterSection}>
          <ParameterPanel
            parameters={parameters}
            onChange={setParameters}
            onReset={handleReset}
            onCalculate={handleCalculate}
          />

          <CurrentConditions
            parameters={parameters}
            hasUnreflectedParams={hasUnreflected}
          />

          {calculationResult && (
            <div className={parameterStyles.resultCard}>
              <h3 className={parameterStyles.resultTitle}>計算結果</h3>
              <p className={parameterStyles.resultText}>{calculationResult}</p>
            </div>
          )}
        </div>
      )}

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.proLink}
          onClick={() => onNavigate("/pro")}
        >
          {text.proLink}
        </button>
      </div>
    </div>
  );
}
