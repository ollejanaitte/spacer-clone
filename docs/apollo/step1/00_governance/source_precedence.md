# Source Precedence

**Authority:** DESIGN PLANNING / STEP 1

Step 1 における情報源の優先順位。上位ソースと矛盾する下位ソースは、下位を **override しない**。推論が必要な場合は必ず `INFERENCE` ラベルを付与する。

## Priority order

| Rank | Source | Notes |
|------|--------|-------|
| **1** | GitHub immutable handoff | `docs/apollo/handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/` — PR #189 @ `0034786` |
| **2** | Handoff `source-location-map.md` / traceability artifacts | パッケージ内のトレーサビリティ CSV/MD |
| **3** | Apollo manual-research finalized findings | ローカル research 確定成果（存在する場合） |
| **4** | Bridge-standards-research finalized findings | 道路橋示方書・JIS 関連 research 確定成果 |
| **5** | Original Apollo manuals | 原本マニュアル（repo 外；参照のみ） |
| **6** | Original standards PDFs | JIS / 道路橋示方書 / DDB 原本（repo 外；参照のみ） |
| **7** | Current repo design / code / schema / tests | `spacer-clone-main` の現行実装・設計 |
| **8** | Inference | **必須ラベル:** `INFERENCE` — 根拠ソースを decision log に記録 |

## Conflict resolution

1. 同一 rank 内で矛盾 → `DECISION_REQUIRED` として decision log に起票
2. 下位 rank が上位と矛盾 → 上位を採用；下位は参考情報として注記
3. パッケージ内 `DRAFT` 表記 vs Step 1 受入 verdict → パッケージ文言は **書き換えない**；Step 1 acceptance docs で解釈を記録（[terminology_and_status_rules.md](terminology_and_status_rules.md)）

## Local research tree caveat

`~/Projects/apollo/manual-research/` の展開ツリーは環境依存で欠落している場合がある。Rank 1（GitHub handoff）が常に authoritative intake である。Rank 3–4 は利用可能な場合のみ参照し、不在は `UNKNOWN` または source register（P01）で記録する。
