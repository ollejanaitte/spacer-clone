# 連続桁 — 手動確認チェックリスト

**Authority:** Step C0（文書凍結）/ Step C4（検証・チェックリスト拡充）
**Date:** 2026-08-02
**MANUAL_GUI_VERDICT:** `PASS`

> 対傾構 V 型・上下横構分離（PR #280）および PR #279 bounds 回帰について、ユーザー手動 GUI 確認済み。
> 下記のうち **PASS** は確認済み、**PENDING** は未確認のまま残す。PASS を捏造しない。
## 1. 構造形式・径間数

| # | 確認項目 | 期待値 | 状態 |
|---|----------|--------|------|
| MV-CG-01 | 構造形式選択 | 単径間 / 連続桁を切替可能 | PENDING |
| MV-CG-02 | CONTINUOUS 2 径間 | [30,30] 等で生成・3D 更新 | PENDING |
| MV-CG-03 | CONTINUOUS 3 径間 | [30,35,30] サンプル同等 | PENDING |
| MV-CG-04 | CONTINUOUS 5 径間 | [20,25,30,25,20] 等で受理 | PENDING |
| MV-CG-05 | 径間数入力 | 2〜5 のみ受理 | PENDING |
| MV-CG-06 | 支間長・構造モデル長 | `bridgeLength = Σ span.length` | PENDING |
| MV-CG-07 | 非整数倍拒否 | 割り切れない組合せで生成拒否 | PENDING |
| MV-CG-08 | SIMPLE_SINGLE 回帰 | 単径間フローが S2 同等 | PENDING |

## 2. 支間・支点操作

| # | 確認項目 | 期待値 | 状態 |
|---|----------|--------|------|
| MV-CG-09 | 支間追加 | 径間数増加・レイアウト再計算 | PENDING |
| MV-CG-10 | 支間削除 | 径間数減少・レイアウト再計算 | PENDING |
| MV-CG-11 | 支点位置 | cumulative station [0, L1, L1+L2, …] | PENDING |
| MV-CG-12 | 橋台表示 | 端部 2 箇所（abutment） | PENDING |
| MV-CG-13 | 橋脚表示 | 中間 `spanCount - 1` 箇所（pier） | PENDING |

## 3. 生成・STALE・NOT_AUTHORIZED

| # | 確認項目 | 期待値 | 状態 |
|---|----------|--------|------|
| MV-CG-14 | 構造生成 | 主桁・支点・床版・3D 更新 | PENDING |
| MV-CG-15 | サンプル後 STALE | 自動生成なし、`generatedAt` null | PENDING |
| MV-CG-16 | 入力変更 STALE | 生成後編集で STALE、BSDD 可視化停止 | PENDING |
| MV-CG-17 | 再生成 | STALE 解除、3D 復帰 | PENDING |
| MV-CG-18 | NOT_AUTHORIZED | 設計ステータスが正式採用にならない | PENDING |

## 4. 連続主桁・部材 3D

| # | 確認項目 | 期待値 | 状態 |
|---|----------|--------|------|
| MV-CG-19 | 連続主桁 3D | 径間継ぎ目にギャップなしの貫通表示 | PENDING |
| MV-CG-20 | 主桁 segment | 支点ごとに segment 分割（同一 MainGirder） | PENDING |
| MV-CG-21 | 横桁 | 支点横桁（atSupport）と支間内横桁の区別 | PENDING |
| MV-CG-22 | 補剛材 | 既存規則どおり表示（該当時） | PENDING |
| MV-CG-23 | 対傾構 | 既存規則どおり表示（該当時） | PENDING |
| MV-CG-24 | 横構 | 既存規則どおり表示（該当時） | PENDING |
| MV-CG-25 | 床版 | 全長 1 ソリッド | PENDING |

## 5. 保存・STL・互換

| # | 確認項目 | 期待値 | 状態 |
|---|----------|--------|------|
| MV-CG-26 | save/reload | 入力・SDM・generation current 復元 | PENDING |
| MV-CG-27 | STL 出力 | 三角面 > 0 | PENDING |
| MV-CG-28 | レガシー SIMPLE | `bridgeSystem` 欠落で単径間として開く | PENDING |
| MV-CG-29 | VVS01/S2 互換 | 既存プロジェクト破綻なし | PENDING |

## 6. invalid input（負の確認）

| # | 確認項目 | 期待値 | 状態 |
|---|----------|--------|------|
| MV-CG-30 | 重複 span ID | バリデーション拒否 | PENDING |
| MV-CG-31 | SIMPLE_MULTIPLE | fail-close | PENDING |
| MV-CG-32 | 不正レイアウト | 生成拒否・エラー表示 | PENDING |

## 7. 禁止境界（負の確認）

| # | 確認項目 | 期待値 | 状態 |
|---|----------|--------|------|
| MV-CG-33 | 断面力・利用率 | 表示されない | PENDING |
| MV-CG-34 | 負曲げ・活荷重 UI | 存在しない | PENDING |
| MV-CG-35 | 正式照査 OK | 出力されない | PENDING |

