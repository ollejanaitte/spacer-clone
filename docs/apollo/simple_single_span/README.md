# Apollo — 単径間単純桁（SIMPLE_SINGLE）入力整理

**Authority:** Apollo 入力補助（Step S0）
**Date:** 2026-08-02
**Repository:** /home/masaharu/Projects/spacer-clone
**Model:** DeepSeek V4 Flash（SINGLE_MODEL_FULL_EXECUTION）

本ドキュメントは、現在の正式対応形式である**単径間単純桁（SIMPLE_SINGLE）**を整理し、
動作確認用サンプル入力・用語修正・入力補助の仕様を定義する。

---

## 1. 目的

- 現在の Apollo 橋梁構造入力の対応形式を「単径間単純桁（現在対応）」として明示する
- `spanLength`（現行表示名「径間長」）の表示を「支間長」へ修正する
- `bridgeLength`（現行表示名「橋長」）の責務を明確化し、単径間では構造モデル長を支間長と同値にする
- 動作確認用サンプル入力の仕様を定義する（**設計採用値ではない**）
- 後続の連続桁（CONTINUOUS）スコープ（Step C0 以降）の前提を固定する

## 2. 現在の対応形式

| 項目 | 値 |
|------|-----|
| 構造形式 | 単径間単純桁（SIMPLE_SINGLE） |
| 支間数 | 1（spanCount = 1） |
| 支間長（spanLength） | ユーザー入力（表示名: 支間長） |
| 構造モデル長（bridgeLength） | 単径間では支間長と同値（内部導出候補） |
| 主桁 | 直線・等桁高・同一断面（非合成RC床版鋼鈑桁） |
| 床版 | 非合成 RC 床版 |
| 支承 | 両端支持（A1 / A2） |
| 設計・解析状態 | NOT_AUTHORIZED（正式照査・解析許可なし） |

## 3. 対象外（今回のスコープ外）

- 複数径間だが各径間が独立した単純桁（SIMPLE_MULTIPLE）— DEFERRED
- 連続桁（CONTINUOUS）— Step C0 以降
- 連続桁の正式断面力解析・負曲げ照査・活荷重包絡
- 正式な設計 OK/NG・利用率
- 道示 R7 未確認値の採択
- 変桁高・曲線橋・斜橋・箱桁・合成桁

## 4. 数値状態（変更しない）

```
NUMERIC_RELEASE_READINESS_VERDICT: BLOCKED
PHASE_B_IMPLEMENTATION_START_VERDICT: NO_GO_PENDING_HUMAN_EVIDENCE
NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED
```

純幾何・3D を実装しても GRANTED へ変更しない。

## 5. ドキュメント一覧

| ファイル | 内容 |
|----------|------|
| README.md | 本ファイル |
| field_semantics.md | 入力フィールドの意味・UI表示名と内部fieldの対応 |
| sample_input_spec.md | 動作確認用サンプル入力仕様 |
| manual_verification_checklist.md | 手動確認チェックリスト |

## 6. 実装フェーズ

| Step | ブランチ | 内容 |
|------|----------|------|
| S0 | docs/apollo-simple-single-scope | 本ドキュメント群（用語・サンプル仕様） |
| S1 | feat/apollo-simple-single-sample-input | サンプル入力 UI・用語修正 |
| S2 | test/apollo-simple-single-verification | 検証・回帰 |
