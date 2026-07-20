# P4-D04 HOSO Extraction Record

**Date:** 2026-07-21  
**Status:** APPROVED — supervisor extraction approval (2026-07-21)

**Scope parent:** [p4_d04_scope.md](p4_d04_scope.md)  
**Phase 4 parents:** [phase4_planning_freeze.md](phase4_planning_freeze.md), [phase4_design_document.md](phase4_design_document.md), [phase4_completion_gate.md](phase4_completion_gate.md)  
**Completion gate:** D04-C01（本書の監督承認で充足）  
**algorithmVersion (proposed):** `hoso-0.1.0`  
**Pattern reference:** [p4_d03_haunch_extraction_record.md](p4_d03_haunch_extraction_record.md), [p4_d02_ldist_extraction_record.md](p4_d02_ldist_extraction_record.md)

---

## 1. Purpose

JIP-LINER マニュアル **§7** から **semantic authority** を抽出し、§7 本文に存在しない幾何定義を **Stage 8 R8-14 O1 oracle** で明示する。数式の捏造を避けつつ、P4-D04 実装・Vitest O1 baseline の根拠文書とする（**D04-C01**）。

**実装方針（監督プロンプト §6 記録）:**

- JIP 計算タイプ（§7.3.1–§7.3.6）だけで分岐する巨大関数は採用しない。**discriminated union**（5 タイプファミリ + ファミリ内バリアント）で表現する。
- PDF に公式が無い JIP タイプ・フィールドは **unsupported → fail-closed**（推測実装禁止）。
- 計算結果は原則 **再計算**（RDD / extension への結果キャッシュ禁止 — scope §3.3）。
- JIP-SPACER / `.lin` / HS1/HS2 / 帳票ビューワは **記録のみ無視**；RDD export に置換。

---

## 2. Source document

| Field | Value |
| --- | --- |
| File | `マニュアル/JIP-LINER_マニュアル.pdf` |
| Extraction method | `pdftotext -layout`（2026-07-21） |
| Semantic authority section | **§7 舗装厚計算**（§7.1–§7.4） |
| PDF pages | **143–148** |
| Print pages (footer) | **137–142** |

**§7 構成（PDF / print — 実測）:**

| Subsection | PDF pages | Print pages |
| --- | --- | --- |
| §7.1 スパン一覧 | 143 | 137 |
| §7.2 舗装範囲 | 144 | 138 |
| §7.3 計算タイプ（§7.3.1–§7.3.6） | 145–147 | 139–141 |
| §7.4 舗装厚の照査 | 148 | 142 |

**境界:** §6 ハンチ計算は PDF p.142 / print p.136 で終了（D03 extraction 境界）。§8 図面作成は PDF p.149 / print p.143 から開始。

**関連参照（§7 以外 — authority ではない）:**

| Location | PDF / print | 用途 | 分類 |
| --- | --- | --- | --- |
| §1.2 プログラム構成 | p.8 / p.2 | HOSO = 舗装厚計算モジュール名 | モジュール名確認 |
| §1.5 プログラム構成 | p.13 / p.7 | `.lin` 内 `##### HOSO` ブロック | **旧製品固有** / 記録のみ |
| §2.3 ファイル構成 | p.22 / p.16 | HS1/HS2/`_S.CSV` 出力 | **今回非対象**（帳票ビューワ） |
| §3.5 計算メニュー | p.28 / p.22 | HOSO 実行；LINER 成功後に実行可 | 実行順序参考 |
| §3.5.4 HOSO | p.31 / p.25 | 前提: §7 でスパン + 舗装範囲 + 計算タイプ | **採用（意味論）** |
| §5.4 縦断勾配・横断勾配 | p.60+ / p.54+ | §7.2「基準桁」が参照する勾配データ | **接続参考**（§7 閉形式なし） |
| §11.5 舗装厚計算 FAQ | p.179 / p.173 | 自動決定の収束計算・欠落ライン | **採用（意味論）** — auto 補足 |
| §11.7 不正終了 | p.181 / p.175 | `_SIMPLEhoso.tmp` | **旧製品固有** / 記録のみ |

---

## 3. Semantic citations（JIP §7 原文要約）

### 3.0 モジュール・実行コンテキスト（参考）

