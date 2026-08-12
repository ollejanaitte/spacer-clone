# Phase 6-01 Step D: Persistence完全設計（凍結案）

## 1. 目的

旧ブラウザdownload/uploadから新PDC（Auto Save / restart restore / .spacerproj）への移行を完全凍結する。
必須縦断とcanonical/derived/transient/digest規約を確定する。

- baseline: `d700edd707958db28ee6ada9f5d217bf3dced01e`
- 日付: 2026-08-13

## 2. 必須縦断（凍結）

```
Create（業務/Project作成）
  ↓
Phase 4 / 5 Handoff取得（Bridge Layout / Superstructureから）
  ↓
Substructure生成（SubstructureDocument作成・canonical）
  ↓
Edit（A1/A2/P1..Pn・Abutment/Pier/Foundation設定）
  ↓
Auto Save（modules.substructure.data.substructureDocument）
  ↓
アプリ完全終了
  ↓
restart
  ↓
restore（project.json読込・strict parse）
  ↓
derived再生成（Support Handoff / Bearing/Reaction Handoff）
  ↓
Geometry再生成（配置→3D）
  ↓
Handoff再検証（derived一致・integrity）
  ↓
.spacerproj export（manifest+checksum）
  ↓
import
  ↓
再復元・integrity check
```

## 3. 保存対象（凍結）

| 対象 | 保存 | 備考 |
|---|---|---|
| SubstructureDocument（canonical入力・reference群・status） | **保存** | modules.substructure.data 内 |
| supportReferences / bearingReactionReferences / **bearingSeatReferences**（derived） | **transient（非保存）** | restore時にHandoff再生成＋一致検証 |
| geometryReference（fingerprint） | 保存（fingerprintのみ） | 本体は再生成 |
| designResults / quantityResults | digestのみ保存 | 再計算で再現 |
| validation | 直近のみ保存 | 再検証で上書き |

## 4. canonical / derived / transient（凍結）

- canonical: supports / abutments / piers / footingConfigurations / foundationConfigurations / pileConfigurations / designInputs / status
- derived: supportReferences / bearingReactionReferences / bearingSeatReferences / geometryReference / designResults / quantityResults
- transient: derived arrays（永続化DTOから除外）

## 4.5 PersistedSubstructureDocumentDTO（凍結）
- runtime型（designResults/quantityResults/validationが必須実体）と永続化DTOを分離
- `PersistedSubstructureDocumentDTO` = canonical入力 + reference群 + status + digest群（design/geometry/validation digest）
- parse/restore時にDTO→runtime変換を明記（derived再生成・結果再計算）

## 5. digest / integrity（凍結）

- geometry fingerprint digest対象: **全geometry canonical入力（support寸法/footing/pile/bearing）+ upstream reference version**（fingerprintが配置変更・寸法変更・upstream変更で更新）
- **正規化digest**: Handoffのvolatile field（generatedAt等）を除外した正規化hash（restartごとの不一致回避）
- design digest: runDesign結果のhash（reload時再計算と突合・STALE検出）
- integrity: 再生成Handoffのderived一致（不一致→STALE・fail-closed）

## 6. schema migration（凍結）

- SubstructureDocument v0.1.0（新規）
- PDC `PROJECT_MIGRATIONS`: modules.substructure追加migration（旧project空module初期化）
- 未知schemaVersion → reject（fail-closed）
- 旧substructure-project.json（download/upload形式）: Phase 6-02でimport adapter（旧→新Document）を提供（任意）

## 7. invalid / partial / crash recovery（凍結）

- invalid document: parse失敗→module invalid状態（validationErrors保持・破棄しない）
- partial document: MISSING許容（support未設定等）・write reject条件はfail-closed規則通り
- crash recovery: 既存next/persistence（一時ファイル+最終書込・.spacerbakローテーション5）適用
- autosave timing: 既存persistentProjectManager（write→enqueueSave・serialized）

## 8. backward compatibility（凍結）

- 旧project（modules.substructure空）: 読込可（空module初期化）
- 旧download/upload JSON: import adapterで受領（正本は新Document）
- 旧model.ts（v0.2.0）: canonical型として互換

## 9. 既存資産の再利用（Phase 6-02）

| 資産 | 利用 |
|---|---|
| next/persistence（filesystem/package/IPC） | 新PDC永続化 |
| planning/persistence（serializeSubstructureProject） | 旧形式import adapter（参考） |
| adapterPersistence | 旧envelope互換（import） |
| validateSubstructureProject | 検証踏襲 |

## 10. テスト（T6-PER系）

- T6-PER-001: save→restart→restore（SubstructureDocument復元）
- T6-PER-002: derived再生成（Handoff一致）
- T6-PER-003: Geometry再生成（fingerprint一致）
- T6-PER-004: .spacerproj round-trip
- T6-PER-005: digest突合（STALE検出）
- T6-PER-006: invalid/partial module（reject/invalid状態）
- T6-PER-007: migration（旧project空module初期化）
- T6-PER-008: 旧JSON import adapter
