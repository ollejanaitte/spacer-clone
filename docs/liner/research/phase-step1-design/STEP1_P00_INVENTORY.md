# STEP-1 P00 — Inventory / Freeze

## Baseline（2026-08-08 確認）
- origin/research/liner-r1-planning @ 6696e625ef00b85496a86554538af5a1e9ac8cca
- origin/main @ c620b9c（X4系コードは未統合。Step1はresearch側を正規baselineとする）
- X4D_VERDICT: COMPLETE

## Implementation Status Matrix（Step 1 対象範囲）

| 領域 | 現状 | 既存正本 | Step2実装有無 |
|------|------|----------|---------------|
| A. Vertical Geometry | NOT_IMPLEMENTED（elevationはEXPLICIT_INPUT/DEFERRED） | - | 要実装 |
| B. Road Design Rules | widening/curve-length/建築限界 NOT_IMPLEMENTED。crossfallはX4-Cでexplicit入力のみ | phase-x2 spec, phase-x3 impl | 要実装 |
| C. Bridge Geometry (Pier/Span/Girder/Node) | Road→Bridge read-only adapterのみ（X4-C） | crosssection/adapters.py | 要実装 |
| D. Output/Report/Drawing | drawing/dxfはfrontend側に一部既存 | frontend/src/liner/drawing, dxf, exports | 要設計・実装 |
| E. 3D Contract | データ契約なし（UIはStep3） | - | 要設計 |
| F. Project Replay/Golden | X4B-P06/X4C-P06の単点replayあり。案件丸ごとは未定義 | test_alignment_p06, test_crosssection_p06 | 要設計・実装 |

## Source / Provenance一覧（Step1設計根拠）

| ID | 資料 | 所在 | 用途 |
|----|------|------|------|
| SRC-001 | JIP-LINER ユーザーズマニュアル | マニュアル/JIP-LINER_マニュアル.pdf | A/B/C/D全般 |
| SRC-004 | サンプル LINER 計算書（高架橋） | 001_サンプル_LINER計算書_高架橋_入力結果_出力結果.PDF | F/Golden |
| SRC-005 | 鋼鈑桁橋 設計計算例 | /home/masaharu/Projects/鋼鈑桁橋_設計計算例.pdf | C/D/F |
| SRC-006 | 鋼鈑桁橋 図面例 | /home/masaharu/Projects/鋼鈑桁橋_図面例.pdf | D/E |
| SRC-007 | 道路構造令の解説と運用（令和3年3月） | /home/masaharu/Projects/道路構造令の解説と運用_令和3年3月.pdf | B |
| SRC-008 | サンプル道路線形計算例 | /home/masaharu/Projects/サンプル_道路線形計算例.pdf | A/D/F |
| SRC-009 | サンプル道路設計図 | /home/masaharu/Projects/サンプル_道路設計図.pdf | D/E |
| SRC-010 | 西知多道路（東海JCT）主要点データ | docs/liner/research/phase-x1-5-project-evidence/ROAD_CALC_MAPPING.csv | F |
| SRC-011 | JIP-LINER機能差分監査・UX調査 | docs/liner/research/jip-liner-gap-and-future-ux/ | A-F全般 |
| SRC-012 | 道路構造令目次解析（Rule候補23件） | docs/liner/research/road-structure-ordinance/（untracked） | B |

## 既存設計書・contract（再利用対象）

- backend/rule_engine/geometry（X4-A: contracts/line_arc/clothoid/station_offset）
- backend/rule_engine/alignment（X4-B: model/evaluate/continuity/contract）
- backend/rule_engine/crosssection（X4-C: model/width/crossfall/geometry/global_xyz/adapters）
- backend/rule_engine/road_geometry（X4-D: contracts/api facade）
- backend/rule_engine/models / registry / loader / rules
- backend/rule_engine/rules/（道路構造令系rule 18件 + X4B-R-001）
- frontend/src/liner（profile / coordinate / drawing / dxf / exports / importer）
- docs/liner/research/phase-x2-rule-engine-specification（contract策定）
- docs/liner/research/phase-x3-rule-engine-implementation（rule実装）
- docs/liner/research/phase-x4a-x4d（各final report / gate）

## Critical Uncommitted Data
- docs/liner/research/road-structure-ordinance/（untracked, 設計根拠・Rule候補。Step1でtrack対象に検討）

## Step 1 Scope 凍結

対象（設計書作成・凍結のみ）:
- A Vertical Geometry / B Road Design Rules / C Bridge Geometry /
  D Output・Report・Drawing / E 3D Geometry Contract / F Project Replay・Golden

非対象（Step1でproduction実装しない）:
- Vertical solver本実装 / widening等rule本実装 / Pier/Span/Girder/Node本実装
- UI変更 / Three.js / 大規模リファクタ / X4-A/B/C/D破壊的変更 / main直接変更

例外: 設計整合確認のための最小test fixture/schema/prototype（production behavior不変）はPRで明示して可。
