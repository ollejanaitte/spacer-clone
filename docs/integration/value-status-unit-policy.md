# value / source / status / unit / provenance 方針

> **Phase:** P3
> **適用範囲:** BridgeProject 共有値・CBDM ResolvedValue・各 owner 文書の値

## 1. 基本原則

1. **どの値にも unit を付ける**（数値の場合）。
2. **どの値にも status を付ける**。null だけでは不十分。欠落には理由（stateReason）を付ける。
3. **復元・導出・推定を確認済みと誤認させない**。
4. **認証ゲートは文書レベル**（numericDesignAuthorization / designStatus）と値レベル
   （NOT_AUTHORIZED）を使い分ける。
5. **再計算は決定論的**で、source of truth を再定義しない。

## 2. status 語彙

### BridgeProject 共有値 / reconstruction（6値）

| status | 意味 | 使用例 | 下流での扱い |
|--------|------|--------|--------------|
| `CONFIRMED` | 原本/入力値として確認済み | 橋長・支間（sample/golden 由来） | そのまま使用可 |
| `DERIVED` | 現行モデルから決定論的に導出 | station→XYZ、支持線配置 | 導出元が変わるまで有効 |
| `INFERRED` | 推定（間接情報から復元） | ②サンプルからの主桁 offset 復元 | 人間確認推奨・昇格禁止 |
| `MISSING` | 不足（理由必須） | 縦断 profile なし | 使用前に解決必須（fail-closed） |
| `DEFERRED` | 保留（理由必須） | 曲線近似・skew deferred | 未解決として扱う |
| `NOT_AUTHORIZED` | 未認証（数値設計） | 支点反力・設計照査値 | **使用禁止**（fail-closed） |

### CBDM ResolvedValue（9値 = 既存6 + 追加3）

既存: `CONFIRMED` / `HUMAN_CONFIRMATION_REQUIRED` / `CONFLICT` /
`HOLD_INSUFFICIENT_SOURCE` / `NOT_APPLICABLE` / `NOT_AVAILABLE`
追加（Integration additive）: `DERIVED` / `INFERRED` / `DEFERRED`

### 語彙マッピング

| BridgeProject | CBDM ResolvedValue | 備考 |
|---------------|--------------------|------|
| CONFIRMED | CONFIRMED | 一致 |
| DERIVED | DERIVED | 追加 |
| INFERRED | INFERRED | 追加 |
| MISSING | HOLD_INSUFFICIENT_SOURCE / NOT_AVAILABLE | 理由付き欠落 |
| DEFERRED | DEFERRED | 追加 |
| NOT_AUTHORIZED | （文書レベル）numericDesignAuthorization / BSDD designStatus | 値状態ではなく認証ゲート |

## 3. authority（数値の権威）

- `PLACEHOLDER` — 仮値。下流使用不可。
- `USER_PROVIDED_UNVERIFIED` — ユーザー入力・未検証。
- `SOURCE_TRACED` — 原本/golden 追跡済み。
- `ADOPTED` — 承認済み（正式値）。
- BSDD の `GovernedQuantity.adoptionStatus`（PENDING/PLACEHOLDER/UNKNOWN/ADOPTED）は
  上記へのマッピングを持つ（`governedQuantity.ts:52-64`）。

## 4. unit 方針（canonical）

| 次元 | canonical | source/display |
|------|-----------|----------------|
| 長さ | m | mm（3D/図面）、ft/in（将来） |
| 角度 | rad | deg（表示） |
| 力 | kN | N |
| モーメント | kN·m | kN·cm 等 |
| 応力度 | kN/m² | kPa/MPa |
| 勾配 | ratio（縦断 grade） / %（横断勾配 crossfall） | UI 表示 % |
| 温度 | K | °C |

**規約:** `unit-context.schema.json` の enum に従う。source unit は常に保持し、
silent conversion 禁止（`unit-context.schema.json` `signConventions.crossfall`）。

## 5. 座標系方針

- canonical: **right-handed, x-longitudinal / y-transverse / z-up**、station (m)
  は alignment に沿い offset は右正（`coordinate-context.schema.json`）。
- 道路線形の global frame（x-east/y-north/z-up）と橋梁 local frame
  （x-longitudinal/y-transverse/z-up）は **両方とも coordinate-context で明示**。
- 3D 表示は runtime 境界でのみ y-up 変換（`threeCoords.ts` / `threeFactory.ts`）。
  **契約値は変換しない**。
- 斜角 skew は rad 正準・deg は sourceUnit。符号規約は
  `coordinate-context.stationConvention` に統一する。

## 6. provenance 方針

- 各文書: `provenance.schema.json`（createdAt/createdBy/updatedAt/updatedBy/producer）。
- 各改訂: `revision-metadata.schema.json`（revisionId チェーン、contentChecksum）。
- 各値: `BridgeProjectValue.updatedAt` + `generatedBy` + `sourceReference`
  （または CBDM `ResolvedValue.sourceRefs/goldenId`）。
- 転送・適用: `transfer-record.schema.json`（before/after、決定、conflict）。
- 数値の再計算は決定論的（fingerprint で stale 検出、`dirtyFingerprint.ts`）。

## 7. fail-closed 条件（値の扱い）

| 状態 | 下流ツールの挙動 |
|------|------------------|
| NOT_AUTHORIZED の設計値 | 計算・公開・照査に使用不可。警告＋ブロック |
| MISSING / HOLD の必須入力 | その工程は開始不可（reason 表示） |
| INFERRED の復元値 | ①へ戻す前に人間確認（HCR または CONFLICT 解決） |
| DEFERRED の値 | 未解決扱い。自動昇格禁止 |
| CONFLICT 未解決 | 選択されていない candidate は使用不可 |
