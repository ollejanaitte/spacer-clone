import { navigateTo, NEXT_HOME_PATH } from "../routes";

export function QuickAnalysisPage() {
  return (
    <section className="next-page" data-testid="quick-analysis-page">
      <h1 className="next-page-title">クイック解析</h1>
      <button
        type="button"
        className="next-link-button"
        data-testid="quick-back-home"
        onClick={() => navigateTo(NEXT_HOME_PATH)}
      >
        ← ホームへ
      </button>
      <p className="next-hint">
        クイック解析はProjectから独立した単体解析の入口です。
      </p>
      <div className="next-empty" data-testid="quick-analysis-placeholder">
        <p>解析機能本体は後続Phaseで実装します。</p>
        <p className="next-hint">R1-03ではクイック解析の入口と責務境界のみを確定。</p>
      </div>
    </section>
  );
}
