# 連続桁 — 解析・照査境界

**Authority:** Step C0
**Date:** 2026-08-02

連続桁垂直スライスにおける解析・数値照査の **禁止境界** を定義する。本境界は Phase A 統合凍結および AP-00 スコープガードと整合する。

---

## 1. 許可される処理（幾何のみ）

| 処理 | 説明 |
|------|------|
| 寸法バリデーション | 正値・整数倍・配置幅チェック |
| SDM トポロジ生成 | spans / supports / mainGirders の拓扑 |
| 概算数量 | 鋼重・コンクリート体積等（既存 approximate quantities、INCOMPLETE/STALE 契約） |
| 3D ソリッド構築 | 純幾何メッシュ |
| STL エクスポート | 幾何メッシュ出力 |

## 2. 禁止される処理

| カテゴリ | 禁止内容 | 根拠 |
|----------|----------|------|
| 静的解析 | 連続桁の断面力・反力・支点反力の計算 | NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED |
| 正式照査 | 曲げ・せん断・座屈・疲労の OK/NG 判定 | Phase A 全セル NOT_AUTHORIZED |
| 負曲げ | 負曲げモーメント区間の識別・補剛・照査 | OUT_OF_SCOPE |
| 活荷重 | 影響線・包絡・车道載荷の配置解析 | OUT_OF_SCOPE |
| 合成作用 | 床版有効幅・合成断面剛性 | deckType = NON_COMPOSITE のみ |
| 非線形 | 材料・几何非線形解析 | analysisType 制限 |
| 下部工設計 | 基礎・橋脚照査・地盤反力 | 簡易幾何のみ |

## 3. designStatus 契約

```
全生成エンティティ: designStatus = "NOT_AUTHORIZED"
```

- UI に「設計完了」「照査 OK」を表示しない
- `NOT_AUTHORIZED` を `AUTHORIZED` へ昇格するコードパスを追加しない
- 連続桁実装は designStatus を変更する権限を持たない

## 4. phase1ScopeGuard との関係

| 時点 | `spanSystem = CONTINUOUS` |
|------|---------------------------|
| C0（現状） | OUT_OF_SCOPE（guard 変更なし） |
| C1 完了後 | IN_SCOPE へ切替（DEC-ID 必須、`alignment`/`girderDepth`/`deckType` 等は既存制約内） |

guard を IN にしても **数値ゲートは BLOCKED のまま**。guard は幾何ワークフローの入口判定のみ。

## 5. エラーハンドリング（fail-closed）

| 条件 | 挙動 |
|------|------|
| 径間数 2〜5 外 | 生成拒否 |
| 非整数倍支間 | 生成拒否（`resolveSpanCount === null`） |
| 未許可解析 API 呼び出し | 拒否または no-op（実装時） |
| 道示係数の暗黙採用 | 禁止 |

## 6. 将来拡張の境界

正式解析を追加する場合は以下が **すべて** 必要:

1. `NUMERIC_DESIGN_AUTHORIZATION: GRANTED`（現状 NOT_GRANTED）
2. Phase A 該当セルの個別 GRANTED + DEC-ID
3. 独立 Golden 検証・人間証跡
4. 本ファイルの改訂と scope_freeze の再凍結

## 7. 数値ゲート

```
NUMERIC_RELEASE_READINESS_VERDICT: BLOCKED
PHASE_B_IMPLEMENTATION_START_VERDICT: NO_GO_PENDING_HUMAN_EVIDENCE
NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED
```
