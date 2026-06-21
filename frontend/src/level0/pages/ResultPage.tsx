import { L0_STRINGS } from "../data/level0Strings";

type ResultPageProps = {
  judgement: "small" | "medium" | "large";
  maxDisplacement: { nodeId: string; valueCm: number; timeSec: number };
  onRetry: () => void;
  onOther: () => void;
  onPro: () => void;
};

export function ResultPage({ judgement, maxDisplacement, onRetry, onOther, onPro }: ResultPageProps) {
  const text = L0_STRINGS.result;

  const headerText =
    judgement === "small" ? text.headerSmall :
    judgement === "medium" ? text.headerMedium :
    text.headerLarge;

  return (
    <div className="level0-result-page">
      <h1>{headerText}</h1>
      <div className="level0-result-card">
        <p className="level0-result-location">
          {maxDisplacement.nodeId} の近くが {maxDisplacement.valueCm.toFixed(1)} cm だけゆれました
        </p>
        <p className="level0-result-time">
          最大ゆれの時間: {maxDisplacement.timeSec.toFixed(2)} 秒
        </p>
      </div>
      <div className="level0-result-actions">
        <button type="button" className="level0-retry-button" onClick={onRetry}>
          {text.retry}
        </button>
        <button type="button" className="level0-other-button" onClick={onOther}>
          {text.other}
        </button>
        <button type="button" className="level0-pro-button" onClick={onPro}>
          {text.pro}
        </button>
      </div>
      <p className="level0-disclaimer">{text.disclaimer}</p>
    </div>
  );
}
