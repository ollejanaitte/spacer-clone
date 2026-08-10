import { navigateTo, NEXT_BUSINESS_LIST_PATH } from "../routes";

export function LoadBusinessPage() {
  return (
    <section className="next-page" data-testid="load-business-page">
      <h1 className="next-page-title">業務データ読込</h1>
      <button
        type="button"
        className="next-link-button"
        data-testid="load-back-list"
        onClick={() => navigateTo(NEXT_BUSINESS_LIST_PATH)}
      >
        ← 業務一覧へ
      </button>
      <p className="next-hint">
        他のパソコンで作成した業務データを読み込む入口です。
      </p>
      <div className="next-empty" data-testid="load-business-placeholder">
        <p>業務データ読込の本格実装は後続の永続化Phaseで行います。</p>
        <p className="next-hint">R1-03ではUIと責任境界のみを確定。ProjectファイルImport/Exportは未実装です。</p>
      </div>
    </section>
  );
}
