# STEP 1-P09 — RISK_DEPENDENCY_BACKLOG

> **Authority:** Reference Bridge 001 (RB-S10-001) — 上部工一気通貫
> **Status:** STEP 1 設計
> **正本:** `phase6_0/validation/risk_register.csv`（R6-001..012）・`phase6_0/audit/*`（DUP/RC レジスタ）・`P00_BASELINE`（GAP-01..09）

## 1. リスク（Phase 6-0 レジスタ継承 + STEP 1 追加）

| ID | リスク | 影響 | 対策 | 状態 |
|----|--------|------|------|------|
| R6-001..012 | Geometry Core 重複・LINER 複製・未解決捏造・座標/単位 drift・Common Model drift・Golden 回帰等 | 手戻り | 既存レジスタの対策を STEP 2/3 各 PR で適用 | OPEN（継承） |
| RS-013 | 設計計算の式・規準が未認証（BLOCKED）のまま STEP 2 で実装不能 | 計算エンジン遅延 | 実装は認証ゲート設計に従い、数値は NOT_AUTHORIZED のまま実装可能な範囲（モデル生成・フレームワーク）を先行 | OPEN |
| RS-014 | 解析結果の単位/DOF/符号が未検証（AN-BLK） | 数値照合不可 | Phase 6-4 の解析 parity はプローブ（unit/DOF/sign）PASS 後に実施 | OPEN |
| RS-015 | plane-grid→global 変換の根拠不足 | 格点座標ずれ | G-GEO 由来の導出値のみ使用・推測禁止（P04） | OPEN |
| RS-016 | 3D/図面/数量が独自 geometry を作る | 二重実装 | GeometrySnapshot を唯一 source（P04） | OPEN |
| RS-017 | UI に dead-end ボタン残存 | 製品品質 | ボタン action 全定義（P06）+ STEP 3 監査 | OPEN |
| RS-018 | Replay の Golden 自己生成 | 検証無効 | expected は既存 Golden/計算書/図面のみ（P07） | OPEN |

## 2. 依存関係

| 依存 | 起点 | 終点 | 根拠 |
|------|------|------|------|
| GeometrySnapshot（6-1）→ Phase 6-2 全 entity | 6-1 | 6-2 | snapshot が唯一 geometry source |
| Phase 6-2 → Phase 6-3 3D | 6-2 | 6-3 | 3D solid は snapshot entity を使用 |
| Phase 6-2/6-3 → Phase 6-4 解析結合 | 6-2/6-3 | 6-4 | 解析モデルは snapshot 由来 |
| Phase 6-4 解析 → Phase 7 照査 | 6-4 | 7 | 照査は解析結果を使用 |
| Phase 7 → Phase 8 出力 | 7 | 8 | 出力は照査/設計結果を使用 |
| STEP 2 → STEP 3 UI | STEP 2 | STEP 3 | UI は実装結果を結線 |
| 数値認証（OWN-026）→ 全数値出力 | — | 全 Phase | 認証前に本番出力しない |

## 3. Backlog（deferred / 後工程）

| 項目 | 内容 | 理由 | 影響 | 開始条件 | 担当 Phase |
|------|------|------|------|----------|-----------|
| DEF-01 | 道路線形接続 UI（G02 / DeckAppurtenance の線形 binding） | 道路側 STEP が別ライン（research/liner-r1-planning） | 線形を UI で直接編集しない運用に | 道路側との接続契約合意 | Phase 9 / 道路側 STEP2 |
| DEF-02 | 逆V/X 横構パターン | 根拠資料不足（V のみ実装） | V のみ対応 | 設計計算書・図面の根拠確認 | Phase 7 |
| DEF-03 | 疲労照査（データ境界のみ） | Phase A で OUT_OF_SCOPE | 疲労データ境界のみ保持 | 疲労規準認証 | Phase 7（別工程） |
| DEF-04 | 合成桁検討 | nonCompositeAssertion=false が既定 | 非合成を基準 | 合成検討仕様確定 | Phase 7 |
| DEF-05 | 正式計算書 PDF（正式化） | 認証ゲート（NOT_AUTHORIZED） | 開発系出力のみ | GRANTED（OWN-026） | Phase 8/9 |
| DEF-06 | autosave 再有効化 | 現状 freeze（AUTOSAVE_ENABLED=false） | 手動保存のみ | 復元方針決定 | Phase 9 |
| DEF-07 | 曲線/skew/連続設計図面 | 現状 unsupportedScope | 直線/直橋のみ対応 | 設計計算書根拠 | Phase 8 |
| DEF-08 | 下部工本実装（別ラボ） | substructure-planning は研究扱い | 接続境界のみ | 下部工 STEP 方針決定 | 下部工 |

## 4. 実装 blocking HOLD

- 本 STEP の判定上「実装 blocking HOLD = 0」とするため、上記 DEF は全て「deferred（非 blocking）」
  として理由・影響・開始条件・担当 Phase を明記する。
- 数値認証（RS-013/RS-014）は blocking に見えるが、STEP 2 は「モデル生成・フレームワーク・
  検証設計」を NOT_AUTHORIZED のまま実装可能とし、数値照合は認証後に実施する設計とする。
