# STEP 1-P10 — STEP2_IMPLEMENTATION_HANDOFF

> **Authority:** Reference Bridge 001 (RB-S10-001) — 上部工一気通貫
> **対象:** STEP 2 担当モデル（設計判断を極力せず本設計書どおり実装）

## 1. STEP 2 の開始条件

- `STEP2_GATE: GO`（本 STEP 1 Design Freeze 完了）を main で確認
- baseline: `main` 最新同期、`frontend/src/apollo/geometry`（6-1）実装済み

## 2. 実装順序（P01 準拠・critical path 順）

2-01..05（Phase 6-2）→ 2-06..09（Phase 6-3）→ 2-10..12（Phase 6-4）→ 2-13..18（Phase 7）→ 2-19..20（Phase 8）

## 3. 各 PR の実装ガイド（設計判断を減らす）

| PR | 実装先 | 正本（本ディレクトリ + 既存） | 完了条件 |
|----|--------|------------------------------|----------|
| 2-01 Grid/Panel Points | `apollo/geometry/gridPoints.ts` + `types.ts` 拡張 | `STEP1_P04_BRIDGE_GEOMETRY.md` §3/§4/§5、mapping GM-008..013 | 端点配置 + HOLD 伝播 + plane-grid→global 変換テスト |
| 2-02 Deck Reference | `apollo/geometry/deck.ts` | P04 §3、GM-014 | 床版 width/thickness/boundary（G-GEO-0017/0018） |
| 2-03 Member Placement | `apollo/geometry/members.ts` | P04 §3、GM-020/021 | 主桁/横桁/横構 placement ref |
| 2-04 Bearing Points | `apollo/geometry/bearings.ts` | P04 §3、GM-022 | 支承 reference |
| 2-05 Transverse/Section Frames | `crossSectionFrame.ts` 拡張 | P04、GM-015 | 横断面フレーム拡張 |
| 2-06 Snapshot→3D | `apollo/visualization/snapshot3d.ts` | `STEP1_P04_3D_CONTRACT.md` §2 | snapshot→solid parameters |
| 2-07 上部工 3D 生成 | `apollo/visualization` | P04 3D §2/§3 | 床版/主桁/横桁/横構/支承 solid |
| 2-08 下部工接続 | `substructure/*` | P04 3D §5（CN-12） | snapshot supports 消費 |
| 2-09 STL/DXF 正式化 | `apollo/export` | P04 3D §4、OUTPUT_MATRIX | snapshot 由来 solid + manifest |
| 2-10 解析結合 | `structuralModelConnector.ts` + backend | `STEP1_P05_ANALYSIS_DESIGN_ARCHITECTURE.md` §1 | snapshot→解析モデル→実行 |
| 2-11 RB-001 数値照合 | `apollo/analysis` + fixtures | P05 §1、GOLDEN_REPLAY_SPEC | 計算書/図面照合 |
| 2-12 Project Replay | `replay` ツール | `STEP1_P07_GOLDEN_REPLAY_SPEC.md` | Replay 10 step + FAIL 分類 |
| 2-13 設計条件・荷重 | `apollo/loads` 正式化 | P05 §2、CALCULATION_RULE_MATRIX | 設計 document 入力 |
| 2-14 格子生成 | backend `bridge_fem_generator` 拡張 | P05 §2.2、DS-04 | GeometrySnapshot→設計格子 |
| 2-15 格子解析 | backend solver + 新 API | P05 §2.2、API_DATAFLOW | /api/design/analyze |
| 2-16 照査（主桁/床版/床組/支承） | `apollo/design` | CALCULATION_RULE_MATRIX、DS-05 | 照査ロジック + 判定 |
| 2-17 補剛材/継手/疲労境界 | `apollo/design` | DS-05 | データ境界 + ロジック |
| 2-18 非合成/合成 | `apollo/design` | P05 §2.4 | nonCompositeAssertion 対応 |
| 2-19 断面自動決定 | `apollo/design/autoSize` | P05 §3 | iteration + 収束 |
| 2-20 出力正式化 | `apollo/output` | OUTPUT_MATRIX、P05 §3 | 計算書/図面/数量/CSV/DXF/STL + ゲート |

## 4. 実装ルール（STEP 2 担当は守る）

- 各 PR は小さく、専用 branch、local 検証（tsc + 該当 test + 回帰）、PR → merge。
- 既存完成機能・Phase 5 Common Model・Phase 6-0 契約・既存 viewer/renderer を壊さない。
- LINER 数式の別実装・Geometry への数式複製・隠れ座標変換・単位曖昧・ID 喪失・
  unresolved 捏造は禁止。
- 数値出力は認証ゲート（NOT_AUTHORIZED）を透過しない。
- 本設計書と矛盾する実装判断が必要になったら、設計書を先に更新してから実装する。

## 5. 受け渡し物（STEP 2 完了時）

- 各 Phase の completion report（本ディレクトリの pattern に従う）
- 全テスト PASS の証拠、final_report.txt 更新
- STEP 3 開始用 handoff（`STEP1_P10_STEP3_HANDOFF.md` の状態更新）
