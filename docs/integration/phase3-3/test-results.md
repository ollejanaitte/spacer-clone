# Phase 3-3 Test Results

> **Environment:** worktree `/tmp/opencode/phase3-3-binding` / branch `integration/phase3-3-liner-superstructure-binding`

## 新規テスト

| 対象 | tests | 内容 |
|------|-------|------|
| `placement.binding.test.ts` | 10 | bound station/skew 採用 / XYZ / girder・deck extent / fail-closed（mixed・非昇順・length 不一致・span sum）/ legacy |
| `geometryInputAdapter.binding.test.ts` | 5 | spanLengths / bridgeLength / support / deckSpecs 抽出 / legacy no-invent |
| `superstructureBinding.test.ts` | 7 | bound input 数値 / fail-closed（support・station・span・girder 欠落）/ engine 消費 |
| `SuperstructurePipelinePanel.binding.test.tsx` | 5 | bound summary / bound Geometry / 3D / unavailable / SAMPLE 維持 |
| `mountain500.binding.e2e.test.ts` | 5 | CASE A-1 全チェーン + 3D / CASE A-2 線形変更伝播 / CASE A-3 Save→Load→Replay / 決定論 |

## E2E 結果（Phase 3-3）

| E2E | 結果 |
|-----|------|
| CASE A-1 山岳500m ①→②（9 supports@50..450 / skew=π/2 / width=12 / girder 50..450） | PASS |
| CASE A-1 3D（snapshot → solid parameters） | PASS |
| CASE A-2 線形変更（A2 450→460 → bridgeLength 410・fingerprint 変化） | PASS |
| CASE A-3 Save→Load→Replay 同一 GeometrySnapshot | PASS |
| 決定論（同一入力 → 同一 fingerprint） | PASS |

## Regression（main 全体）

| 検証 | 結果 |
|------|------|
| frontend typecheck | PASS |
| frontend vitest full | **426 files / 3221 tests PASS** |
| backend pytest | **1077 PASS** |
| e2e: mountain-main3d / mountain-sample-workflow / adapter-normal-path | 7 PASS |
| contracts suite（BridgeProject 等） | PASS |
| substructure / apollo / liner 全 unit | PASS |
| workflow suite（WF-01 実ステップ化反映） | PASS |

## 保護確認

- Phase 3-0/3-1/3-2 成果（Step3 UI / 山岳500m / Main3D / Alignment Adapter / BridgeGeometry / CBDM / manifest）→ 全 PASS
- 上部工既存 Geometry/Design/Visualization → PASS（RB-001 SAMPLE mode 維持）
- 下部工 Calculation Adapter（A-01）→ e2e PASS
- BridgeProject schema / validator / manifest → contracts suite PASS
- 正式数値設計は NOT_GRANTED / NOT_AUTHORIZED のまま（binding 成功で完成扱いにしない）
