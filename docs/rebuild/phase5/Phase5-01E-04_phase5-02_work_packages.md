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
       └─ WP-C1（Geometry Engine基盤: GeometryEngineInput→snapshot）
            ├─ WP-D（Girder/Deck/Cross Beam/Bearing配置） ← WP-C1依存（配置はsnapshotを前提）
            │    └─ WP-C2（3D Viewer: 統合シーン＋Superstructure表示） ← WP-D依存（配置から表示）
            └─ WP-E（Load Model）
                 └─ WP-F（Analysis/solver）
                      ├─ WP-G（Design Check）
                      └─ WP-H（Bearing/Reaction Handoff）
WP-I（Persistence/.spacerproj） ← WP-A依存・WP-C1（restart geometry再生成）・WP-F（digest）依存
WP-J（Reference Bridge/E2E/Completion Gate） ← 全ての後
```

**依存順の明確化（Sol review反映）**:
- WP-Cは **Geometry Engine基盤（WP-C1）** と **3D Viewer（WP-C2）** に分割。
  WP-C1（snapshot生成）→ WP-D（配置）→ WP-C2（3D表示）の順。
  「3D部材生成が配置生成より先」にならない
- WP-Iはrestart時のGeometry再生成（WP-C1）とdigest突合（WP-F）に依存する

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

### WP-C1: Geometry Engine基盤

- files: `superstructureBindingNew.ts`（新binding）呼び出しの集約・snapshot生成
  - 既存`engine.ts`/`contracts.ts`はKEEP利用（変更しない）
- dependencies: WP-B
- acceptance: SuperstructureDocument→GeometryEngineInput→GeometrySnapshot（C-01準拠）・fail-closed不変条件
- tests: T5-BND/GEO/COO/CUR/SKW
- PR: 1本
- rollback: 新binding未使用状態へ戻せる

### WP-C2: 3D Viewer（統合シーン＋Superstructure表示）

- files: `superstructureSceneBuilder.ts`（新3D・snapshot→solids）・
  `NextApp.tsx` module dispatch追加・`SuperstructureModuleShellPage.tsx`（新）
  - 既存`snapshot3d.ts`/`bridgeStructureSolids.ts`はKEEP利用（変更しない）
- dependencies: WP-D（配置生成済み）
- acceptance: 統合シーン（Road+Terrain+Existing+BL+Superstructure）・renderCoordinate・ID規則（C-02準拠）
- tests: T5-3D
- PR: 1本
- rollback: 3D builder未使用状態へ

### WP-D: Girder / Deck / Cross Beam / Bearing

- files: `superstructureComponents.ts`（断面性能・配置生成）
  - 既存`sectionProperties.ts`/`members.ts`/`deck.ts`はKEEP利用
- dependencies: WP-C1（snapshot生成後・配置はsnapshot由来）
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
  - migration追加・digest方針（E-01準拠）・derived transient方針
- dependencies: WP-A（module存在）・**WP-C1（restart時のGeometry再生成）**・**WP-F（digest突合）**
- acceptance: save→restore・restart再生成（fingerprint）・.spacerproj round-trip・derived非永続化
- tests: T5-PER/AUT/RST/PKG/DER/MIG/DIG/CRC
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
