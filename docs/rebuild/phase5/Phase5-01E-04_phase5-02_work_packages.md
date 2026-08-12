# Phase 5-01 Step E-04: Phase 5-02 Work Package設計（凍結案）

## 1. 目的

Phase 5-02「上部工一括実装・検証・Completion Gate」を内部Work Package（WP）に分割し、
files・dependencies・acceptance criteria・tests・PR単位・rollback boundary・evidenceを確定する。

- baseline: `242667fce9532daa35c1240847305559bea911fb`
- 日付: 2026-08-12

## 2. WP一覧・依存関係（凍結）

```
WP-A（SuperstructureDocument/PDC） ← 最基盤
  └─ WP-B（Bridge Layout→Adapter/Binding）
       └─ WP-C（Geometry Engine/3D）
            ├─ WP-D（Girder/Deck/Cross Beam/Bearing）
            └─ WP-E（Load Model）
                 └─ WP-F（Analysis/solver）
                      ├─ WP-G（Design Check）
                      └─ WP-H（Bearing/Reaction Handoff）
WP-I（Persistence/.spacerproj） ← WP-A/Cと並行可
WP-J（Reference Bridge/E2E/Completion Gate） ← 全ての後
```

## 3. 各WP詳細（凍結）

### WP-A: SuperstructureDocument / PDC

- files: `frontend/src/next/modules/superstructure/` 新規
  - `superstructureModule.ts`（createInitialModuleData・isSuperstructureData）
  - `superstructureModuleAdapter.ts`（read/write/has）
  - `superstructureValidation.ts`（validateSuperstructureData）
  - `superstructureDocumentDomain.ts`（buildSuperstructureDocument）
  - `superstructureTypes.ts`（Contract型・Phase5-01A-01準拠）
  - `superstructureModule.test.ts`
- dependencies: なし（bridgeLayout module adapter読込のみ）
- acceptance: Contract（A-01）の全fieldがbuild可能・fail-closed規則動作
- tests: T5-CON/SCH/VAL/PAR群
- PR: 1本（docsなし・実装）
- rollback boundary: module未登録状態へ戻せる（新moduleのみ追加）

### WP-B: Bridge Layout → Adapter / Binding

- files: `superstructureFacts.ts`（新adapter）・`superstructureBindingNew.ts`（新binding）
  - 既存`superstructureAdapter.ts`/`superstructureBinding.ts`は**変更しない**（追加のみ）
- dependencies: WP-A
- acceptance: Handoff→shared facts→GeometryEngineInput（B-01準拠）・fail-closed不変条件
- tests: T5-ADP/BND
- PR: 1本
- rollback: 新関数未使用状態へ戻せる

### WP-C: Geometry Engine / 3D

- files: `superstructureSceneBuilder.ts`（新3D・snapshot→solids）
  - 既存`engine.ts`/`snapshot3d.ts`/`bridgeStructureSolids.ts`はKEEP利用（変更しない）
  - `NextApp.tsx` module dispatch追加・`SuperstructureModuleShellPage.tsx`（新）
- dependencies: WP-B（snapshot入力）
- acceptance: GeometryEngineInput→snapshot→3D（C-01/C-02準拠）・renderCoordinate・ID規則
- tests: T5-GEO/COO/CUR/SKW/3D
- PR: 2本（Geometry→3D）
- rollback: 3D builder未使用状態へ

### WP-D: Girder / Deck / Cross Beam / Bearing

- files: `superstructureComponents.ts`（断面性能・配置生成）
  - 既存`sectionProperties.ts`/`members.ts`/`deck.ts`はKEEP利用
- dependencies: WP-C
- acceptance: girder/deck/crossBeam/crossFrame/bearing配置（C-01準拠）
- tests: T5-GEO/BRG関連
- PR: 1本
- rollback: 配置生成の有効/無効切替

### WP-E: Load Model

- files: `superstructureLoadModel.ts`（死荷重case生成）
  - 既存`appurtenanceHaunchLoadModel.ts`は使用しない（REFERENCE）
- dependencies: WP-D（断面・床版）
- acceptance: DL-STRUCTURAL/DL-DECK生成・LL空（D-01準拠）
- tests: T5-LD
- PR: 1本
- rollback: load未設定状態

### WP-F: Analysis / solver

- files: `superstructureAnalysisAdapter.ts`（SuperstructureDocument→grillage input）
  - 既存`grillageModel.ts`/`backend engine/grillage.py`/`solver.py`はKEEP利用
- dependencies: WP-C/WP-E
- acceptance: model生成→解析→結果（D-01準拠・符号規約・NOT_GRANTEDゲート）
- tests: T5-AN
- PR: 1本
- rollback: 解析実行フラグOFF

### WP-G: Design Check

- files: `superstructureBasicChecks.ts`（基本照査6種）
  - `designConditions.ts`（REFERENCE接続インターフェース）
- dependencies: WP-F
- acceptance: 断面性能/曲げ/せん断/たわみ/横桁/支承の基本照査（D-01準拠）・自動昇格禁止
- tests: T5-DC
- PR: 1本
- rollback: check結果表示のみ（採用は人手）

### WP-H: Bearing / Reaction Handoff

- files: `superstructureHandoff.ts`（新Handoff生成）
  - 既存`support-interface`/`superstructureEnvelope.ts`/`superstructureInterface.ts`はKEEP利用
- dependencies: WP-F
- acceptance: Phase 6 Handoff Contract（D-02準拠）・support-interface互換
- tests: T5-BRG/RXN
- PR: 1本
- rollback: Handoff生成フラグOFF

### WP-I: Persistence / .spacerproj

- files: 既存`next/persistence`へのsuperstructure対応（module genericは既存で対応）
  - migration追加・digest方針（E-01準拠）
- dependencies: WP-A（module存在）
- acceptance: save→restore・restart再生成・.spacerproj round-trip
- tests: T5-PER/AUT/RST/PKG
- PR: 1本
- rollback: 旧persistence動作維持

### WP-J: Reference Bridge / E2E / Completion Gate

- files: E2E spec・Completion Gate UI（SuperstructureModuleShellPage内）・evidence
- dependencies: 全WP
- acceptance: RB比較（E-02）PASS・縦断E2E（T5-E2E）・Completion Gate（Integrity）
- tests: T5-RB/E2E/ELE/REG
- PR: 1本
- rollback: Gate表示のみ（実判定はWP完了時）

## 4. GitHub PR / merge 方針（凍結）

- 各WPを1〜2PRでmainへmerge（Phase 5-02内・Step実行）
- 各PR: 実装＋tests＋evidence（screenshot）
- merge後: local main / origin / rebuild/integrated-system 同期

## 5. Completion Gate 判定（WP-J・凍結）

- [ ] SuperstructureDocument valid（全fail-closed通過）
- [ ] derived一致（Handoff・fingerprint・digest）
- [ ] Reference Bridge（E-02）既定項目PASS
- [ ] 全T5群PASS（E-03）
- [ ] Electron smoke・E2E PASS
- [ ] 既存regression（T5-REG）PASS

## 6. Evidence（凍結）

- WP毎: tests PASSログ＋screenshot（docs/rebuild/phase5/evidence/）
- Final: Phase 5-02 Final Report（Phase 5-02完了時）
