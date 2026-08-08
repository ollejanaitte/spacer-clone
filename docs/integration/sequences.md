# 連携シーケンス（CASE A / CASE B）

> **Phase:** P4
> 凡例: **[必須入力]** / **[自動導出]** / **[要ユーザー確認]** / **[Fail-Closed]**

## CASE A: ①道路線形 → BridgeProject → ②上部工 → BridgeProject → ③下部工

```
①LINER → domainDraft → [Alignment→BP Adapter] → CBDM.alignments (CONFIRMED/DERIVED)
   → ② [CommonModelGeometryInputAdapter 拡張] → GeometryEngineInput(数値幾何)
   → GeometrySnapshot → BSDD (bridgeGeometry, superstructure)
   → Analysis(grillage) → [解析結果] → BFAD result resource
   → ②→BP: sharedFacts.supports / reactions
   → ③ [Substructure BP Adapter] → Support[] (SupportPlacementEngine 実線形配置)
   → 下部工設計 (A-01 Calculation Adapter)
```

| Step | 必須入力 | 自動導出 | 要ユーザー確認 | Fail-Closed |
|------|----------|----------|----------------|-------------|
| ①→BP | 線形要素・縦断・横断・幅員（①ユーザー入力） | station→XYZ/azimuth/grade/crossfall（DERIVED） | 線形の確認 | 線形未定義 → ②開始不可 |
| BP→② | span/support/girder の数値幾何 | 支持線配置・主桁線・格点（DERIVED） | 中間格点（HOLD の解決） | 中間格点 HOLD のまま配置不可 |
| ②→BP | 解析結果（**認証後**） | support 系・反力（DERIVED） | 反力の認証確認 | 反力 NOT_AUTHORIZED → ③の照査不可 |
| BP→③ | sharedFacts.supports / reactions | pier/abutment 配置座標（SupportPlacementEngine） | 下部工形状（サンプル既定値を置換） | 反力不足 → 設計開始不可 |

## CASE B: ②上部工サンプル → BridgeProject 初期生成 → ①復元・補完 → BridgeProject 整合 → ②整合確認 → ③

```
②sample (BSDD/CBDM fixture)
   → BP初期生成: bridgeLength/spans/supports を CONFIRMED で共有
   → ①復元: 実線形を reconstruction で再現
       - DERIVED: station→XYZ 等（sample から決定論的に導出）
       - INFERRED: girder offset・縦横断勾配等（推定、inferenceBasis 必須）
       - MISSING: 線形要素・縦断 profile（理由付き欠落）
   → BP整合: reconstruction.entries を検証（CONFIRMED 昇格禁止）
   → ②整合確認: 復元線形で GeometryEngine 再実行 → snapshot fingerprint 比較
   → ③: CASE A と同じ手順
```

| Step | 必須入力 | 自動導出 | 要ユーザー確認 | Fail-Closed |
|------|----------|----------|----------------|-------------|
| ②→BP初期 | BSDD/CBDM fixture | 橋長・支間・支持・斜角（CONFIRMED） | サンプルの信頼性 | sample が未認証 → NOT_AUTHORIZED として記録 |
| BP→①復元 | 復元対象 field の source | DERIVED/INFERRED 値 | **INFERRED の昇格確認（HCR）** | MISSING の field は補完不可（理由表示） |
| ①→BP整合 | reconstruction.entries | status 検証 | 復元線形の最終確認 | INFERRED を CONFIRMED に自動昇格させない |
| ②整合確認 | 復元線形（CBDM.alignments） | GeometryEngine 再実行・fingerprint | 差分の判断 | fingerprint 不一致 → 整合待ち |
| →③ | 反力（認証後） | 配置座標 | 下部工形状 | 反力 NOT_AUTHORIZED → ③不可 |

## 各段階の status 遷移

```
①線形:  CONFIRMED(入力) → DERIVED(評価値)
②復元:  CONFIRMED(sample由来) / DERIVED(導出) / INFERRED(推定) / MISSING(欠落) / DEFERRED(保留)
解析:   NOT_AUTHORIZED → (認証) → CONFIRMED
③設計:  NOT_AUTHORIZED (A-01 TEST/MOCK は正式値に昇格しない)
```

## 統合の E2E 判定基準

- CASE A: ①で線形定義 → BP → ②で snapshot 生成 → BP → ③で Support[] 生成（実線形配置）。
  反力が NOT_AUTHORIZED の間は、③の「照査」は fail-closed し「モデル生成」のみ可能。
- CASE B: ②sample → BP → ①で reconstruction（DERIVED/INFERRED/MISSING を正しく分類）→
  ②整合確認（fingerprint）→ ③。reconstruction に CONFIRMED 誤用がないこと。
