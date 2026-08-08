# Phase 3-3 Fail-Closed 条件

**原則:** エラー時に旧 sample 値へ黙って戻さない。仮値へ置換しない。

## binding facade（`buildBoundGeometryInput`）

| 条件 | code |
|------|------|
| CBDM 不在 / schema 違反 | （parse 時に throw） |
| support が 0 件 | `BP_BINDING_MISSING_SUPPORT` |
| support が全 station を持たない（mixed 含む） | `BP_BINDING_MISSING_STATION` |
| bridge length が数値でない | `BP_BINDING_MISSING_BRIDGE_LENGTH` |
| span 数 ≠ support 数 − 1 | `BP_BINDING_MISSING_SPAN` |
| girder offsets 欠落（invent しない） | `BP_SOURCE_INVALID` |

## engine（`DefaultGeometryEngine.generateSnapshot`）

| 条件 | 挙動 |
|------|------|
| mixed support station 有無 | throw（混合 station 禁止） |
| support station 非昇順 | throw |
| bridgeLength ≠ 最終−先頭 station | throw |
| span 合計 ≠ bridge extent | throw |
| NaN / Infinity | 既存 solver / adapter が throw |

## その他

- 未認証値（NOT_AUTHORIZED / NOT_GRANTED / PROHIBITED）は設計計算に使用しない。
- deck thickness 未宣言は NOT_AVAILABLE で明示（黙って既定厚にしない）。
- `CommonModelGeometryInputAdapter` は数値を invent しない（legacy fixture は空のまま）。
