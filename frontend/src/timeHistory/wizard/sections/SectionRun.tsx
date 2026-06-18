import type { ProjectModel, StructuredMessage } from "../../../types";
import type { TimeHistoryWizardStepId } from "../wizardState";
import { buildTimeHistoryChecks, formatCheckStatus } from "../wizardState";

type SectionRunProps = {
  project: ProjectModel;
  running: boolean;
  error?: StructuredMessage | null;
  onRun: () => void;
  onStepChange: (step: TimeHistoryWizardStepId) => void;
};

export function SectionRun({ project, running, error = null, onRun, onStepChange }: SectionRunProps) {
  const checks = buildTimeHistoryChecks(project);
  const blockingChecks = checks.filter((check) => check.status === "ng");
  const canRun = blockingChecks.length === 0 && !running;
  return (
    <section className="time-history-wizard-section">
      <h3>解析実行</h3>
      <p>解析実行前に、入力チェックの結果をまとめて確認します。</p>
      {blockingChecks.length > 0 ? (
        <div className="time-history-run-warning">
          <strong>未修正の入力があります。</strong>
          <p>NG項目を修正すると解析を実行できます。</p>
          <ul>
            {blockingChecks.map((check) => (
              <li key={check.id}>
                {check.label}: {formatCheckStatus(check.status)} / {check.reason}
                <button type="button" onClick={() => onStepChange(check.section)}>修正へ移動</button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="time-history-run-ready">解析可能です。この条件で時刻歴解析を実行できます。</div>
      )}
      {error && (
        <div className="time-history-error-card">
          <strong>エラーあり</strong>
          <p>{toJapaneseError(error.message)}</p>
          <details>
            <summary>内部エラー詳細</summary>
            <pre>{error.message}</pre>
          </details>
        </div>
      )}
      <button type="button" className="time-history-primary-action" disabled={!canRun} onClick={onRun}>
        {running ? "解析を実行しています。完了までしばらくお待ちください。" : "この条件で時刻歴解析を実行"}
      </button>
    </section>
  );
}

function toJapaneseError(message: string): string {
  if (message.includes("Ground motion") && message.includes("samples")) {
    return "地震波データの点数と解析時間が一致していません。読み込んだ地震波を最後まで使う場合は、解析時間を波形長に合わせてください。";
  }
  if (message.includes("timeHistory")) return "時刻歴応答解析の入力条件に不整合があります。入力チェックを確認してください。";
  return message;
}