| Location | 原文要約 | 分類 |
| --- | --- | --- |
| §1.2 p.8 / print p.2 | HOSO = 舗装厚計算プログラム（JIP-LINER 構成要素） | モジュール名確認 |
| §3.5.4 p.31 / print p.25 | ｢7. 舗装厚計算｣で１つ以上のスパンを指定し、**舗装範囲と計算タイプ**を作成しておく必要がある。成功 → HS2 帳票、失敗 → HS1 実行情報 | **採用（意味論）**；帳票は非対象 |
| §3.5 p.28 / print p.22 | LINER が正常終了しマスタファイル作成後のみ下流計算（HOSO 含む）実行可 | **採用（意味論）** — LINER 線形データ前提 |
| §11.5 p.179 / print p.173 | 自動決定は LINER 交点の**橋面高**で**ループ（収束）計算**。ライン追加で結果変化し得る。天端高合わせは「3点の舗装厚を指定」+ 遠い3点 | **採用（意味論）** — auto 唯一の算法ヒント |
| §11.5 p.179 / print p.173 | 舗装範囲にセクション交点のないラインがあると自動決定不正確・出力欠落 | **採用（意味論）** — 退化/範囲 fail-closed |
| §11.7 p.181 / print p.175 | `_SIMPLEhoso.tmp` テンポラリ | **旧製品固有** |

**不採用（旧製品固有）:** `.lin` `##### HOSO` ブロック、HS1/HS2、帳票ビューワ、`_SIMPLEhoso.tmp`、`_S.CSV` オプション出力。

---

### 3.1 §7.1 スパン一覧（PDF p.143 / print p.137）

> 舗装厚計算を行なうスパン名称を指定します。

- スパン追加・編集・削除 UI；追加後は**計算タイプ一覧**（§7.3）へ遷移
- 既存スパンデータのコピー追加可
- データ追加位置: 最後 / 現在位置に挿入 / 次の位置に追加

**採用（意味論）:** 舗装厚計算は **スパン（橋 span）スコープ** で定義される。当プロジェクトでは `alignmentId` + `stationRange` + 任意 `spanId` フィルタにマッピング（D02/D03 N3 パターン — span は optional filter）。

**不採用:** スパン一覧 UI、JIP スパン名称ダイアログ、挿入位置 UI そのもの。

---

### 3.2 §7.2 舗装範囲（PDF p.144 / print p.138）

**ナビゲーション（参考/UI）:** スパン一覧 / 前のスパン / 次のスパン。

**■ 舗装範囲（意味論）:**

| JIP ラベル | 原文要約 | プロジェクト対応（案） |
| --- | --- | --- |
| **橋軸方向** | 計算範囲を決める**左側セクション・右側セクション** | `stationRange` または `sectionFromId` / `sectionToId` |
| **橋軸直角方向** | **上側ライン・下側ライン・最小舗装厚**を指定。**最大3つ**まで | `offsetRanges[]`（≤3）各 `{ upperLineId, lowerLineId, minPavementThicknessM }` |
| **基準桁** | **縦断勾配・横断勾配**の基準ライン。**小座標変換**はこのライン基準 | `referenceLineId`（必須 when gradient types） |
| **ライズ量** | キャンバー考慮時のライズ量 | `camberRiseM?`（optional） |

**採用（意味論）:**

- 計算は **橋軸（測点）× 橋軸直角（ライン/offset）** の矩形領域（最大3帯）でスコープされる。
- **最小舗装厚**は橋軸直角方向の各帯で指定可能（§7.2 明示）。§7.4 では 3点タイプの**照査**でも最小厚を確認。
- **基準桁**は縦断・横断勾配の参照軸 — §5.4 縦断勾配・横断勾配データとの接続を意味するが、**変換式は §7 に無し**（ギャップ）。

**ギャップ（§7.2）:**

- 左/右セクション・上/下ラインの **幾何解釈**（測点 vs セクション名称）— 閉形式なし
- **最小舗装厚**の単位・符号 — §7 本文に単位記載なし（プロジェクト m 凍結は O1 補完）
- **最大舗装厚** — §7 無記載
- **ライズ量**とキャンバーの適用式 — §7 無記載（7.3.5/6 の注記「桁端上の点」のみ）
- 断面高さ（§5.4.3）との直接接続記述 — §7 無し（§5.4 経由の間接参照のみ）

**不採用:** スパン切替 UI。

---

### 3.3 §7.3 計算タイプ共通（PDF p.145 / print p.139）

> スパンごとの計算条件を指定します。画面の上半分で計算タイプを選択し、下半分でタイプごとのデータを指定します。

**採用（意味論）:** スパンあたり **1 計算タイプ** を選択し、タイプ別データを入力。詳細フィールドは **説明図付き UI**（`pdftotext` ではタイトルのみ抽出 — 画像依存）。

**ギャップ（共通）:**

- 舗装厚と **舗装標高（天端/橋面高）** の相互変換式 — §7 閉形式なし
- 縦断勾配・横断勾配の **数値定義**（Δ標高/Δ測点、offset 方向）— §5.4 に UI 説明あるが §7 無し
- **負の舗装厚**の禁止 — §7 本文に明示なし（R8-14 / scope D04-C04 で error 裁定）
- **単位** — §7 無記載
- スパン内 **複数計算タイプの逐次適用**（HAUNCH type 8 相当）— §7 無記載

---

### 3.4 計算タイプ全件一覧（§7.3.1–§7.3.6）

