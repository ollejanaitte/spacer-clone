# STEP-1 P07 — Full Implementation Plan / Step 2 Gate（凍結）

Status: FROZEN（Step2 実行の正本）

## 1. Purpose
Step 1 で凍結した各設計書（P01〜P06）に基づき、
Step 2 で backend〜出力〜Project Replay を完全実装するための
実装順序・小PR分割・依存関係・acceptance criteria を確定する。

## 2. 凍結済み設計書（Step1 成果）
| Spec | ファイル | 状態 |
|------|----------|------|
| Vertical Geometry | STEP1_P01_VERTICAL_GEOMETRY.md + TEST_VECTORS | FROZEN |
| Road Design Rules | STEP1_P02_ROAD_RULES.md | FROZEN |
| Bridge Geometry | STEP1_P03_BRIDGE_GEOMETRY.md | FROZEN |
| Output / Drawing / Report | STEP1_P04_OUTPUT.md | FROZEN |
| 3D Geometry Contract | STEP1_P05_3D_CONTRACT.md | FROZEN |
| Project Replay / Golden | STEP1_P06_REPLAY.md | FROZEN |

## 3. Step 2 実装順序（トポロジカルオーダー）

```
S2-P00  Step2 Baseline / Preflight / fixture dir 整備
  │
S2-P01  backend/rule_engine/vertical/ (P01)     [X4-Dへのelevation producer統合]
  │
S2-P02  Rule: X2-R-020 widening                  [P02]
S2-P03  Rule: X2-R-021 curve-length              [P02]
S2-P04  Rule: X2-R-022 superelevation transition [P02]
S2-P05  Rule: X2-R-023 clearance                 [P02]
S2-P06  Rule→RoadGeometry adapter                [P02 + X4-D]
  │
S2-P07  backend/rule_engine/bridge_geometry/ Pier [P03]
S2-P08  bridge_geometry Span                     [P03]
S2-P09  bridge_geometry Girder / Node            [P03]
S2-P10  Node distance / overhang / skew transform [P03]
  │
S2-P11  backend/rule_engine/output/ format.py    [P04]
S2-P12  output tables.py                         [P04]
S2-P13  output reports.py / dxf.py               [P04]
  │
S2-P14  backend/rule_engine/geometry3d/ payload  [P05]
  │
S2-P15  replay fixtures GM-01〜GM-05             [P06]
S2-P16  replay_runner + pytest 統合              [P06]
S2-P17  Step2 final verification / gate          [総仕上げ]
```

## 4. 依存関係（簡略）
- vertical: X4-D, (P01 test vectors)
- rules: 既存 rule_engine（registry/loader）+ X4-D
- bridge: X4-D, vertical(P01), RoadBridgeResult
- output: 全上記
- 3D payload: bridge, output format
- replay: 全上記 + fixtures

Critical path: X4-D → vertical → bridge → output → replay
Rule 系（P02〜P05）と 3D（P14）は並行可。

## 5. 各PRの基本形
- 調査 → 実装 → テスト → diff → commit → push → PR → pytest → merge → integration SHA
- 1 PR = 1機能 or 1 rule（小さい単位を維持）
- 既存 X4-A/B/C/D に破壊的変更なし（退行テストで確認）

## 6. 新規パッケージ（Step2 で追加）
```
backend/rule_engine/vertical/          … P01
backend/rule_engine/rules/widening.py  … P02
backend/rule_engine/rules/curve_length.py
backend/rule_engine/rules/superelevation_transition.py
backend/rule_engine/rules/clearance.py
backend/rule_engine/road_geometry/adapters.py … P02 rule→geometry
backend/rule_engine/bridge_geometry/   … P03
backend/rule_engine/output/            … P04
backend/rule_engine/geometry3d/        … P05
backend/tests/fixtures/replay/         … P06
backend/tests/replay_runner.py         … P06
```

## 7. Acceptance Criteria（Step2 全体）
- [ ] VerticalGeometry: frontend verticalSampling と数値一致 / X4-D が Z を自動算出
- [ ] Rules: X2-R-020〜023 が global RuleRegistry で評価可能・退行なし
- [ ] BridgeGeometry: RoadBridgeResult から Pier/Span/Girder/Node 生成・格点間距離・張出し長
- [ ] Output: 全表・帳票・DXF 生成・丸め規約一致・DXF readback 一致
- [ ] 3D payload: immutable・JSON 互換・全座標 finite
- [ ] Replay: GM-01〜05 を PASS/KNOWN/DEFERRED/FAIL 判定・実資料由来（自己生成なし）
- [ ] backend 全体テスト PASS（現 943 + 追加）
- [ ] 全 PR が research/liner-r1-planning へ段階 merge

## 8. Regression Strategy
- 各 PR: 当該機能テスト + 既存 X4 系回帰（X4A 58 / X4B 61 / X4C 94 / rule_engine）
- Step2 完了時: backend 全体 pytest + replay 全 GM
- frontend: 変更しない限り frontend テスト不要（output DXF は backend 単体）

## 9. Step 2 Gate 判定
STEP2_IMPLEMENTATION_READINESS: **GO**
- 全設計書 FROZEN（P01〜P06）
- 実装者が追加の大規模仕様調査なしで着手可能
- unresolved blocker = 0

## 10. Defeered（後続マイルストーン）
| 項目 | 理由 | 後続 |
|------|------|------|
| widening 算定式の実数値 | 解説PDF OCR 不明瞭 | Step2 内で数値表取得を試行、不能なら NEEDS_RESEARCH のまま fixture 化せず |
| 建築限界（道示）条文数値 | 道示 PDF 要 OCR | Step2 P05 で対象化、不能なら DEFERRED |
| 交差点・ランプ全自動設計 | 設計連鎖が大規模 | Step3 以降 |
| 曲線橋全自動配置 | 複雑（曲率追従） | Step3 以降 |
| 縦断実値（金沢IC Aランプ橋） | 実資料要照合 | Step2 GM-04 で fixture 化、不能なら DEFERRED |
| main統合 | ユーザー承認待ち | 別途 |

## 11. Traceability
- STEP1_P01〜P06 設計書
- X4-A/B/C/D final report
- 実案件資料 SRC-004/005/008/010
