# Apollo — 連続桁（CONTINUOUS）垂直スライス

**Authority:** Step C0（scope freeze）
**Date:** 2026-08-02
**Repository:** /home/masaharu/Projects/spacer-clone
**Model:** TokenRouter KimK3（作業員: Composer 2.5）

本ドキュメント群は、**2〜5 径間連続桁**の垂直スライス（入力 → SDM → 3D → save/reload → STL）のスコープを凍結する。
数値設計・正式解析は対象外とし、純幾何・可視化のみを Step C1 以降で実装する前提を固定する。

---

## 1. 目的

- 単径間単純桁（SIMPLE_SINGLE、S0〜S2 完了）の次段として、連続桁の対象範囲を文書凍結する
- 入力 UI・SDM 表現・3D 可視化・STALE ゲート・永続化の責務境界を定義する
- 正式解析・負曲げ・活荷重包絡を明示的に除外し、fail-closed を維持する

## 2. 対象（IN_SCOPE）

| 項目 | 値 |
|------|-----|
| 橋軸 | 直橋（alignment = STRAIGHT） |
| 桁形式 | 非合成 RC 床版鋼鈑桁 |
| 桁高 | 等桁高（girderDepth = EQUAL） |
| 径間系 | 2〜5 径間連続桁（spanSystem = CONTINUOUS） |
| 主桁断面 | 全支間同一断面（girderSectionSegments なし） |
| 下部構造 | 支承・橋台・橋脚の簡易モデル（幾何表現のみ） |
| ワークフロー | 入力 / SDM 生成 / 3D 表示 / save-reload / STALE ゲート / STL 出力 |

## 3. 対象外（OUT_OF_SCOPE）

- 複数独立単純桁（各径間が独立した SIMPLE_MULTIPLE）
- 正式解析（断面力・照査・利用率）
- 負曲げ照査・負曲げ区間の特別扱い
- 活荷重包絡・影響線解析
- 変桁高・曲線橋・斜橋
- 合成桁（床版を主桁剛性へ加算）

## 4. 数値ゲート（変更しない）

```
NUMERIC_RELEASE_READINESS_VERDICT: BLOCKED
PHASE_B_IMPLEMENTATION_START_VERDICT: NO_GO_PENDING_HUMAN_EVIDENCE
NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED
```

純幾何・3D を実装しても上記ゲートは GRANTED へ変更しない。

## 5. ドキュメント一覧

| ファイル | 内容 |
|----------|------|
| README.md | 本ファイル |
| scope_freeze.md | スコープ凍結・前提・フェーズ境界 |
| data_model_spec.md | 入力・SDM・BSDD のデータモデル |
| ui_spec.md | 入力 UI・STALE・生成フロー |
| visualization_spec.md | 3D ソリッド・STL 出力 |
| analysis_boundary.md | 解析・照査の禁止境界 |
| manual_verification_checklist.md | 手動確認チェックリスト |

## 6. 実装フェーズ

| Step | ブランチ（予定） | 内容 |
|------|------------------|------|
| C0 | docs/apollo-continuous-girder-scope | 本ドキュメント群（scope freeze） |
| C1 | feat/apollo-continuous-girder-data-model | SDM/BSDD 連続桁表現 |
| C2 | feat/apollo-continuous-girder-ui | 入力 UI・構造形式選択 |
| C3 | feat/apollo-continuous-girder-3d | 3D 可視化・STL |
| C4 | test/apollo-continuous-girder-verification | 検証・回帰 |

## 7. 上流・互換

- 上流: `docs/apollo/simple_single_span/`（S0〜S2 MERGED）
- SIMPLE_SINGLE の既存フローは破壊しない（additive backward compatibility）
- `phase1ScopeGuard` の CONTINUOUS は C1 まで OUT_OF_SCOPE のまま維持
