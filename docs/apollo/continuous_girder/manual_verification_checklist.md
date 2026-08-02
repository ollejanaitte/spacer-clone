# 連続桁 — 手動確認チェックリスト

**Authority:** Step C0（文書凍結）/ Step C4（検証・チェックリスト拡充）/ Freeze-gate audit
**Date:** 2026-08-02
**MANUAL_GUI_VERDICT:** `PASS`
**APOLLO_3D_VERTICAL_SLICE_FREEZE_VERDICT:** `CONDITIONAL_FREEZE`（詳細は §9）

> 対傾構 V 型・上下横構分離（PR #280）および PR #279 bounds 回帰について、ユーザー手動 GUI 確認済み。
> 下記のうち **PASS** は確認済み、**PENDING** は未確認のまま残す。PASS を捏造しない。
> 2026-08-02 freeze-gate audit は残存 PENDING を分類したのみで、PENDING→PASS 変更は行っていない。
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

## 9. 残存 PENDING 分類・凍結判定（2026-08-02 freeze-gate audit）

**方針:** 既存の PASS / PENDING 状態は変更しない。未確認項目を PASS にしない。自動テスト PASS を手動 GUI PASS の代替にしない。

### 9.1 PR #283 で確認済みの範囲

| 範囲 | 状態 |
|------|------|
| `MANUAL_GUI_VERDICT` | PASS |
| MV-01..12（bounds / Demo Shape / Animation / fit / STL / SIMPLE_SINGLE / save-reload） | PASS |
| MV-BR-01..08（V型対傾構・上下横構・独立 ON/OFF） | PASS |
| MV-BR-14..15（save/reload flags・STL） | PASS |
| `SWAY_BRACING_MANUAL_VERDICT` / `UPPER_LATERAL_BRACING_MANUAL_VERDICT` / `LOWER_LATERAL_BRACING_MANUAL_VERDICT` | PASS |
| `PR279_BOUNDS_MANUAL_REGRESSION` / `SAVE_RELOAD_MANUAL_VERDICT` / `STL_MANUAL_VERDICT` | PASS |

### 9.2 現在も PENDING の範囲

- MV-BR-09, MV-BR-10, MV-BR-11, MV-BR-12, MV-BR-13, MV-BR-16
- MV-CG-01..35

いずれも **状態列は PENDING のまま**（本 audit で PASS 化していない）。

### 9.3 分類定義

| 分類 | 意味 |
|------|------|
| BLOCKING | 現行 Apollo 3D Vertical Slice 完成条件に含まれ、未確認のまま凍結すると完成主張が不正確になる |
| DEFERRED_NON_BLOCKING | Vertical Slice に関係するが、自動証拠または既存 PASS の重複確認で主要リスクが抑えられ、手動確認を後続へ延期しても凍結を妨げない |
| OUT_OF_CURRENT_VERTICAL_SLICE_SCOPE | 今回凍結する範囲の完成条件に含まれない |
| PENDING_USER_CONFIRMATION | GUI 操作など人間確認が必要で、Cursor 環境では確認不能（PASS 化禁止）。他分類と併記可 |

### 9.4 各 PENDING の分類

