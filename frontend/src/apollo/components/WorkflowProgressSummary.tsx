/**
 * Step 4-A workflow progress summary.
 * Text-first aggregate counts (never color-only).
 */
import type { WorkflowProgress, WorkflowStateModel } from "../workflow/types";

type Props = {
  readonly progress: WorkflowProgress;
  readonly currentRecommendedStepId: WorkflowStateModel["currentRecommendedStepId"];
};

export function WorkflowProgressSummary({ progress, currentRecommendedStepId }: Props) {
  const recommended = currentRecommendedStepId ?? "なし";
  return (
    <section className="apollo-wf-progress" data-testid="apollo-wf-progress-summary" aria-label="工程進捗サマリー">
      <ul className="apollo-wf-progress-list">
        <li>
          <span className="apollo-wf-progress-count">{progress.complete}</span>
          <span className="apollo-wf-progress-label">完了</span>
        </li>
        <li>
          <span className="apollo-wf-progress-count">{progress.actionable}</span>
          <span className="apollo-wf-progress-label">着手可能</span>
        </li>
        <li>
          <span className="apollo-wf-progress-count">{progress.ready}</span>
          <span className="apollo-wf-progress-label">実行可能</span>
        </li>
        <li>
          <span className="apollo-wf-progress-count">{progress.stale}</span>
          <span className="apollo-wf-progress-label">要再生成</span>
        </li>
        <li>
          <span className="apollo-wf-progress-count">{progress.blocked}</span>
          <span className="apollo-wf-progress-label">中断</span>
        </li>
        <li>
          <span className="apollo-wf-progress-count">{progress.error}</span>
          <span className="apollo-wf-progress-label">エラー</span>
        </li>
        <li>
          <span className="apollo-wf-progress-count">{progress.notStarted}</span>
          <span className="apollo-wf-progress-label">未着手</span>
        </li>
      </ul>
      <p className="apollo-wf-progress-recommended" data-testid="apollo-wf-progress-recommended">
        次の推奨工程: <strong>{recommended}</strong>（全 {progress.total} 工程）
      </p>
    </section>
  );
}
