# Apollo Step 1 — Design Planning

**Authority:** DESIGN PLANNING / STEP 1

## Purpose

Step 1 は、GitHub 上の不変ハンドオフパッケージ [APOLLO-FRAME-HANDOFF-20260726-001](../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/README.md) を入力フレームとして、骨組み計算ソフト統合に向けた設計計画・受入検証・ギャップ分析の成果物を `docs/apollo/step1/` 配下に段階的に整備するフェーズである。

本フェーズは **設計計画** であり、プロダクションコードの実装は対象外とする。

## Handoff package (immutable input)

| Item | Value |
|------|-------|
| Package ID | APOLLO-FRAME-HANDOFF-20260726-001 |
| GitHub intake | PR #189 @ squash `0034786ef1848e69877b1e2357a453bad40059e5` |
| Package path | [`apollo_frame_team_handoff/`](../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/README.md) |
| READY subset | 69 rows |
| Feature catalog | 281 rows |

ハンドオフパッケージ内のファイルは **不変** である。修正が必要な場合は新リビジョンのパッケージを作成する。

## Planned PR units (P00–P09)

| PR | Scope | Status |
|----|-------|--------|
| **P00** | Post-merge verification & Step 1 charter / governance | IN_PROGRESS |
| **P01** | Source register & traceability baseline | PLANNED |
| **P02** | Handoff acceptance review | PLANNED |
| **P03** | Feature catalog reconciliation | PLANNED |
| **P04** | READY 69 requirements analysis | PLANNED |
| **P05** | Open items & blockers register | PLANNED |
| **P06** | Data flow & interface boundaries | PLANNED |
| **P07** | Validation & test strategy alignment | PLANNED |
| **P08** | Stage 6 gap analysis workplan | PLANNED |
| **P09** | Step 1 completion & implementation-readiness verdict | PLANNED |

## Scope boundaries

- **In scope:** ガバナンス、受入基準、ソース優先順位、ログ、設計計画ドキュメント
- **Out of scope:** プロダクションコード変更、スキーマ変更、テスト実装、ハンドオフパッケージの直接編集

## Status

**IN_PROGRESS** — P00 charter staged; P01–P09 pending.

## Entry points

- [Step 1 charter](00_governance/step1_charter.md)
- [Source precedence](00_governance/source_precedence.md)
- [Acceptance criteria](00_governance/acceptance_criteria.md)
- [Terminology & status rules](00_governance/terminology_and_status_rules.md)
- [Decision log](00_governance/decision_log.md)
