# 統合設計（BridgeProject）Phase 1-2 文書

> **Authority:** TARGET DECISION / PLAN（Integration Phase 1-2）
> **Baseline:** origin/main `4e79b3c38103fc0478ec848cc5b5d98b3d003016`
> **Branch:** `research/bridge-project-phase1-2`

3系統（①道路線形 / ②上部工 / ③下部工）を BridgeProject 共通契約で統合するための
Phase 1（現状調査・責任分界）・Phase 2（BridgeProject 共通モデル定義）成果物の入口。

## 対象ツールとコード位置

| # | ツール | コード | 正本文書 |
|---|--------|--------|----------|
| ① | 道路線形作成ツール (LINER) | `frontend/src/liner/` | `schemas/contracts/v0.1/road-design-document.schema.json` |
| ② | 上部工設計計算ツール (APOLLO) | `frontend/src/apollo/` | `schemas/contracts/v0.1/bridge-superstructure-design-document.schema.json`, `common-bridge-data-model.schema.json` |
| ③ | 下部工自動設計ツール | `frontend/src/substructure/` | `schemas/substructure/*.json` |
| 共通 | 共通契約層 | `frontend/src/contracts/`, `schemas/contracts/v0.1/` | — |

## 文書一覧

| Phase | ファイル | 内容 |
|-------|----------|------|
| P0 | [inventory.md](inventory.md) | 事前調査・Git 実測・責任分界の前提 |
| P1 | [current-data-flow.md](current-data-flow.md) | ①②③の現状データフロー |
| P1 | [duplicates-conflicts-gaps.md](duplicates-conflicts-gaps.md) | 重複・競合・不足一覧 |
| P2 | [responsibility-boundary.md](responsibility-boundary.md) | 責任分界表（owner / source of truth） |
| P3 | [bridge-project-contract.md](bridge-project-contract.md) | BridgeProject 最小 schema / contract |
| P3 | [value-status-unit-policy.md](value-status-unit-policy.md) | value / source / status / unit / provenance 方針 |
| P4 | [adapter-boundaries.md](adapter-boundaries.md) | Adapter 境界と責任 |
| P4 | [sequences.md](sequences.md) | CASE A（①→②→③）/ CASE B（②→①→③）連携シーケンス |
| P5 | [phase3-implementation-order.md](phase3-implementation-order.md) | Phase 3 以降の推奨実装順序 |
| P5 | [blockers.md](blockers.md) | unresolved blocker 一覧 |
| P5 | [merge-ledger.md](merge-ledger.md) | merge した PR / commit / SHA 一覧 |

## 大前提（実測に基づく事実）

- `main` は `origin/main` と一致（未push差分なし）。ただし作業ツリーに evidence JSON 3ファイルの dirty 差分がある（生成時刻の再現のみ。壊さない・触らない）。
- ①道路線形の最新成果（MAIN3D・山岳500mサンプル・terrain fix）は `main` 未統合。
  `research/liner-terrain-fix-p01-coords`（merge-base `6a8f128` から 203 ahead / 271 behind）に存在。
  → **Phase 3 の最初の block**（[blockers.md](blockers.md)）。
- ②上部工・③下部工の直近成果はすべて `main` に merge 済み（PR #685〜#691 等）。
- 契約層は既に充実：`common-bridge-data-model`（CBDM）/ `road-design-document`（RDD）/
  `bridge-superstructure-design-document`（BSDD）/ `bridge-frame-analysis-document`（BFAD）/
  `engineering-project` が `schemas/contracts/v0.1/` に存在し、Zod が source of truth。
- BridgeProject は**ゼロから作るのではなく、既存契約層を拡張・統括する最小契約**として定義する。