以下、各タイプの **JIP 意味論** を転記。§7.3.1–§7.3.4 は **タイトルのみ**（本文・数式・フィールド一覧は PDF 画像）。§7.3.5–§7.3.6 は注記 2 行のみ追加。

#### 3.4.1 タイプ — 自動決定（§7.3.1, PDF p.145 / print p.139）

> （タイトルのみ — 本文は UI 図）

| 項目 | 内容 |
| --- | --- |
| 名称 | **自動決定** |
| §11.5 補足 | LINER 交点の**橋面高**を用いた**ループ（収束）計算**で最適面を求める |
| 出力（意味論） | 勾配・舗装厚（§7.4 照査 UI） |
| 適用条件 | LINER 線形計算済み；舗装範囲内にセクション交点のあるライン |
| ギャップ | 収束条件・目的関数・初期値・橋面高の定義 — **§7/§11.5 閉形式なし** |

**分類:** **採用する公式意味論** → **Auto** ファミリ（バリアント: `auto_converge_liner_surface`）

---

#### 3.4.2 タイプ — 縦断のみ指定（§7.3.2, PDF p.145 / print p.139）

> （タイトルのみ）

| 項目 | 内容 |
| --- | --- |
| 名称 | **縦断のみ指定** |
| 幾何（意味論） | 舗装厚（または標高）が **橋軸方向（測点）** のみで変化；横断一定と解釈 |
| ギャップ | 入力フィールド・勾配定義・基準面 — 閉形式なし |

**分類:** **採用する公式意味論** → **Longitudinal** ファミリ（バリアント: `longitudinal_only`）

---

#### 3.4.3 タイプ — 横断のみ指定（§7.3.3, PDF p.145 / print p.139）

> （タイトルのみ）

| 項目 | 内容 |
| --- | --- |
| 名称 | **横断のみ指定** |
| 幾何（意味論） | 舗装厚が **橋軸直角方向（ライン/offset）** のみで変化；測点方向一定と解釈 |
| ギャップ | offset 測定方向・基準桁からの距離定義 — 閉形式なし |

**分類:** **採用する公式意味論** → **Transverse** ファミリ（バリアント: `transverse_only`）

---

#### 3.4.4 タイプ — 縦断・横断ともに指定（§7.3.4, PDF p.146 / print p.140）

> （タイトルのみ）

| 項目 | 内容 |
| --- | --- |
| 名称 | **縦断・横断ともに指定** |
| 幾何（意味論） | 縦断勾配 **と** 横断勾配の**両方**をユーザーが指定（§7.2 基準桁文脈） |
| ギャップ | 2 勾配の合成平面式 — §7 閉形式なし（HAUNCH タイプ7 と類似の平面意味論と推測されるが **推測実装禁止**） |

**分類:** **採用する公式意味論** → **監督判断が必要**（§10 S4）。推奨: Longitudinal ファミリ内バリアント `both_gradients`（5 ファミリ enum を増やさない）。

---

#### 3.4.5 タイプ — ３点の舗装厚を指定（§7.3.5, PDF p.146 / print p.140）

> ※ キャンバーを考慮する場合は、桁端上の３点を指定して下さい。  
> ※ ３点が１直線上に並ばないように指定して下さい。

| 項目 | 内容 |
| --- | --- |
| 入力（意味論） | 3 点の舗装厚（キャンバー時は**桁端上**の 3 点） |
| 幾何 | 3 点で決まる面（非共線必須） |
| §7.4 照査 | 各計算範囲の**最小舗装厚**確保を確認 |
| ギャップ | 3 点の座標系（測点×offset×厚さ？）— 閉形式なし |

**分類:** **採用する公式意味論** → **Three-point** ファミリ（バリアント: `three_point_non_collinear`）

---

#### 3.4.6 タイプ — ２点の舗装厚を指定（§7.3.6, PDF p.147 / print p.141）

> ※ キャンバーを考慮する場合は、桁端上の２点を指定して下さい。

| 項目 | 内容 |
| --- | --- |
| 入力（意味論） | 2 点の舗装厚（キャンバー時は**桁端上**の 2 点） |
| 幾何 | 2 点を通る厚さ場 — 1 自由度不足（平面未定） |
| ギャップ | 2 点だけでは面が一意に定まらない — §7 は残り自由度の指定方法を **記載なし** |

**分類:** **採用する公式意味論** → **Two-point** ファミリ（バリアント: `two_point_girder_end`）。残り自由度は **監督凍結必須**（§10 S5）。

---

### 3.5 §7.4 舗装厚の照査（PDF p.148 / print p.142）

