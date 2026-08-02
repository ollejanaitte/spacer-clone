# 連続桁 — スコープ凍結（Scope Freeze）

**Authority:** Step C0
**Date:** 2026-08-02
**Decision:** DEC-CG-0001（本ファイル作成時に ADOPTED）

---

## 1. 凍結対象

本垂直スライスは **連続桁の純幾何ワークフロー** に限定する。設計採用値・照査結果は一切含まない。

### 1.1 IN_SCOPE

- 直橋（曲線・斜橋なし、skew = 90°）
- 非合成 RC 床版鋼鈑桁
- 等桁高・同一鋼板桁断面（全支間共通）
- 2〜5 径間連続桁（等支間長を前提、支間長は `spanLength` で表現）
- 構造モデル長 `bridgeLength = spanLength × spanCount`（整数倍必須、既存 `resolveSpanCount` 規則を継承）
- 支承位置: 径間端＋中間支点（supportCount = spanCount + 1）
- 橋台（端部）・橋脚（中間）の簡易幾何（箱形ブロックまたは円柱近似、照査なし）
- 入力パネル → SDM 生成 → 3D ソリッド → プロジェクト save/reload → STL 出力
- 入力変更後の STALE ゲート（`generatedAt === null`、SIMPLE_SINGLE と同一契約）

### 1.2 OUT_OF_SCOPE

- 複数独立単純桁（径間ごとに独立支持、連続性なし）
- 正式静的解析・断面力計算・部材照査
- 負曲げ区間・負曲げ補剛・負曲げ照査
- 活荷重包絡・影響線・移動荷重
- 変桁高・曲線橋・斜橋（skew ≠ 90°）
- 合成桁・鋼床版・PC 床版・箱桁
- 道示 R7 未確認係数の採択
- 設計 OK/NG・利用率・正式 designStatus の昇格

## 2. 前提（S0〜S2 からの継承）

| 項目 | 継承元 | 連続桁での扱い |
|------|--------|----------------|
| 用語 | simple_single_span/field_semantics.md | 支間長・構造モデル長の表示名を維持 |
| STALE ゲート | VVS01 / S2 | 同一契約（編集で `generatedAt` クリア） |
| designStatus | 全生成物 | `NOT_AUTHORIZED` 固定 |
| spanCount 導出 | validation.ts `resolveSpanCount` | 2〜5 のみ受理（C1 でガード追加） |
| girderCount | 4〜6 本 | 変更なし |
| phase1ScopeGuard | ap00 P02 | C1 完了まで CONTINUOUS は OUT；C1 で IN へ切替 |

## 3. フェーズ境界

| 境界 | C0（本 Step） | C1 以降 |
|------|---------------|---------|
| 文書凍結 | 実施 | 変更は DEC-ID 必須 |
| コード変更 | なし | SDM/UI/3D/テスト |
| schema version | 据置（文書のみ） | C1 で additive 拡張を検討 |
| 数値ゲート | BLOCKED 維持 | 実装後も GRANTED 禁止 |

## 4. fail-closed 原則

- `spanCount` が 2〜5 以外、または `bridgeLength / spanLength` が整数でない → 生成拒否
- 連続桁選択時に SIMPLE_SINGLE 専用の内部導出（bridgeLength = spanLength）を適用しない
- 未実装フィールドはデフォルト補完せず UNRESOLVED / 拒否
- 保存データの黙示的マイグレーション禁止（明示 migration のみ）

## 5. 数値ゲート

```
NUMERIC_RELEASE_READINESS_VERDICT: BLOCKED
PHASE_B_IMPLEMENTATION_START_VERDICT: NO_GO_PENDING_HUMAN_EVIDENCE
NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED
```