## 8. 表示境界・対傾構（2026-08-02 GUI 発見不具合の回帰確認）

発見症状:
1. 対傾構斜材が主桁間・床版範囲外へ飛び出すように見える
2. 骨組み橋軸延長が Apollo ソリッドより長く見える（200m サンプル + 連続桁サンプル生成時）

**PR279_BOUNDS_MANUAL_REGRESSION:** `PASS`（ユーザー確認済み）

| # | 確認項目 | 期待値 | 状態 |
|---|----------|--------|------|
| MV-01 | 5径間連続橋を表示 | 表示可能 | PASS |
| MV-02 | Demo Shape OFF で対傾構が隣接主桁間に収まる | outer girder centers 内 | PASS |
| MV-03 | 平面表示で最外主桁外側へ斜材が出ない | 外側 bay なし | PASS |
| MV-04 | 正面表示で対傾構端点が主桁ウェブ高さへ接続 | girder center Z ± web/2 | PASS |
| MV-05 | 側面表示で骨組み始終点と Apollo 主桁始終点が一致 | frame X = solid X | PASS |
| MV-06 | Demo Shape ON / Scale 1 | デモ表示のみ、全長外挿なし | PASS |
| MV-07 | Demo Shape ON / Scale 5 | 同上 | PASS |
| MV-08 | Animation ON/OFF | 不正 overlay なし | PASS |
| MV-09 | fit-to-view | 意図しない延長でズーム暴れない | PASS |
| MV-10 | STL出力 | 三角面 > 0 | PASS |
| MV-11 | SIMPLE_SINGLE回帰 | 単径間 bounds 一致 | PASS |
| MV-12 | save/reload | 同期済み frame が復元 | PASS |

## 8b. 対傾構 V型・上下横構分離（2026-08-02 追記）

手動確認 verdict（ユーザー確認済み）:
- `SWAY_BRACING_MANUAL_VERDICT: PASS`
- `UPPER_LATERAL_BRACING_MANUAL_VERDICT: PASS`
- `LOWER_LATERAL_BRACING_MANUAL_VERDICT: PASS`
- `SAVE_RELOAD_MANUAL_VERDICT: PASS`
- `STL_MANUAL_VERDICT: PASS`

| # | 確認項目 | 期待値 | 状態 |
|---|----------|--------|------|
| MV-BR-01 | 3径間連続桁生成 | [30,35,30] 表示 | PASS |
| MV-BR-02 | 正面で対傾構がV型/三角形 | 上端2点→下端中点 | PASS |
| MV-BR-03 | 対傾構が同一station鉛直面 | 各斜材の X が一致 | PASS |
| MV-BR-04 | 隣接主桁間に収まる | outer girder 外へ出ない | PASS |
| MV-BR-05 | 平面で上横構が上部水平面 | Z=topConnectionZ | PASS |
| MV-BR-06 | 平面で下横構が下部水平面 | Z=bottomConnectionZ | PASS |
| MV-BR-07 | 正面で上下横構高さが主桁上下端一致 | フランジ中立面 | PASS |
| MV-BR-08 | 上横構/下横構ON-OFF | 独立切替 | PASS |
| MV-BR-09 | 対傾構間隔変更 | 横構と独立 | PENDING |
| MV-BR-10 | SIMPLE_SINGLE | 回帰 | PENDING |
| MV-BR-11 | CONTINUOUS 5径間 | 回帰 | PENDING |
| MV-BR-12 | Demo Shape OFF | 基幾何 | PENDING |
| MV-BR-13 | Demo Shape ON | 外挿なし | PENDING |
| MV-BR-14 | save/reload | upper/lower flags 復元 | PASS |
| MV-BR-15 | STL | 三角面 > 0 | PASS |
| MV-BR-16 | selection/highlight | BraceMember 選択可 | PENDING |

## 9. 自動検証メモ（参考・GUI 代替ではない）

- `continuousGirderLayout.test.ts`: CONTINUOUS 2/3/5、save/reload、invalid、SIMPLE_SINGLE 回帰 — PASS
- `continuousGirderSample.test.ts`: サンプル STALE / generate — PASS
- `continuousGirderVisualization.test.ts`: 3D segment・STALE・STL・SIMPLE_SINGLE — PASS
- `visualizationBoundsBracing.test.ts`: 対傾構 Y/Z bounds、frame/solid X 一致、Demo Shape、STL — 追加
- `npm test -- src/apollo`: 実行結果を PR に記載
- contract / viewer / STL / import-export / suite manifest 関連 — 実行結果を PR に記載
- typecheck / lint / build — 実行結果を PR に記載

## 10. 数値ゲート（全 Step 共通）

```
NUMERIC_RELEASE_READINESS_VERDICT: BLOCKED
PHASE_B_IMPLEMENTATION_START_VERDICT: NO_GO_PENDING_HUMAN_EVIDENCE
NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED
```

確認済み行は PASS、未確認行は PENDING のまま残す。全体の `MANUAL_GUI_VERDICT` は本ドキュメント先頭を正本とする。
