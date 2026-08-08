# Phase 3-4/3-5 Test Results

> **Environment:** worktree `/tmp/opencode/phase3-4-5-integration` / branch `integration/phase3-4-5-super-substructure`

## 新規テスト

| 対象 | tests | 内容 |
|------|-------|------|
| `superstructureAdapter.test.ts` | 6 | 共有事実抽出 / deck thickness MISSING / round-trip / fail-closed |
| `projectSuperstructure.test.ts` | 4 | sidecar round-trip / JSON-string hydrate / schemaVersion reject / absent |
| `substructureBinding.test.ts` | 7 | Support binding / bearingSeats / fail-closed / reaction guard |
| `mountain500.substructure.test.ts` | 5 | 実配置 snapshot（非 identity basis）/ engine 一致 / 3D solids / reaction なし |
| `mountain500.fullchain.e2e.test.ts` | 4 | ①→②→③ 全チェーン / Save→Load→Replay / support mapping / 決定論 |

## E2E 結果（山岳500m 一本道）

| 項目 | 結果 |
|------|------|
| ①→BridgeProject→② Geometry→3D | PASS（9 supports@50..450 / solid > 0） |
| ②→BridgeProject.Superstructure→manifest | PASS（bearingSeats / section COMPLETE / NOT_AUTHORIZED） |
| →③ Support[]→実配置→Pier/Abutment 初期モデル→3D solids | PASS（A1/P1..P7/A2・9 groups） |
| Save→Load→Replay（CBDM + Superstructure + SubstructureProject） | PASS（fingerprint 一致） |
| 決定論（同一入力→同一共有記録） | PASS |

## Regression（main 全体）

| 検証 | 結果 |
|------|------|
| frontend typecheck | PASS |
| frontend vitest full | **431 files / 3247 tests PASS** |
| backend pytest | **1077 PASS** |
| e2e: mountain-main3d / adapter-normal-path | 5 PASS |
| substructure suite | 333 tests PASS |
| bridgeProject suite | 95+ tests PASS |

## 保護確認

- 既存 A-01 Calculation Adapter / SupportPlacementEngine / SubstructureProject 永続化 → 変更なし・全 PASS
- Main 3D Viewer / Step3 UI / 山岳500m / Electron → e2e + 既存 suite PASS
- 正式数値設計・反力は NOT_AUTHORIZED / NOT_GRANTED のまま（昇格なし）
