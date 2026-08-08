# X4-D P00 — Audit / Baseline / Scope Freeze

## Baseline
- origin/research/liner-r1-planning @ 013f7526cc21223fd667b95745e33c8f7f55f0a1
- origin/main @ e0780e7（X4系コードを含まないため、正規baselineはresearch側を使用）

## Preflight結果
- ACTIVE_WORK_PATH: /home/masaharu/Projects/spacer-clone-liner-r1-planning
- BASELINE_SHA: 013f7526cc21223fd667b95745e33c8f7f55f0a1
- X4D_STATUS: NOT_STARTED（branch / code / PR なし）
- CONTAMINATION_STATUS: NO
- RESTART_VERDICT: YES（SAFE_TO_RESTART_IMPLEMENTATION）
- FIRST_IMPLEMENTATION_STEP: P01（contract / 型 / facade骨格）

## 既存成果の確認（P00時点）
| 項目 | 状態 |
|------|------|
| X4-A Geometry Kernel（geometry/） | PASS（58 tests） |
| X4-B Alignment Solver（alignment/） | PASS（61 tests） |
| X4-C Cross Section（crosssection/） | PASS（94 tests: crosssection + regression） |
| AlignmentGeometryRule（X4B-R-001） | 実在するがglobal RuleRegistry未登録 |
| Road→Bridge read-only adapter | crosssection/adapters.py に実在 |

## 監査指摘との対応
| 監査指摘 | 本Phaseでの対応 |
|----------|------------------|
| X4-A/B/Cがサブシステムごとに分断 | Road Geometry API facadeで一本化 |
| AlignmentGeometryRuleがglobal RuleRegistryに未登録 | P04で正式登録 |

## 本PhaseのPR分割（計画）
- P00: 本監査 / scope固定 / phase docs（本PR）
- P01: RoadGeometryRequest / RoadGeometryResult のcontract・型・facade骨格
- P02: Geometry Kernel / Alignment Solver のfacade統合
- P03: Cross Section / width / crossfall / road edge のfacade統合
- P04: AlignmentGeometryRule（X4B-R-001）のglobal RuleRegistry登録
- P05: RoadGeometryResult統一 / validation / error契約整理
- P06: facade契約テスト / X4-A/B/C回帰 / project replay
- P07: X4-D final verification / completion gate / integration確定

## 非対象（再確認）
- vertical profile solver / widening / curve-length / 建築限界
- frontend UI・3D・drawing
- geometry・alignment・crosssection の破壊的変更
