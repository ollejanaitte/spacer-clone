# Phase 3-3 Closeout

> **Phase:** P5
> **Baseline main:** `4635caadef509223fdbaa9f3f970ef5fd568083a`
> **Final main:** `ac6062403b5d7c594bc043b585adc2959b3b68a8`
> **Branch:** `integration/phase3-3-liner-superstructure-binding`

## 1. Merge Ledger

| PR | 内容 | merge SHA |
|----|------|-----------|
| #736 | P0 binding plan | `3d499d4d13ce4679a578d89dd683074fc62918a8` |
| #737 | P1 engine: bound support station/skew | `547455d1636c77092c4ccd545616070db03b3345` |
| #738 | P2 adapter: spanLengths/bridgeLength/deckWidth | `3960361bcac62b8fe759f413b8c0731398131496` |
| #739 | P3 binding facade + WF-01 active | `684fce16de033193ce33af48120d9aab0d71efa1` |
| #740 | P4 panel bound mode + mountain ①→② E2E | `ac6062403b5d7c594bc043b585adc2959b3b68a8` |
| #741 | P5 docs + closeout（本 PR） | （merge 後に記録） |

## 2. 達成事項

- ①→② 正規ルート確立: LINER → BridgeProject.Alignment → BridgeGeometry → CBDM →
  `CommonModelGeometryInputAdapter`（数値）→ `buildBoundGeometryInput` → engine → 3D
- support station/skew/span/bridgeLength/deck width を BridgeProject から数値 binding
- WF-01 alignment-binding: IMPLEMENTED / ACTIVE
- CASE A-1/A-2/A-3 E2E PASS（山岳500m・線形変更伝播・Save/Load/Replay 決定論）
- SAMPLE（RB-001）と BRIDGEPROJECT_BOUND を明示分離。暗黙 fallback なし

## 3. Unresolved Blockers

- deck thickness / girder offsets: SUPERSTRUCTURE 入力待ち（CBDM に無し）
- 中間格点 HOLD / grid panel / cross girder: 未 binding（SAMPLE mode 専用 RB-001 定数）
- grade / crossfall: 受け渡し済み・engine 未消費
- 正式数値設計（上部工・下部工）: NOT_GRANTED / NOT_AUTHORIZED のまま
- WF-02 の依存 gating（`BINDING_PREREQUISITE_GUARD`）は PENDING のまま
  （ワークフロー全体の再配線はスコープ外）
- 未追跡ローカル資料（road-structure-ordinance）は統合対象外

## 4. Phase 3-4 readiness

**GO**

Phase 3-4（②上部工 → BridgeProject Adapter 本格実装）の前提:
1. ①→② の実データ経路が確立・E2E 検証済み ✓
2. ②の GeometrySnapshot が bound 実線形由来 ✓
3. ③下部工は前フェーズのまま無傷 ✓
4. 未実施（Phase 3-4 で対応）: ② → CBDM（BSDD/GeometrySnapshot → CBDM）逆方向 adapter、
   grade/crossfall の engine 消費、grid panel 等の共通化
