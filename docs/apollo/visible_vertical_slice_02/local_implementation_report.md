# Apollo Visible Vertical Slice 02 — ローカル実装レポート

**Status:** IN_PROGRESS
**Branch:** `feat/ap-dx-visible-vertical-slice-02`
**Baseline:** `54e3c4ff0f21d737e1e2df356653859f3ae4ddb2` (main @ VVS01 merge PR #246)
**Numeric design authorization:** NOT_GRANTED（VVS01 から維持）
**Schema version (input draft):** 1.0.0（変更なし — 追加フィールドは nullable・optional）

---

## 1. タスク概要

Visible Vertical Slice 01 の「橋梁構造入力 → SDM → 3D → 保存/再読込」を拡張し、以下を追加する。

1. 主桁断面特性（純幾何: フランジ面積、ウェブ面積、全断面積、図心、Ix、断面係数、体積）
2. 見込み数量・重量（部材本数、体積、単位体積重量はユーザー入力・既定 null）
3. ユーザー採用ワークフロー（ADOPTED のみ数値判定に影響、NOT_GRANTED 下では fail-closed）
4. 詳細 3D（補剛材・対傾構・横繋）
5. 結果 UI（断面特性表、数量・重量表、採用操作）
6. 保存/再読込（VVS01 後方互換）

設計判定（OK/NG）は行わない。バックエンド/IF3 変更なし、依存追加なし、schema version bump なし。

## 2. 事前調査の結論（Block 0 判定）

| 判定 | 値 |
|------|-----|
| VVS02_PREFLIGHT_VERDICT | PASS（worktree clean、origin 一致、gh auth OK、VVS01 main マージ済み、既存ブランチなし） |
| VVS02_INVENTORY_VERDICT | PASS（全対象モジュール読了、変更点を特定） |
| SCHEMA_VERSION_DECISION | NO_BUMP_ADDITIVE — `apolloBridgeStructureInput` は `schemaVersion: "1.0.0"` を維持。新規フィールドは全て nullable・optional で、`parseBridgeStructureInputDraft` は欠損キーを null にフォールバックし、`validateBridgeStructureInputPersistence` の許容キー集合は `BRIDGE_STRUCTURE_INPUT_FIELD_KEYS` から導出されるため追加互換。VVS01 保存データ（13 フィールド）はそのまま読込可 |
| MIGRATION_DECISION | NONE — 移行コード追加なし |
| DEPENDENCY_DECISION | NONE — package.json / lockfile 変更なし |
| CONTRACT_DECISION | NONE — `StructuralDesignModel` は `stiffeners`/`swayBracings`/`lateralBracings`/`braceMembers` 配列を既に宣言済み。VVS02 は既存型へ値を充填するのみ。断面特性は純計算モジュールで結果 UI に表示（BSDD 契約変更なし） |
| BACKEND_IF3_DECISION | NONE — backend/ 変更なし |

## 3. 設計判断（確定済み）

- 対傾構間隔: 横桁にリンク。`swayBracingInterval`（整数、N=1 既定で全横桁位置、N>=1）を中間横桁位置に配置。
- 横繋: `lateralBracingEnabled`（boolean、既定 false）。既定オフで VVS01 の 3D ベース形状を維持。
- 断面特性: `sectionProperties.ts` の純計算で算出し、Block 4 の結果 UI に表示。BSDD への格納は行わない。
- 採用: `materialDefinitions[].unitWeight` / `bridge.deck.unitWeight` の `adoptionStatus` を遷移させる。NOT_GRANTED（既定コンテキスト NOT_SELECTED）では `validateGovernedQuantity` が ADOPTED を拒否するため、採用操作は診断付きでブロック（fail-closed）。採用ヘルパーはテスト用に権限付与コンテキストを注入可能にし、ADOPTED 経路を検証可能にする。
- 補剛材 3D: 新 kind `stiffener` を非永続化ビジュアライゼーション・モデルへ追加（レンダラ + STL に分岐追加）。対傾構/横繋は既存 kind `bracing`（円筒、group `bracings`）を再利用。

## 4. 追加フィールド（apolloBridgeStructureInput）

| フィールド | 型 | 既定 | 意味 |
|-----------|----|------|------|
| stiffenerSpacing | number \| null | null | 補剛材間隔（m）。null → 補剛材なし |
| swayBracingInterval | number \| null | null | 対傾構間隔（整数、横桁 N 本ごと）。null → 対傾構なし |
| lateralBracingEnabled | boolean | false | 横繋の有無 |
| steelUnitWeight | number \| null | null | 鋼の単位体積重量（kN/m³）。null → 重量未算出 |
| rcUnitWeight | number \| null | null | RC 床版の単位体積重量（kN/m³）。null → 重量未算出 |

`BridgeStructureInputFieldDefinition` に `optional?: boolean` を追加し、optional フィールドは null を許容する（validation スキップ）。
`lateralBracingEnabled` は数値キー集合（`BRIDGE_STRUCTURE_INPUT_FIELD_KEYS`）に含めず、boolean として特別扱いする（parse/validate/persistence/ヘルパー）。

## 5. ファイル変更計画

- `frontend/src/apollo/bridgeStructure/types.ts` — フィールドキー/定義、Draft 型、`optional`、数量ステータス拡張
- `frontend/src/apollo/bridgeStructure/validation.ts` — parse/validate/persistence（boolean 対応）
- `frontend/src/apollo/bridgeStructure/sectionProperties.ts` —（新規）断面特性の純計算
- `frontend/src/apollo/bridgeStructure/quantities.ts` — 数量・重量・採用連動
- `frontend/src/apollo/bridgeStructure/generateBsdd.ts` — 二次部材エンティティ、単位重量書込
- `frontend/src/apollo/bridgeStructure/adoption.ts` —（新規）採用ヘルパー
- `frontend/src/apollo/bridgeStructure/index.ts` — エクスポート追加
- `frontend/src/apollo/components/BridgeStructureInputPanel.tsx` — 入力/結果 UI、採用ボタン
- `frontend/src/apollo/visualization/types.ts` — kind union に `stiffener` 追加
- `frontend/src/apollo/visualization/bridgeStructureSolids.ts` — 補剛材/対傾構/横繋ソリッド
- `frontend/src/apollo/visualization/designEntityBinding.ts` — UNIMPLEMENTED 縮小、バインディング検査拡張
- `frontend/src/viewer/renderers/ApolloVisualizationRenderer.ts` — `stiffener` 描画
- `frontend/src/apollo/export/apolloStlExport.ts` — `stiffener` ボックス出力・カウント
- テスト各種・ドキュメント

## 6. 検証計画（Block 5）

- `npm run typecheck`、`npm test -- src/apollo`、`npm run lint`、`git diff --check`
- 追加: sectionProperties / adoption / 新規フィールド検証 / 永続化ラウンドトリップ
- 更新: workflow / quantities / visualization / panel / importExport / stl

## 7. GUI（Block 6）

手動 GUI 確認は非視覚エージェントでは認定不可。`manual_verification_checklist.md` を作成し、全項目を PENDING とする。自動テスト（vitest、可能なら Playwright）は補助証跡に留める。VVS01 と同様、`MANUAL_GUI_VERDICT: PENDING_USER_CONFIRMATION` を維持する（PASS の捏造はしない）。
