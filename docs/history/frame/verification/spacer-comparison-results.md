# SPACER比較検証結果

<!-- DOC-AUTHORITY:START -->
> **Authority:** HISTORICAL / RETAINED EVIDENCE
> This document records prior planning, review, or executed verification. Current Frame facts are governed by [`../../../scoping/stage5_frame_analysis_scope.md`](../../../scoping/stage5_frame_analysis_scope.md), and target sequence, gaps, and gates by [`../../../planning/stage6-10/stage10_gap_migration_sequence.md`](../../../planning/stage6-10/stage10_gap_migration_sequence.md). It does not establish current or target completion.
<!-- DOC-AUTHORITY:END -->

## 概要

SPACER Cloneの解析結果と理論値との比較検証結果。

## 検証状況

**SPACER実機照合待ち**: SPACER実機出力が手元にないため、理論値との比較のみ実施。

## 検証結果一覧

### 1. 片持ち梁（Cantilever Beam）

- **状態**: 理論値検証済み
- **検証内容**: 先端集中荷重による変位・反力・モーメント
- **理論値**: δ = PL³/(3EI), R = P, M = PL
- **結果**: 理論値と一致（誤差1%以内）
- **备注**: 基本梁理論との一致を確認

### 2. 単純梁（Simply Supported Beam）

- **状態**: 理論値検証済み
- **検証内容**: 中央集中荷重による変位・反力・モーメント
- **理論値**: δ = PL³/(48EI), R = P/2, M = PL/4
- **結果**: 理論値と一致（誤差1%以内）
- **备注**: 基本梁理論との一致を確認

### 3. 門型ラーメン（Portal Frame）

- **状態**: 比較準備完了
- **検証内容**: 水平荷重による柱・梁のモーメント分布
- **理論値**: 剛性分配法による近似解
- **結果**: SPACER実機出力待ち
- **备注**: SPACER実機との比較が必要

### 4. 3D小規模骨組

- **状態**: 比較準備完了
- **検証内容**: 3方向荷重による変位・反力
- **理論値**: 有限要素法の数値解
- **結果**: SPACER実機出力待ち
- **备注**: SPACER実機との比較が必要

### 5. 支点反力確認モデル

- **状態**: 理論値検証済み
- **検証内容**: 各種支点条件での反力
- **理論値**: 静定解析による反力
- **結果**: 理論値と一致（誤差1%以内）
- **备注**: 支点条件の正しい実装を確認

### 6. 断面力確認モデル

- **状態**: 理論値検証済み
- **検証内容**: 等分布荷重・集中荷重による断面力分布
- **理論値**: 梁理論によるせん断力・曲げモーメント
- **結果**: 理論値と一致（誤差1%以内）
- **备注**: 断面力計算の正確性を確認

## まとめ

| モデル | 状態 | 誤差 |
|--------|------|------|
| 片持ち梁 | 理論値検証済み | < 1% |
| 単純梁 | 理論値検証済み | < 1% |
| 門型ラーメン | SPACER実機待ち | - |
| 3D小規模骨組 | SPACER実機待ち | - |
| 支点反力 | 理論値検証済み | < 1% |
| 断面力 | 理論値検証済み | < 1% |

## 今後の課題

1. SPACER実機出力の取得と直接比較
2. 非線形解析の検証
3. 大変位解析の検証
4. 時刻歴応答解析の詳細検証
5. 移動荷重解析の詳細検証
