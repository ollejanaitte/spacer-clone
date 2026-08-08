# Phase 3-1/3-2 Test Results

> **Phase:** P5
> **Environment:** worktree `/tmp/opencode/phase3-1-2-alignment` / branch `integration/phase3-1-2-alignment-bridgegeometry`
> **Final main:** `3e762c25`

## 新規（bridgeProject モジュール）

| 対象 | tests | 内容 |
|------|-------|------|
| `alignmentAdapter.test.ts` | 13 | 決定論 / 山岳500m extent / support 全測点 / station・XYZ・heading・grade・crossfall・width 保持 / DERIVED 非昇格 / fail-closed |
| `bridgeGeometryGenerator.test.ts` | 11 | 9 supports / 8 spans / skew=π/2 / width=12 / fail-closed / fallback / determinism |
| `cbdmDocument.test.ts` | 11 | BpValue→CBDM マッピング / schema 妥当 / 決定論 / Save-Load-Replay round-trip / manifest |
| `mountain500.e2e.test.ts` | 8 | 全チェーン / 山岳500m互換 / solver 一致 / byte 決定論 / manifest round-trip / adapter interop |

**bridgeProject 計: 43 tests PASS**

## Regression（main 全体）

| 検証 | 結果 |
|------|------|
| frontend typecheck（tsc -b） | PASS |
| frontend vitest full | **421 files / 3189 tests PASS** |
| backend pytest | **1077 PASS** |
| e2e: mountain-main3d（Main 3D Viewer） | 3 PASS |
| e2e: adapter-normal-path（下部工） | 2 PASS |
| contracts suite（BridgeProject 等） | PASS（3189 に含む） |
| substructure / apollo / liner 全 unit | PASS（3189 に含む） |

## 保護確認

- Phase 3-0 統合成果（Step3 UI / 山岳500m / terrain / Main3D / geometry3d / Replay / Save-Load）
  → 全 unit + e2e PASS
- 上部工（apollo geometry/design/visualization）→ regression PASS
- 下部工 Calculation Adapter（A-01）→ regression + e2e PASS
- BridgeProject contract / schema / validator → contracts suite PASS
- 上部工・下部工の**正式数値設計は NOT_GRANTED / NOT_AUTHORIZED のまま**（勝手に完成扱いしない）