> [舗装厚照査]ボタンを押すと、現在選択しているスパンの舗装厚を照査することができます。  
> 実行すると、勾配や舗装厚を確認できます。３点の舗装厚を指定する計算タイプを選択した場合は、各計算範囲の**最小舗装厚**を確保できているかどうかも表示します。  
> 「********」と表示されているのは、**計算範囲外**にあるラインです。  
> セクションによって舗装厚が表示されたり表示されなかったりする場合は、**ラインが交差している**（または途中からラインが存在する）ことが原因と考えられます。橋軸直角方向のライン範囲を見直して下さい。

**採用（意味論）:**

| 項目 | 意味 |
| --- | --- |
| 照査 | 計算結果の**確認 UI**（勾配・厚さ）；export の **fail-closed ゲート**ではなく診断/レビュー機能 |
| 最小厚チェック | 3点タイプ + §7.2 最小舗装厚との整合 |
| 範囲外 | `********` 表示 — 数値なし（サイレント省略に相当） |
| 不正交差 | ライン交差・途中欠落 → 表示欠落；**fail-closed 推奨** |

**分類:** **UI参考** + **診断意味論採用**（`LINER_HOSO_LINE_OUT_OF_RANGE`, `LINER_HOSO_INTERSECTING_LINES`）。帳票/ダイアログ UI 自体は非対象。

**不採用:** 照査ダイアログのレイアウト、HS2 帳票形式。

---

### 3.6 縦断・横断・断面高さとの接続（§5.4 参考 — §7 authority 外）

§7.2 は **基準桁** を通じて §5.4 縦断勾配・横断勾配を参照するが、§7 本文に式は無い。

| 接続 | JIP 所在 | §7 記載 | プロジェクト |
| --- | --- | --- | --- |
| 縦断勾配 | §5.4.1 | 基準桁が参照軸（§7.2） | `buildIntermediateResult` → profile samples |
| 横断勾配 | §5.4.2 | 同上 | `crossfallResolution.ts` |
| 断面高さ | §5.4.3 | §7 直接参照なし | pipeline cross-section samples（任意 deck 文脈） |
| 小座標変換 | §5.x（出力指定） | §7.2「基準桁」基準 | **今回非対象**（plan XY + profile/crossfall で代替） |

**衝突なし** — §7 は勾配データの存在を前提とするのみ。具体式は §5.4 + プロジェクト O1。

---

### 3.7 単位・符号・最小/最大厚

| Topic | JIP §7 | 分類 |
| --- | --- | --- |
| 単位 | **無記載** | **不明** — プロジェクト `m`（numerical_accuracy / scope） |
| 舗装厚符号（正=上/下） | **無記載** | **監督判断**（§10 S3） |
| 最小舗装厚 | §7.2（橋軸直角、最大3帯）；§7.4（3点照査） | **採用** — 非負・下限チェック |
| 最大舗装厚 | **無記載** | N/A |
| 負の厚さ | **無記載** | R8-14 / D04-C04 → `LINER_HOSO_NEGATIVE_THICKNESS` error |

---

## 4. Full type/mode catalog from §7

| JIP §7 ID | 名称 | PDF / print | 本文テキスト | 画像/UI 依存 |
| --- | --- | --- | --- | --- |
| — | （スパン・舗装範囲） | §7.1–§7.2 / p.143–144 | あり（フィールド名） | 一部 |
| **7.3.1** | 自動決定 | p.145 / p.139 | **タイトルのみ** | **是** |
| **7.3.2** | 縦断のみ指定 | p.145 / p.139 | **タイトルのみ** | **是** |
| **7.3.3** | 横断のみ指定 | p.145 / p.139 | **タイトルのみ** | **是** |
| **7.3.4** | 縦断・横断ともに指定 | p.146 / p.140 | **タイトルのみ** | **是** |
| **7.3.5** | ３点の舗装厚を指定 | p.146 / p.140 | タイトル + 注記2行 | **是** |
| **7.3.6** | ２点の舗装厚を指定 | p.147 / p.141 | タイトル + 注記1行 | **是** |
| — | 舗装厚照査 | §7.4 / p.148 | あり（動作説明） | 一部 |

**PDF に無いタイプ番号・名称:** 常に `unsupported` fail-closed。

**重要:** §7.3.1–§7.3.4 の入力フィールド・数式は **PDF テキスト抽出不能**（スクリーンショットのみ）。numeric claim の根拠は **§6 O1 プロジェクト補完** に限定。

---

## 5. Five type families mapping（MVP）

### 5.1 正本ファミリ（プロジェクト — D04-C02 必須）

| Family | JIP §7 対応（意味論） | MVP | 備考 |
| --- | --- | --- | --- |
| **Auto** (`auto`) | 7.3.1 + §11.5 収束 | **対象** | LINER 橋面高ループは当プロジェクトに無し → pipeline 代替（§10 S1） |
| **Longitudinal** (`longitudinal`) | 7.3.2；7.3.4 は S4 裁定 | **対象** | 測点方向変化 |
| **Transverse** (`transverse`) | 7.3.3 | **対象** | offset 方向変化；crossfall 必須 |
| **Two-point** (`two_point`) | 7.3.6 | **対象** | 残り自由度は S5 凍結 |
| **Three-point** (`three_point`) | 7.3.5 | **対象** | 非共線必須；最小厚照査 |