| # | 分類 | 自動証拠（GUI 代替ではない） | 分類理由 / 次アクション |
|---|------|------------------------------|-------------------------|
| MV-BR-09 | DEFERRED_NON_BLOCKING + PENDING_USER_CONFIRMATION | `generateBsdd.ts` で `swayBracingInterval` が対傾構サイトを独立ゲート; `bracingSystemGeometry` / `bridgeStructureWorkflow` / `bridgeStructureVisualization` が interval 1/2/null を検証 | 幾何本体は MV-BR-01..08 PASS。間隔変更の目視は後続。間隔 UI 操作を手動確認する |
| MV-BR-10 | DEFERRED_NON_BLOCKING + PENDING_USER_CONFIRMATION | `visualizationBoundsBracing` SIMPLE_SINGLE; `continuousGirderVisualization` / `continuousGirderLayout` SIMPLE_SINGLE 回帰 | MV-11 PASS と重複。対傾構付き SIMPLE_SINGLE の追加目視は後続 |
| MV-BR-11 | DEFERRED_NON_BLOCKING + PENDING_USER_CONFIRMATION | `visualizationBoundsBracing` 5-span bounds; layout 2/3/5 | MV-01 PASS（5径間表示）と重複。対傾構付き 5径間の追加目視は後続 |
| MV-BR-12 | DEFERRED_NON_BLOCKING + PENDING_USER_CONFIRMATION | `visualizationBoundsBracing` Demo Shape OFF/ON | MV-06 PASS と重複。チェックリスト冗長行として PENDING 維持 |
| MV-BR-13 | DEFERRED_NON_BLOCKING + PENDING_USER_CONFIRMATION | 同上 | MV-06/07 PASS と重複。PENDING 維持 |
| MV-BR-16 | OUT_OF_CURRENT_VERTICAL_SLICE_SCOPE + PENDING_USER_CONFIRMATION | solids に `selectionKey`/`BraceMember` 付与; `selection.test.ts` / shell selection は一般選択のみ。BraceMember 専用 GUI ピック未確認 | `visualization_spec.md` §4 の選択対象は主桁・床版。対傾構選択は今回 3D 完成条件外。必要時に別途 GUI 確認 |
| MV-CG-01..08 | DEFERRED_NON_BLOCKING + PENDING_USER_CONFIRMATION | `BridgeStructureInputPanel` C2 UI; `continuousGirderLayout` 2/3/5・SIMPLE_SINGLE・fail-close | C4 自動検証済。構造形式/径間の目視は後続 |
| MV-CG-09..13 | DEFERRED_NON_BLOCKING + PENDING_USER_CONFIRMATION | InputPanel 支間 add/remove; layout cumulative stations / abutment / pier | C4 自動検証済。支点・下部構造の目視は後続 |
| MV-CG-14..18 | DEFERRED_NON_BLOCKING + PENDING_USER_CONFIRMATION | sample STALE; visualization STALE omit/restore; NOT_AUTHORIZED panel/layout | C4 自動検証済。STALE/再生成の目視は後続 |
| MV-CG-19..25 | DEFERRED_NON_BLOCKING + PENDING_USER_CONFIRMATION | continuousGirderVisualization contiguous segments / pier / deck; bracing solids tests | MV-BR-01..08 / MV-01..05 で主要 3D 幾何は確認済。部材別目視は後続 |
| MV-CG-26..29 | DEFERRED_NON_BLOCKING + PENDING_USER_CONFIRMATION | layout/visualization save-reload; STL tests; legacy SIMPLE_SINGLE default | MV-12 / MV-BR-14/15 / MV-10 PASS と重複大。互換目視は後続 |
| MV-CG-30..32 | DEFERRED_NON_BLOCKING + PENDING_USER_CONFIRMATION | layout duplicate span ID / SIMPLE_MULTIPLE fail-close; workflow validation | 負の確認は自動が主。GUI エラー表示の目視は後続 |
| MV-CG-33..35 | OUT_OF_CURRENT_VERTICAL_SLICE_SCOPE + PENDING_USER_CONFIRMATION | scope_freeze / analysis_boundary で断面力・負曲げ・正式照査は OUT; panel adoption fail-closed / NOT_AUTHORIZED | 数値・照査境界ガードであり、今回の 3D 幾何凍結条件外。漏えい目視は必要時 |

**集計:** BLOCKING=0 / DEFERRED_NON_BLOCKING=38（MV-BR-09..13 + MV-CG-01..32） / OUT_OF_CURRENT_VERTICAL_SLICE_SCOPE=4（MV-BR-16 + MV-CG-33..35） / PENDING_USER_CONFIRMATION=41（全残存 PENDING。PASS 化なし）

