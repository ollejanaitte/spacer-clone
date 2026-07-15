# Phase3.5-0.6 Amendment Report

## 1. 修正サマリ

| # | 項目 | 反映先 | 状態 |
|---|---|---|---|
| ① | Diagnostic Severity | N1/N3/N4/N6 §8, U2 | 完了 |
| ② | Feature Flag 不採用 | N7 §7 | 完了 |
| ③ | draftSchemaVersion 改名 | N2, U4, N7 | 完了 |
| ④ | PR-UI-0 追加 | N7 | 完了 |
| ⑤ | Simpson精度 目標値化 + PR-1b-0 | N1 §5, U1, N7 | 完了 |
| ⑥ | Sampling既定値変更 | N1, N2, N5, N6, U6, U7, U8 | 完了 |
| ⑦ | Round-trip Test 必須化 | N2 §9, N7 PR-1a-5 | 完了 |

## 2. 影響範囲確認

修正した既存Markdown:

- `docs/liner/phase3.5/horizontal_curve_completion.md`
- `docs/liner/phase3.5/typed_liner_draft_schema_vnext.md`
- `docs/liner/phase3.5/vertical_alignment_design.md`
- `docs/liner/phase3.5/cross_section_superelevation_design.md`
- `docs/liner/phase3.5/coordinate_integration_3d_design.md`
- `docs/liner/phase3.5/dxf_stl_curve_export_strategy.md`
- `docs/liner/phase3.5/implementation_priority_and_pr_breakdown.md`
- `docs/liner/phase3.5/phase3.5-0.5_design_pack_summary.md`
- `docs/liner/phase3.5/updates/geometry_core_update.md`
- `docs/liner/phase3.5/updates/validation_rules_update.md`
- `docs/liner/phase3.5/updates/project_file_format_update.md`
- `docs/liner/phase3.5/updates/rendering_strategy_update.md`
- `docs/liner/phase3.5/updates/cad_output_spec_update.md`
- `docs/liner/phase3.5/updates/test_plan_geometry_update.md`

新規作成:

- `docs/liner/phase3.5/phase3.5-0.6_amendment_report.md`

集計:

- 修正既存ファイル数: 14
- 新規ファイル数: 1
- 変更行数概算: 約250〜350行

補足: `docs/liner/phase3.5` は現時点でGit未追跡ディレクトリのため、tracked diffベースの正確な行数集計はできない。

禁止事項確認:

- プロダクションコード変更なし
- テストコード追加・修正なし
- `schemas/*.json` / TS型定義変更なし
- `git add` / commit / push / PR作成なし
- `docs/liner/phase3.5/spikes/clothoid_precision_measurement.md` は今回未作成

## 3. 新規PR追加

### PR-UI-0: Liner Setup Tab Framework

| 項目 | 内容 |
|---|---|
| サイズ | S |
| 依存PR | PR-1a-6 |
| ブロックするPR | PR-1c-1, PR-1c-3, PR-1c-4, PR-2a-3, PR-2a-4, PR-3a-3, PR-3a-4 |
| 関連設計書 | N1, N3, N4, N5（UI章） |
| 工数目安 | 0.5d |

目的: 個別の水平・縦断・横断UIを実装する前に、JIP-LINER準拠の6タブ土台を先行して追加する。

### PR-1b-0: Clothoid Precision Spike

| 項目 | 内容 |
|---|---|
| サイズ | S |
| 依存PR | PR-1a-1 |
| ブロックするPR | PR-1b-5 |
| 関連設計書 | N1, U1 |
| 工数目安 | 0.5d |

目的: PR-1b-5の精度Gate実装範囲を確定する前に、Simpson 128分割のクロソイドendpoint誤差とperformance smokeをGC-08/09/10で実測する。

## 4. 依存関係再確認

更新後のクリティカルパス:

```text
1a-1 -> 1a-2 -> 1a-3 -> 1a-4 -> 1a-5 -> 1a-6 -> PR-UI-0
     -> 1b-1 -> 1b-3 -> 2a-1 -> 2b-2 -> 3a-1 -> 3b-1
     -> 4a-2 -> 4b-1 -> 5a-1 -> 5b-2
```

Clothoid precision Gate:

```text
1a-1 -> PR-1b-0 -> Human Decision -> PR-1b-5
```

並行実行可能PR:

- PR-1b-0 は PR-1a-1 完了後、PR-1b-1 と並行可能。
- PR-UI-0 は PR-1a-6 完了後に実施し、PR-1c-1, PR-2a-3, PR-3a-3 の前提となる。
- Phase3.5-2a/2b と Phase3.5-3a/3b は並行可能。ただし Phase3.5-4a で合流する。

## 5. 実装開始準備完了確認

PR-1a-1 から着手可能。

追加Human Decisionが必要な事項:

- PR-1b-0完了後、クロソイド精度を Simpson 継続で進めるか Fresnel 置換へ切り替えるかを判断する。
