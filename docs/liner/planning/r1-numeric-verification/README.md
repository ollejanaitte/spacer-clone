# R1 Numeric Verification — Planning (docs-only)

This directory contains **planning / verification design documents** for the LINER R1 numeric
verification base (GAP-1000 / GAP-1001 / GAP-1002). It is published on a dedicated research
branch for archival and review on GitHub.

> This is a planning branch. It is **NOT an implementation**, and it is **NOT merged to main**.

## Status

- **R1 実装**: 未開始（計画のみ）
- **実装ではない**: 計算ロジック・コード・テストは含まない
- **main 未合流**: `MERGE_TO_MAIN_ALLOWED: NO`
- **専用 branch 管理**: `research/liner-r1-planning`

## Not implemented (unchanged)

The following are **NOT started** and outside this branch's scope:

- 曲線橋 (curved bridge)
- 2D GUI
- 上部工 (upper structure)
- 3D
- Y字橋 / ランプ橋
- Alignment Graph
- Apollo / frontend / backend / DXF / PDF background

## Purpose on GitHub

- 専用 branch を選択して閲覧可能にするための archive として保存するのが目的。
- Pull Request は作成しない（main への誤 merge を防ぐため）。

## Implementation start condition

Implementation (R1) begins **only** after approvals for tolerances, coordinate system,
and authoritative reference data are confirmed, in a separate authorized activity.

## Provenance

- source research folder: `~/Projects/liner-future-research/`
- baseline main SHA: `b8db389fbb4e43806ffa05661a6e71b832c40d04`
- branch: `research/liner-r1-planning`
- last updated: 2026-08-07

See also `BRANCH_STATUS.md` and `COPY_MANIFEST.csv`.