# 05 BridgeProject Protected Core 保存境界（P5）

> Phase 3-9 確定 Protected Core を**破壊しない**範囲で BusinessProject に配置する設計。
> 根拠: Step4-0 `protected-core.csv` + `bridgeProject/cbdmDocument.ts` +
> `docs/integration/bridge-project-contract.md`

## 0. 変更禁止リスト（そのまま守る）

| Core | 実装 | 保存方式 |
|------|------|----------|
| CASE A（①→②→③→3D→Save/Load/Replay） | `bridgeProject/alignmentAdapter.ts`, `bridgeGeometryGenerator.ts` | canonical round-trip |
| CASE B（②sample→①復元） | `bridgeProject/alignmentReconstruction.ts`, `attachReconstructionToManifest` | canonical + status/provenance |
| BridgeProject schema/validator/manifest | `contracts/bridgeProject.ts`, `runtime/schemas/bridgeProject.ts`, `validateBridgeProject` | canonical JSON |
| provenance / status / revision / cycle guard | `contracts/provenance.ts`, `revision.ts`, `value-status-unit-policy.md` | canonical |
| NOT_AUTHORIZED / fail-closed | `bridgeProject/validation.ts`, `superstructureAdapter.ts`, `substructureBinding.ts` | validator は昇格拒否 |
| Save/Load/Replay（canonical 決定論） | `cbdmDocument.ts serialize/parse*` | deterministic |
| Main3D（integratedScene3d） | `integratedScene3d.ts`, `viewer.tsx` | snapshot payload |
| Calculation Adapter（A-01） | `substructure/design/calculationAdapter.ts` | domain↔engine境界 |

## 1. BusinessProject が BridgeProject に行うこと（許容）

- **所有**: BusinessProject は `bridges/<bridgeId>/` フォルダを**1子Entity**として所有。
- **参照**: BusinessProject manifest は `bridges/<bridgeId>/manifest.json` を
  `DocumentReference(kind=bridge-project, id=manifest.documentId, revision, checksum, uri)` で参照。
- **配置**: BridgeProject の canonical 4 文書をフォルダ内に**そのまま**配置
  （`cbdm.json` / `manifest.json` / `superstructure.json` / `substructure.json`）。
- **整合**: BusinessProject 読込時、各 BridgeProject manifest を `parseBridgeProjectManifest` +
  `validateBridgeProject`（fail-closed）で検証。checksum 不一致 → **fail-closed**（橋1つを
  孤立させず警告）。

## 2. BusinessProject が BridgeProject に**しない**こと（禁止）

- BridgeProject schema / manifest / CBDM のフィールドを追加・改変・統併しない。
- BusinessProject manifest に BridgeProject 内部事項（supports/alignments/model3D）を**埋め込まない**。
  （`bridgeProjectContract.md` §6「ドメイン payload の埋め込み禁止」と同じ原則）
- BridgeProject の `references.roadDesign` を BusinessProject レベルで勝手に置き換えない。
- CASE A/B reconstruction / cycle guard / `CONFIRMED` 昇格を BusinessProject 層で肩代わりしない。

## 3. 整合確認（Case 3 / Case 12 対策）

- **Case 3**: Bridge 002 だけ更新 → `bridges/<bridgeId>/manifest.json` を atomic 再作成
 （manifest.revisionId +1, checksum 再算）。他 Bridge / Road / BusinessProject manifest は**再書込しない**。
  → BusinessProject manifest は対象 BridgeProject の `DocumentReference.revisionId/checksum`
  だけ更新。他参照は一定。
- **Case 12**: 1子 JSON 破損 → その doc（またはその bridge folder）を fail-closed で孤立。
  BusinessProject manifest は他参照を保たず開く。repair は import-migration または
  BridgeProject canonical 再生成で対処（Core 変更なし）。

## 4. 将来 extension（実装しない・記録のみ）

1. `BridgeProject.references.alignmentRefs[]`（配列） — 複数線形参照。
   現行 `references.alignment`（roadDesign doc ref）を拡張。**実装時**: additive。
2. `BusinessProject` が `bridges/<bridgeId>/` を指す代わりに、bridge-project manifest に
   BusinessProject ref を逆参照させる（read-only）。Core に書き込まない。
3. BridgeProject↔RoadSection 間の `transfer-record` リンクを BusinessProject manifest で
   集約する（現行 `transferRecordRefs` 再利用）。

→ 以上は `EXTENSION_PROPOSALS` に転記。**今回実装しない**。