### 9.5 自動証拠と手動証拠の区別

| 証拠種別 | 役割 | 制限 |
|----------|------|------|
| 自動テスト（vitest） | 契約・幾何数値・STALE・STL・save/reload・UI コンポーネント契約 | 対話的 3D 目視・カメラ操作・人間知覚の代替にならない |
| 手動 GUI（PR #283） | MV-01..12 / MV-BR-01..08 / 14..15 の目視確認 | 上記以外の PENDING 行には適用しない |

### 9.6 Vertical Slice 凍結判定

```
APOLLO_3D_IMPLEMENTATION_VERDICT: PASS
APOLLO_3D_AUTOMATED_VERIFICATION_VERDICT: PASS
APOLLO_3D_CONFIRMED_MANUAL_SCOPE_VERDICT: PASS
APOLLO_3D_REMAINING_MANUAL_ITEMS: MV-BR-09/10/11/12/13/16; MV-CG-01..35
APOLLO_3D_VERTICAL_SLICE_FREEZE_VERDICT: CONDITIONAL_FREEZE
```

判定理由:
- 未解決 BLOCKING = 0（FROZEN 条件は満たすが、非ブロッカー PENDING を明示して凍結するため CONDITIONAL_FREEZE）
- 凍結範囲: 連続桁純幾何ワークフロー（C0〜C4 自動完了）+ PR #279 bounds 手動確認 + PR #280 対傾構/上下横構手動確認
- 凍結対象外: 残存 PENDING の item-by-item GUI PASS 化、数値設計、断面力/利用率、Golden 作成、主桁断面諸量の正式実装
- 次フェーズへ進む条件: 数値ゲート解除用の独立人間証跡（Golden / 認可）。本 CONDITIONAL_FREEZE は数値ゲートを解除しない

## 10. 自動検証メモ（参考・GUI 代替ではない）

2026-08-02 freeze-gate audit 実行結果（`frontend/`）:

| コマンド | 結果 |
|----------|------|
| `npm test -- src/apollo/__tests__/continuousGirderLayout.test.ts ...`（根拠テスト 10 files） | PASS（91 tests） |
| `npm test -- src/apollo` | PASS（40 files / 300 tests） |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS（既存日本語文字列 review 警告のみ、exit 0） |
| `npm run build` | PASS（chunk size 警告のみ） |

個別メモ:
- `continuousGirderLayout.test.ts`: CONTINUOUS 2/3/5、save/reload、invalid、SIMPLE_SINGLE 回帰 — PASS
- `continuousGirderSample.test.ts`: サンプル STALE / generate — PASS
- `continuousGirderVisualization.test.ts`: 3D segment・STALE・STL・SIMPLE_SINGLE — PASS
- `visualizationBoundsBracing.test.ts`: 対傾構 Y/Z bounds、frame/solid X、Demo Shape、5-span、SIMPLE_SINGLE、STL — PASS
- `bracingSystemGeometry.test.ts`: V型対傾構・上下横構平面・entity 分離・save/reload — PASS
- `BridgeStructureInputPanel.test.tsx`: 構造形式切替・支間 add/remove・STALE・NOT_AUTHORIZED — PASS
- `selection.test.ts` / solids `BraceMember` selectionKey: 一般選択・キー付与のみ（GUI ピック代替ではない）

## 11. 数値ゲート（全 Step 共通・変更禁止）

```
NUMERIC_RELEASE_READINESS_VERDICT: BLOCKED
PHASE_B_IMPLEMENTATION_START_VERDICT: NO_GO_PENDING_HUMAN_EVIDENCE
NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED
```

確認済み行は PASS、未確認行は PENDING のまま残す。全体の `MANUAL_GUI_VERDICT` は本ドキュメント先頭を正本とする。
未確認項目を本 audit で PASS にしていない。数値ゲートは引き続き BLOCKED / NOT_GRANTED。
