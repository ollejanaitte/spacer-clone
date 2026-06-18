export function SectionIntro() {
  return (
    <section className="time-history-wizard-section">
      <h3>はじめに</h3>
      <p>
        時刻歴応答解析は、地震波を時間ごとに入力し、構造物の変位・速度・加速度・断面力がどのように変化するかを確認する解析です。
      </p>
      <ol className="time-history-flow-list">
        <li>地震波を読み込む</li>
        <li>解析条件を確認する</li>
        <li>結果を見たい節点・部材を選ぶ</li>
        <li>解析を実行する</li>
        <li>グラフと最大値を確認する</li>
        <li>アニメーションで揺れ方を確認する</li>
      </ol>
      <p className="time-history-help-text">
        左のステップを上から順番に進めると、初心者でも操作の流れを追える構成です。
      </p>
    </section>
  );
}
