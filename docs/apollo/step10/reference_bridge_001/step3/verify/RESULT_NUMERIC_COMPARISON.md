# FINAL VERIFICATION — Analysis / Design Result Numeric Comparison

> 現在の数値認証状態: `NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED`（Phase A gate / OWN-026）。
> ソフトは解析・設計の framework を実装済みだが、照査式・係数・荷重組合せの数値は NOT_AUTHORIZED のまま。
> よって反力・断面力・照査比等の数値照合は「同一前提で比較可能」なものがない → 判定方針を明示。

| # | 項目 | 原本値 | ソフト結果 | 判定 | 根拠 |
|---|------|--------|-----------|------|------|
| R-01 | 反力（支点反力） | 原本に算出あり（支承設計等で使用） | ソフトは `/api/design/analyze` 実行可だが結果は authorization=NOT_GRANTED のみ、数値出力なし | NOT_AUTHORIZED | 数値認証ゲート（Phase A） |
| R-02 | 曲げモーメント / せん断力 | 原本に算出あり | 同上（memberEndForces は backend で算出されるが framework としてはゲート） | NOT_AUTHORIZED | 同上 |
| R-03 | 応力度 / 照査比 | 原本に算出あり | ソフトは照査 framework（NOT_AUTHORIZED）のみ | NOT_AUTHORIZED | 同上 |
| R-04 | 断面決定（主桁/横桁） | 原本に採用断面あり | ソフトは section candidate + PENDING_AUTHORIZATION | NOT_AUTHORIZED | 同上 |
| R-05 | 数量 | 原本・図面に数量概念あり | ソフトは snapshot 由来の数量行（長さ/面積）を出力 | NOT_VERIFIABLE | 原本数量表と比較可能な同一前提データなし |
| R-06 | 疲労・合成 | 原本は照査対象（一部 OUT_OF_SCOPE） | ソフトは deferred（DEF-03/04） | NOT_AUTHORIZED | 設計書どおり |

## 総括

- 比較可能な数値照合は 0 件（ソフトの数値エンジンが認証前のため）。
- 全項目を NOT_AUTHORIZED とし、数値の正式認証は Phase B / OWN-026 に委ねる。
- ソフトの解析 API（/api/design/analyze）・設計 framework の接続は E2E で PASS（動作確認は完了）。
- 「一致」とは判定しない（未認証数値を勝手に認証しない方針）。