### 5.2 JIP §7.3 → ファミリ対応表（全6件 + 照査）

| JIP §7.3 | 名称 | Family | MVP | Fail-closed code |
| --- | --- | --- | --- | --- |
| 7.3.1 | 自動決定 | auto | ✅ | — |
| 7.3.2 | 縦断のみ指定 | longitudinal | ✅ | — |
| 7.3.3 | 横断のみ指定 | transverse | ✅ | — |
| 7.3.4 | 縦断・横断ともに指定 | longitudinal (`both_gradients`) **提案** | ✅ | — |
| 7.3.5 | ３点の舗装厚を指定 | three_point | ✅ | — |
| 7.3.6 | ２点の舗装厚を指定 | two_point | ✅ | — |
| §7.4 | 舗装厚照査 | （全ファミリ横断レビュー） | ✅ 診断 | `LINER_HOSO_MIN_THICKNESS_VIOLATION` 等 |

### 5.3 Discriminated union 提案（実装向けメモ — STEP C 参照）

```typescript
// 記録のみ — 本 STEP ではコード変更なし
type HosoDefinition =
  | { family: "auto"; variant: "auto_converge_pipeline"; ... }
  | { family: "longitudinal"; variant: "longitudinal_only" | "both_gradients"; ... }
  | { family: "transverse"; variant: "transverse_only"; ... }
  | { family: "two_point"; variant: "two_point_girder_end"; ... }
  | { family: "three_point"; variant: "three_point_non_collinear"; ... };
```

JIP 生の `§7.3.x` 番号を API 表面に露出しない。legacy import（D07）でのみ番号→union 変換を検討。

---

## 6. Geometric / numeric definitions（プロジェクト O1 — not in JIP §7 closed form）

> **Explicit statement:** JIP-LINER manual §7（PDF 143–148 / print 137–142）には、舗装厚・舗装標高を計算する **閉形式の数式・座標定義は一切記載されていない**（§7.3.1–§7.3.4 はタイトルのみ）。本節は Stage 8 **R8-14**（O1 hand plane/interpolation + COMBINED thickness register）および [numerical_accuracy.md](../design/numerical_accuracy.md) に基づく **プロジェクト幾何補完** であり、JIP PDF からの直接転記ではない。不明点は fail-closed。

### 6.1 Common primitives

| Symbol | Definition |
| --- | --- |
| Station \(s\) | `physicalDistance` along active alignment |
| Section \(\Sigma(s)\) | `SectionSliceResult` at \(s\) from `buildIntermediateResult` |
| Offset \(d\) | Lateral distance along section traverse from `referenceLineId` intersection |
| Line \(L\) | Offset line identified by `lineId` |
| \(P(L,\Sigma)\) | Intersection of \(L\) with \(\Sigma\) in plan \((x,y)\). Missing → `LINER_HOSO_DEGENERATE_GEOMETRY` |
| \(z_{\text{profile}}(s)\) | Vertical pipeline elevation at \(s\) |
| \(z_{\text{pavement}}(s,d)\) | Pavement top elevation (output `pavementElevationM`) |
| \(t(s,d)\) | Pavement thickness (output `pavementThicknessM`) |
| \(t_{\min,k}\) | Minimum thickness for offset band \(k\) from §7.2（≤3 bands） |

**Tolerance:** coordinates 1e-6 m; elevation/thickness 1e-6 m (numerical_accuracy); compare **COMBINED** thickness register per R8-14.

**Thickness ↔ elevation (project freeze — supervisor S3 提案):**

\[
t(s,d) = z_{\text{pavement}}(s,d) - z_{\text{ref}}(s,d)
\]

where \(z_{\text{ref}}\) = **profile elevation at station** + crossfall-adjusted datum at offset via `crossfallResolution`（**凍結 S3 案**）。JIP「橋面高」との厳密対応は **claim しない**。

### 6.2 Auto family

**JIP semantic mapping:** §7.3.1 + §11.5（LINER 橋面高ループ収束）

**Project O1 (pipeline substitute — 凍結 S1 案):**

当プロジェクトに LINER W/橋面高ループは無い。MVP:

1. Sample stations × offsets in pavement range（§7.2）
2. For each \((s,d)\), gather candidate thickness from **profile + crossfall + deck template** rules（rule-driven — scope §3.1）
3. If iterative refinement needed: **fixed-point** on \(t\) until \(\max |t_{n}-t_{n-1}| < \varepsilon\) or **fail** `LINER_HOSO_AUTO_NOT_CONVERGED`

**Fail-closed:**

