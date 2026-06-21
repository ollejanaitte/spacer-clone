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
  const headerText = judgement === "small" ? text.headerSmall : judgement === "medium" ? text.headerMedium : text.headerLarge;
  return (
    <div className="level0-result-page">
      <h1>{headerText}</h1>
      <div className="level0-result-card">
        <p>{maxDisplacement.nodeId} の近くが {maxDisplacement.valueCm.toFixed(1)} cm だけゆれました</p>
      </div>
      <div className="level0-result-actions">
        <button type="button" onClick={onRetry}>{text.retry}</button>
        <button type="button" onClick={onOther}>{text.other}</button>
        <button type="button" onClick={onPro}>{text.pro}</button>
      </div>
      <p>{text.disclaimer}</p>
    </div>
  );
}
