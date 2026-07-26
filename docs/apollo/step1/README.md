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

## PR units (P00–P09)

| PR | Scope | Status |
|----|-------|--------|
| **P00** | Post-merge verification & Step 1 charter / governance | MERGED (#190 @ `1a534c9`) |
| **P01** | Source register & traceability baseline | MERGED (#191 @ `b0913a8`) |
| **P02** | Handoff acceptance review | MERGED (#192 @ `5102c91`) |
| **P03** | Feature catalog reconciliation | MERGED (#193 @ `563c4c7`) |
| **P04** | READY 69 requirements analysis | MERGED (#194 @ `7240f18`) |
| **P05** | Open items & blockers register | MERGED (#195 @ `849fef1`) |
| **P06** | Data flow & interface boundaries | MERGED (#196 @ `a559871`) |
| **P07** | Validation & test strategy alignment | MERGED (#197 @ `bf3d9dc`) |
| **P08** | Reference Bridge & validation strategy | MERGED (#198 @ `555a3c5`) |
| **P09** | Step 1 completion & implementation-readiness verdict | MERGED (#199 @ `1451c4c`) |

## Scope boundaries

- **In scope:** ガバナンス、受入基準、ソース優先順位、ログ、設計計画ドキュメント、実装ロードマップ
- **Out of scope:** プロダクションコード変更、ハンドオフパッケージの直接編集

## Status

```text
APOLLO_STEP1_COMPLETION_VERDICT: COMPLETE_WITH_BLOCKERS
APOLLO_IMPLEMENTATION_READINESS_VERDICT: CONDITIONAL_GO
```

**COMPLETE_WITH_BLOCKERS** — P00–P09 merged. HIGH blockers (Target Standard NOT_SELECTED, JIS gaps, Analyzer I/O UNKNOWN, IF3 client binding) documented with owners.

**CONDITIONAL_GO** — AP-00..AP-03 schema foundation and AP-11 IF3 client binding may proceed; design-check numerics and golden expected values forbidden until blockers clear.

## Entry points

- [Step 1 charter](00_governance/step1_charter.md)
- [Source precedence](00_governance/source_precedence.md)
- [Acceptance criteria](00_governance/acceptance_criteria.md)
- [Terminology & status rules](00_governance/terminology_and_status_rules.md)
- [Decision log](00_governance/decision_log.md)
- [Final report](final/step1_final_report.md)
- [Final verdicts](final/step1_verdicts.md)
- [Implementation roadmap](08_roadmap/implementation_roadmap.md)
- [Completion gate](08_roadmap/completion_gate.md)