- Line without section intersection in range → `LINER_HOSO_LINE_OUT_OF_RANGE`（§11.5）
- LINER master not available → N/A（当プロジェクトは pipeline）；profile/crossfall missing → `LINER_HOSO_PROFILE_UNAVAILABLE` / `LINER_HOSO_CROSSFALL_UNAVAILABLE`

**Gap vs JIP:** §11.5 の「最適面」目的関数は **不明** — JIP 厳密互換 **不可**。

### 6.3 Longitudinal family

**JIP semantic mapping:** §7.3.2（縦断のみ）；§7.3.4（両勾配 — variant `both_gradients`）

**Variant A — longitudinal only:**

\[
t(s,d) = t(s), \quad t(s) = t_0 + g_{\parallel}(s - s_0)
\]

or piecewise linear between user anchors at stations. \(d\) 無関係（横断一定）。

**Variant B — both gradients (`both_gradients`, §7.3.4 提案):**

\[
z_{\text{pavement}}(s,d) = z_0 + g_{\parallel}(s-s_0) + g_{\perp}(d-d_0)
\]

\[
t(s,d) = z_{\text{pavement}}(s,d) - z_{\text{ref}}(s,d)
\]

\(g_{\parallel}, g_{\perp}\) user-supplied; \(d_0\) at reference girder on \(\Sigma(s)\).

**Degenerate:** \(s_1=s_2\) for 2-anchor linear → `LINER_HOSO_DEGENERATE_GEOMETRY`.

### 6.4 Transverse family

**JIP semantic mapping:** §7.3.3

\[
t(s,d) = t(d), \quad t(d) = t_0 + g_{\perp}(d - d_0)
\]

\(s\) 無関係（測点方向一定）。**crossfall** at \((s,d)\) required for \(z_{\text{ref}}(s,d)\).

**Fail-closed:** crossfall unavailable → `LINER_HOSO_CROSSFALL_UNAVAILABLE`.

### 6.5 Two-point family

**JIP semantic mapping:** §7.3.6（桁端上 2 点）

Anchors \(A_1=(s_1,d_1,t_1)\), \(A_2=(s_2,d_2,t_2)\).

**Underdetermined** — §7 does not specify remaining DOF. **凍結 S5 案:**

- Hold **longitudinal gradient** \(g_{\parallel}\) fixed (user or zero) between anchors; solve \(g_{\perp}\) from 2 thickness constraints, **or**
- Hold **transverse-only** interpolation along chord in \((s,d)\) plane: \(t\) linear along segment \(A_1A_2\) in plan projection

Default O1 fixture: **plan chord linear interpolation** in \((s,d)\):

\[
t(s,d) = t_1 + \frac{\lambda}{\lambda_2}(t_2-t_1), \quad \lambda = \text{proj}_{A_1A_2}(s,d)
\]

**Degenerate:** \(A_1=A_2\) → `LINER_HOSO_DEGENERATE_GEOMETRY`.

### 6.6 Three-point family

**JIP semantic mapping:** §7.3.5（非共線 3 点；桁端上）

Three anchors \((s_i,d_i,t_i)\), \(i=1..3\). Solve affine plane:

\[
t(s,d) = a s + b d + c
\]

**Degenerate:** collinear \((s_i,d_i)\) → `LINER_HOSO_COLLINEAR_ANCHORS` / `LINER_HOSO_DEGENERATE_GEOMETRY`.

**Minimum thickness check (§7.4 semantics):**

For each offset band \(k\) with \(t_{\min,k}\): if \(\min_{(s,d) \in \text{band}_k} t(s,d) < t_{\min,k}\) → `LINER_HOSO_MIN_THICKNESS_VIOLATION` (warning or error — **監督 S6**).

### 6.7 Pavement range / offset bands（§7.2）

Up to **3** transverse bands:

\[
\mathcal{B}_k = \{ (s,d) : s \in [s_L,s_R],\ d \in [d_{\text{upper},k}, d_{\text{lower},k}] \}
\]

Evaluation only inside \(\bigcup_k \mathcal{B}_k\). Outside → `LINER_HOSO_STATION_OUT_OF_RANGE` / `LINER_HOSO_OFFSET_OUT_OF_RANGE`（§7.4 `********` 相当 — no silent numeric row).

### 6.8 Intersecting lines / degenerate section（§7.4）

> ラインが交差している（または途中からラインが存在する）

→ `LINER_HOSO_INTERSECTING_LINES` or `LINER_HOSO_DEGENERATE_GEOMETRY`; **no numeric row** for affected samples.

### 6.9 Sign / thickness / stale persistence

| Topic | JIP §7 | Project |
| --- | --- | --- |
| Units | 無記載 | **m**（scope） |
| \(t \ge 0\) | 無記載 | R8-14 → `LINER_HOSO_NEGATIVE_THICKNESS` **error** |
| \(t_{\min}\) | §7.2, §7.4 | enforce per band（§6.6） |
| Result cache | 無記載 | **禁止** — recompute only（scope §3.3） |
| Export with errors | 無記載 | `hasHosoErrors` blocks export（D02/D03 パターン） |

