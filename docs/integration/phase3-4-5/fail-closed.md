# Phase 3-4/3-5 Fail-Closed 条件

**原則:** 警告だけ出して続行で正式データへ混入させない。sample/mock へ黙って fallback しない。

| 条件 | 挙動 |
|------|------|
| BridgeProject.Superstructure の bridgeId 空 / girder 0 本 | throw（BP_NON_FINITE / SOURCE_INVALID） |
| 共有事実に非有限値 | throw |
| Superstructure schemaVersion 非対応 | parse reject |
| manifest 更新後 validator 違反 | throw |
| 反力 status ≠ NOT_AUTHORIZED | throw（昇格禁止） |
| CBDM support 0 件 / station 欠落 | throw |
| 配置 FATAL（LINER データなし等） | 3D 生成停止（generationBlocked） |
| save 後 provenance 消失 / reload 後 revision 変化 | hydrate/serialize validator + canonical round-trip で防止 |

## 検証箇所

- `superstructureAdapter.ts`（parse/validate）
- `projectSuperstructure.ts`（sidecar hydrate/serialize）
- `substructureBinding.ts`（buildBoundSubstructure / buildBoundReactions）
- `useSubstructureRealtimeUpdate.makePlacementSnapshots`（FATAL 伝播）
