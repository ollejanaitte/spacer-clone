# Step 1 Charter

**Authority:** DESIGN PLANNING / STEP 1  
**Version:** P00 initial

## Goals

Step 1 の目標は以下のとおり。

1. **入力フレームの確立** — GitHub 不変ハンドオフ `APOLLO-FRAME-HANDOFF-20260726-001`（PR #189）を Step 1 の唯一の公式入力として採用する。
2. **受入検証** — パッケージ内容・トレーサビリティ・READY 69 件の意味を、実装許可と混同せずに検証する。
3. **設計計画成果物の整備** — ギャップ分析、インタフェース境界、検証戦略、オープン項目管理の計画ドキュメントを `docs/apollo/step1/` に段階的に作成する。
4. **実装 readiness の分離判定** — Step 1 **完了** と **実装着手 readiness** を別 verdict として記録する。

## Non-goals

| Non-goal | Rationale |
|----------|-----------|
| プロダクションコード実装 | Step 1 は設計計画フェーズ |
| ハンドオフパッケージの変更 | 不変スナップショット；変更は新リビジョンのみ |
| 原本 PDF / `.mdb` / 実行ファイルの repo 取込 | パッケージ除外方針に従う |
| 自動的な実装許可 | READY ≠ authorized |

## Roles

| Role | Responsibility |
|------|----------------|
| **Supervisor** | ブランチ戦略、ステージング範囲レビュー、commit/push/PR/merge 承認、最終 verdict |
| **Worker (Composer 2.5)** | 指定サンドボックス内での検証・ドキュメント作成・限定ステージング；commit/push/PR は行わない |

## PR sequence (P00–P09)

| PR | Deliverable |
|----|-------------|
| P00 | Governance charter, source precedence, acceptance criteria, terminology, decision log, delegation/merge logs |
| P01 | Source register & traceability baseline |
| P02 | Handoff acceptance review (ACCEPT / ACCEPT_WITH_ACTIONS / REJECT) |
| P03 | Feature catalog reconciliation (281 features) |
| P04 | READY 69 requirements analysis |
| P05 | Open items & blockers register |
| P06 | Data flow & interface boundaries |
| P07 | Validation & test strategy alignment |
| P08 | Stage 6 gap analysis workplan |
| P09 | Step 1 completion summary & implementation-readiness verdict |

各 PR は独立にレビュー可能な単位とし、前 PR の merge を前提に次 PR を開始する。

## Completion vs implementation-readiness

| Concept | Meaning |
|---------|---------|
| **Step 1 COMPLETE** | P00–P09 全ゲートを満たし、計画成果物が整備された状態 |
| **Implementation readiness** | 別 verdict（例: `READY` / `READY_WITH_BLOCKERS` / `NOGO`）— Step 1 完了を自動的に意味しない |

Step 1 が COMPLETE でも、実装着手は supervisor の明示的承認が必要である。

## Sandbox rules (summary)

- **Working directory:** `~/Projects/spacer-clone-main` のみ
- **Mutable paths:** `docs/apollo/step1/` および最小限の `docs/apollo/README.md` 更新
- **Immutable paths:** `docs/apollo/handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/**`
- **Staging:** `git add` は明示パスのみ；`git add .` / `-A` 禁止
- **Git safety:** ff-only pull、force push 禁止、worker は commit/push/PR しない

## Post-merge package integrity (P00 verification)

検証日: 2026-07-27（main @ `0034786ef1848e69877b1e2357a453bad40059e5`）

| Check | Result |
|-------|--------|
| File count (`find -type f \| wc -l`) | **126** |
| SHA256 (`sha256sum -c SHA256SUMS.txt`) | **124 OK**（`SHA256SUMS.txt` / `MANIFEST.csv` は自己除外） |
| READY rows (`ready_requirements.csv`) | **69** data rows |
| Feature rows (`feature_catalog.csv`) | **281** data rows |

**Note:** ローカル research 原本の展開ツリー（`~/Projects/apollo/manual-research/...`）は欠落している場合がある。GitHub 上の不変パッケージが Step 1 の **authoritative intake** である。ローカル ZIP（`APOLLO-FRAME-HANDOFF-20260726-001.zip`）は 126 ファイルで一致を確認済み（P01 source register で詳細記録予定）。