---

## 7. algorithmVersion

| Version | Scope |
| --- | --- |
| `hoso-0.1.0` | Initial: five families per §5–§6; MVP variants per §5.2 ✅ rows; fail-closed per §8; no result persistence |

Bump policy: any change to §6 geometric definitions, auto substitute (S1), or MVP variant set requires new `algorithmVersion` and updated O1 fixtures.

---

## 8. Diagnostics codes（提案）

| Code | Condition | Level |
| --- | --- | --- |
| `LINER_HOSO_UNSUPPORTED_TYPE` | JIP type or variant not in MVP union | error |
| `LINER_HOSO_INVALID_REFERENCE` | Unknown alignment / line / section / span / deck ref | error |
| `LINER_HOSO_PROFILE_UNAVAILABLE` | No profile at station | error |
| `LINER_HOSO_CROSSFALL_UNAVAILABLE` | No crossfall at station/offset (transverse / ref elevation) | error |
| `LINER_HOSO_STATION_OUT_OF_RANGE` | Station outside alignment or §7.2 range | error |
| `LINER_HOSO_OFFSET_OUT_OF_RANGE` | Offset outside §7.2 band | error |
| `LINER_HOSO_LINE_OUT_OF_RANGE` | Line has no section intersection in pavement range（§11.5） | error |
| `LINER_HOSO_INTERSECTING_LINES` | Intersecting or partial lines（§7.4） | error |
| `LINER_HOSO_DEGENERATE_GEOMETRY` | Collinear anchors, zero divisor, missing intersection | error |
| `LINER_HOSO_COLLINEAR_ANCHORS` | Three-point collinear（§7.3.5 注記） | error |
| `LINER_HOSO_NEGATIVE_THICKNESS` | \(t < 0\)（R8-14 / D04-C04） | error |
| `LINER_HOSO_MIN_THICKNESS_VIOLATION` | \(t < t_{\min,k}\) in band（§7.4） | warning or error（S6） |
| `LINER_HOSO_AUTO_NOT_CONVERGED` | Auto family fixed-point failed（S1） | error |
| `LINER_HOSO_EXTRACTION_REQUIRED` | Unapproved formula in dev | error |

**Policy:** error-level → no silent row omission; export blocked when `hasHosoErrors`（D02 `hasLdistErrors`、D03 `hasHaunchErrors` 同等）。計算結果の **stale 永続化禁止** — diagnostics のみ persist 対象外（入力定義のみ RDD）。

---

## 9. O1 fixture plan（D04-C03）

| Fixture ID | Family | Scenario | Oracle | Validates |
| --- | --- | --- | --- | --- |
| `gc-hoso-auto-pipeline` | auto | Straight alignment; pavement range; profile+crossfall rules | Hand: fixed-point or direct rule table | §7.3.1 / S1 |
| `gc-hoso-longitudinal-linear` | longitudinal | 2 station anchors; constant across offset | Hand: \(t(s)\) linear | §7.3.2 |
| `gc-hoso-longitudinal-both-gradients` | longitudinal | `both_gradients`; known \(g_{\parallel}, g_{\perp}\) | Hand: §6.3 Variant B | §7.3.4 |
| `gc-hoso-transverse-linear` | transverse | 2 offset anchors; constant along station | Hand: \(t(d)\) linear + crossfall ref | §7.3.3 |
| `gc-hoso-two-point-chord` | two_point | 2 girder-end anchors; chord interpolation | Hand: §6.5 | §7.3.6 |
| `gc-hoso-three-point-plane` | three_point | 3 non-collinear \((s,d,t)\) | Hand: solve \(as+bd+c=t\) | §7.3.5 |
| `gc-hoso-three-point-min-thickness` | three_point | Band with \(t_{\min}\); one sample below | Expect `LINER_HOSO_MIN_THICKNESS_VIOLATION` | §7.4 |
| `gc-hoso-negative-thickness` | longitudinal | Anchors implying \(t<0\) | Expect `LINER_HOSO_NEGATIVE_THICKNESS` | D04-C04 / R8-14 |
| `gc-hoso-degenerate-collinear` | three_point | Collinear \((s,d)\) anchors | Expect `LINER_HOSO_COLLINEAR_ANCHORS` | §7.3.5 注記 |
| `gc-hoso-line-out-of-range` | auto | Line without \(\Sigma\) intersection in range | Expect `LINER_HOSO_LINE_OUT_OF_RANGE` | §11.5 |

**Minimum for D04-C03:** ≥1 per family (five families) — **計 ≥5 シナリオ**（R8-14）。上表の ✅ ファミリ行で充足。追加: **negative rejection 必須**（`gc-hoso-negative-thickness`）。

