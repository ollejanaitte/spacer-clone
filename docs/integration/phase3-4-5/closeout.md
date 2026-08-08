# Phase 3-4/3-5 Closeout

> **Phase:** P6
> **Baseline main:** `b8215ebaed659e45ad8ff84549fb07e706ef5487`
> **Final main:** `f017099f0259f49e3cc5124db1d888e80b382e82`
> **Branch:** `integration/phase3-4-5-super-substructure`

## 1. Merge Ledger

| PR | 内容 | merge SHA |
|----|------|-----------|
| #743 | P0 plan + preflight | `976678e3c92c36c8f8101e6dc150a19d1c0def07` |
| #744 | P1 ②→BridgeProject.Superstructure adapter + manifest | `dc6716e503e3af8cc31b500b159ed776443ec21f` |
| #745 | P2 superstructure sidecar persistence | `42fa84c31bf6fab41973f653297fa566a9e92fcb` |
| #746 | P3 BridgeProject→substructure binding + reaction guard | `6e7de0e89a887c680d305560589973b656edf8e6` |
| #747 | P4 real placement + App bound mode | `03cd5f70209d12f67a29e03cbcb151ca4c55978f` |
| #748 | P5 full-chain E2E | `f017099f0259f49e3cc5124db1d888e80b382e82` |
| #749 | P6 docs + closeout（本 PR） | （merge 後に記録） |

## 2. 達成

- **Phase 3-4**: ② GeometrySnapshot + input → BridgeProject.Superstructure（共有事実 + provenance + NOT_AUTHORIZED）。manifest へ bearingSeats・section status・references 反映。sidecar 永続化 + round-trip。
- **Phase 3-5**: CBDM + manifest → ③ Support[]（station/skew/bearingSeats/alignment 実 binding）。SupportPlacementEngine を実行時 host に配線（実線形配置・非 identity basis）。Pier/Abutment 初期モデル + 3D solids。反力 NOT_AUTHORIZED guard。
- **統合**: 山岳500m で ①→BP→②→BP.Superstructure→③→初期モデル→Save/Load/Replay が E2E 成立。

## 3. 残課題

- deck thickness / girder offsets: SUPERSTRUCTURE 入力（CBDM に無し）。MISSING/NOT_AVAILABLE で明示
- 中間格点 HOLD / grid panel: 未 binding（SAMPLE mode 専用）
- grade / crossfall: 受け渡し済み・engine 未消費
- 正式上部工・下部工 Design Engine / 反力認証: 未実装（NOT_AUTHORIZED / NOT_GRANTED）
- Workflow Engine 全面実装: スコープ外
- Main3D Viewer への ③bound モデルの統合描画は Phase 3-6 以降の候補（現状は substructure viewport で検証）

## 4. 判定

- **PHASE_3_4_VERDICT: COMPLETE**
- **PHASE_3_5_VERDICT: COMPLETE**
- **INTEGRATION_VERDICT: COMPLETE**
- **NEXT_PHASE_READINESS: GO**

次の正規マイルストーン: Phase 3-6（Main 3D Viewer への ③bound 統合描画 / ①→②→③ 同一ビュー）/ 反力認証プロセス整備