**Tolerance:** thickness/elevation 1e-6 m (numerical_accuracy + R8-14 COMBINED).

**Fixture location (implementation phase):** `frontend/src/liner/core/hoso/__tests__/fixtures/` (proposed).

---

## 10. Supervisor freeze（APPROVED 2026-07-21）

| # | Item | **Frozen decision** |
| --- | --- | --- |
| **S1** | Auto（§7.3.1） | **`auto_converge_pipeline`**（profile+crossfall 固定点/直接規則）。JIP LINER 橋面高ループ厳密互換は **claim しない**。収束失敗 → `LINER_HOSO_AUTO_NOT_CONVERGED`。 |
| **S2** | §7.3.4 ファミリ所属 | **`longitudinal` variant `both_gradients`** を MVP 採用。 |
| **S3** | \(z_{\text{ref}}\) / 厚さ符号 | \(z_{\text{ref}}\) = profile + crossfallResolution；\(t=z_{\text{pavement}}-z_{\text{ref}}\)；\(t\ge0\) 必須。 |
| **S4** | §7.3.4 MVP | S2 とセットで **`both_gradients` 採用**。 |
| **S5** | Two-point 残り DOF | plan chord 線形補間（extraction §6.5）。 |
| **S6** | 最小厚違反 | **error**（`LINER_HOSO_MIN_THICKNESS`）。 |
| **S7** | 範囲重複 | error fail-closed（`LINER_HOSO_OVERLAPPING_BAND`）。 |
| **S8** | camber/ライズ量 | PDF 画像依存 → MVP で未対応なら optional omit；必須不明なら fail-closed しない範囲で省略可。 |
| **S9** | 照査（§7.4） | 診断パスとして実装（独立 family ではない）。 |
| **S10** | §5.4 小座標変換 | **非採用**。 |

---

## 11. Mapping to completion gate

| Gate | This document |
| --- | --- |
| D04-C01 | Supervisor signs §12 below |
| D04-C02 | Five families §5.1 |
| D04-C03 | O1 fixtures §9 |
| D04-C04 | Negative thickness §6.9 / `gc-hoso-negative-thickness` |
| D04-C05 | Fail-closed §8 |
| D04-C06 | Export columns in scope §3.5（builder は STEP C） |

---

## 12. Supervisor extraction approval

| Field | Value |
| --- | --- |
| Document | `docs/road/phase4/p4_d04_hoso_extraction_record.md` |
| Status | **APPROVED** |
| `P4_D04_EXTRACTION_VERDICT` | **APPROVED** |
| Semantic authority | JIP §7 PDF pp.143–148 / print pp.137–142 |
| Supplementary semantics | §11.5 PDF p.179 / print p.173（auto のみ） |
| Geometric O1 | §6 (explicit: not JIP closed form) |
| Supervisor freezes | S1–S10 — §10 |
| algorithmVersion | `hoso-0.1.0` |
| Supervisor | Cursor Grok 4.5 |
| Approval date | 2026-07-21 |

**Signature:** Approved by Cursor Grok 4.5 — EXTRACTION_VERDICT APPROVED 2026-07-21

**D04-C01:** SATISFIED by supervisor approval above.

---

## 13. Worker verdict recommendation

| Verdict | **`P4_D04_EXTRACTION_VERDICT: APPROVED`**（条件付き） |
| --- | --- |
| Rationale | D03 と同パターン: JIP §7 に閉形式は無いが、§7.3.1–§7.3.6 + §7.2 範囲 + §7.4 照査 + §11.5 auto 補足の意味論を全件一覧化し、5 ファミリへの MVP マッピングとギャップを明示済み。§6 の O1 補完で R8-14 最小セット（ファミリごと ≥1、negative rejection）が定義可能。unsupported・画像依存フィールドは fail-closed。推測実装は記録していない（§7.3.4 の平面合成は O1 明示補完として分離）。 |
| Conditions | 監督が §10 **S1**（auto pipeline 代替）、**S2/S4**（7.3.4→`both_gradients`）、**S5**（two-point DOF）を凍結すること。 |
| NOGO would apply if | 監督が 5 ファミリ縮小を要求、または S1/S5 を凍結できず O1 が一意に定まらないと判断した場合 |
| Residual risk | JIP 原文に数式が無い（§7.3.1–§7.3.4 はタイトルのみ）ため、JIP 厳密互換は **claim しない**。互換対象は **意味論 + プロジェクト O1** に限定。Auto の §11.5 収束算法は再現不可。 |

---

## 14. Revision log

| Date | Change |
| --- | --- |
| 2026-07-21 | Initial PROPOSED — JIP §7 PDF pp.143–148 extraction; 6 calculation types + review catalogued; 5-family mapping; R8-14 O1 geometric supplement; `hoso-0.1.0` proposed |
