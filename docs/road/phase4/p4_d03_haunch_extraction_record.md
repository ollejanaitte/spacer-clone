# P4-D03 HAUNCH Extraction Record

**Date:** 2026-07-21  
**Status:** APPROVED — supervisor extraction approval (2026-07-21)

**Scope parent:** [p4_d03_scope.md](p4_d03_scope.md)  
**Phase 4 parents:** [phase4_planning_freeze.md](phase4_planning_freeze.md), [phase4_design_document.md](phase4_design_document.md), [phase4_completion_gate.md](phase4_completion_gate.md)  
**Completion gate:** D03-C01（本書の監督承認で充足）  
**algorithmVersion (proposed):** `haunch-0.1.0`  
**Pattern reference:** [p4_d02_ldist_extraction_record.md](p4_d02_ldist_extraction_record.md)

---

## 1. Purpose

JIP-LINER マニュアル **§6** から **semantic authority** を抽出し、§6 本文に存在しない幾何定義を **Stage 8 R8-13 O1 oracle** で明示する。数式の捏造を避けつつ、P4-D03 実装・Vitest O1 baseline の根拠文書とする。

**実装方針（監督プロンプト §5 記録）:**

- JIP 計算タイプ番号（1–17）だけで分岐する巨大関数は採用しない。**discriminated union**（4 タイプファミリ + ファミリ内バリアント）で表現する。
- PDF に公式が無い JIP タイプは **unsupported → fail-closed**（推測実装禁止）。
- 計算結果は原則 **再計算**（RDD / extension への結果キャッシュ禁止 — scope §3.3）。

---

## 2. Source document

| Field | Value |
| --- | --- |
| File | `マニュアル/JIP-LINER_マニュアル.pdf` |
| Extraction method | `pdftotext -layout`（2026-07-21） |
| Semantic authority section | **§6 ハンチ計算**（§6.1–§6.4） |
| PDF pages | **131–142** |
| Print pages (footer) | **125–136** |

**§6 構成（PDF / print）:**

| Subsection | PDF pages | Print pages |
| --- | --- | --- |
| §6.1 スパン一覧 | 131 | 125 |
| §6.2 計算タイプ一覧 | 131–133 | 125–127 |
| §6.3 計算タイプ（共通 + §6.3.1–17） | 134–142 | 128–136 |
| §6.4 出力項目変更 | 142 | 136 |

**境界:** §7 舗装厚計算は PDF p.143 / print p.137 から開始。

---

## 3. Semantic citations（JIP §6 原文要約）

### 3.0 モジュール・実行コンテキスト（参考）

| Location | 原文要約 | 分類 |
| --- | --- | --- |
| §1.2 p.2 / print p.2 | HAUNCH = ハンチ計算プログラム（JIP-LINER 構成要素） | モジュール名確認 |
| §3.5.3 p.25 / print p.25 | §6 でスパン・計算タイプデータ作成後に実行；成功 → HL2 帳票、失敗 → HL1 実行情報 | **今回非対象**（HL1/HL2 / 帳票ビューワ） |
| §5.6.x p.115 / print p.115 | HAUNCH はマスタファイルから値を読み込み；帳票はマスタファイル順（ソートなし） | 記録のみ；RDD export に置換 |
| §5 横断データ p.68–69 / print p.68–69 | タイプ12: W と WG（WB）の差がハンチ高；WG データは線形帳票に非出力 | タイプ12 意味論；**LINER 線形計算依存** |
| §11.4 p.173–174 / print p.173–174 | ハンチ帳票の主桁順は線形帳票と異なり得る（幅員ソート vs マスタファイル順） | **UI参考のみ** / 今回非対象 |

**不採用（旧製品固有）:** `.lin` データブロック、HL1/HL2、帳票ビューワ、`_SIMPLEhaunch.tmp`、旧/新 HAUNCH データ保存形式オプション（§3 オプション p.29）。

---

### 3.1 §6.1 スパン一覧（PDF p.131 / print p.125）

> ハンチ計算を行なうスパン名称を指定します。

- スパン追加・編集・削除 UI；追加後は計算タイプ一覧へ遷移
- 既存スパンデータのコピー追加可

**採用（意味論）:** ハンチ計算は **スパン（橋 span）スコープ** で定義される。当プロジェクトでは `alignmentId` + `stationRange` + 任意 `spanId` フィルタにマッピング（D02 N3 パターン — span は optional filter）。

**不採用:** スパン一覧 UI、JIP スパン名称ダイアログ。

---

### 3.2 §6.2 計算タイプ一覧（PDF pp.131–133 / print pp.125–127）

**スパンごと必須入力:**

| JIP ラベル | 意味 | プロジェクト対応（案） |
| --- | --- | --- |
| 舗装厚＋床版厚 | 全主桁一定、またはタイプ別・主桁別 | `pavementPlusDeckThicknessM`（span 既定 or 定義上書き） |
| 支点セクション名称 | 始点側・終点側支点セクション | `supportSectionFromId`, `supportSectionToId` |

> 同じスパンで一定の舗装厚＋床版厚や支点セクションを変えて計算を行なう場合は、スパン一覧画面で同じスパンのデータを複数個作成し、スパンごとにデータを作成して下さい。

**採用（意味論）:** 支点セクションはスパン境界の幾何アンカー。舗装厚＋床版厚は天端高 ↔ ハンチ量変換の文脈で参照され得る（**変換式は §6 本文に無し — ギャップ**）。

**テクニック（タイプ8）:**

> １つのスパンの中で計算を行なうセクションの範囲を限定する場合は、計算タイプ８を利用します。…それ以降の計算タイプのデータに反映されます。

**採用:** Range ファミリの **逐次スコープ修飾** 意味論（§3.3.8 参照）。

---

### 3.3 §6.3 計算タイプ共通（PDF pp.134–135 / print pp.128–129）

| JIP ラベル | 適用 | 意味 |
| --- | --- | --- |
| 舗装厚＋床版厚（主桁ごと） | タイプ6,7,8 **除く** | 主桁別の舗装厚＋床版厚 |
| 計算ライン（主桁） | タイプ8 **除く** | 当該タイプで計算する主桁；1行1名称 |

**ギャップ（共通）:**

- ハンチ量と天端高の **相互変換式**（deck / 桁上縁 / 舗装厚の関係）— §6 閉形式なし
- 格点・セクション・主桁交点の標高データム — §6 では「LINER で計算」と前提のみ
- 符号・左右（side）の列挙 — §6 出力項目変更のみで名称変更；side enum 定義なし
- 負のハンチ量の禁止条件 — §6 本文に明示なし（R8-13 / scope abnormal conditions で error 裁定）

---

### 3.4 計算タイプ全件一覧（§6.3.1–§6.3.17）

以下、各タイプの **JIP 意味論** を転記。入力フィールドの詳細は説明図付き UI 項目であり、**数式・座標閉形式は PDF 全体を通じて記載なし**。

#### 3.4.1 タイプ１（§6.3.1, PDF p.135 / print p.129）

> ２つの支点におけるハンチ量または天端高を指定し、２点を結ぶ直線を決定します。桁上縁は、支点上の天端高と平面主桁長により比例計算します。

| 項目 | 内容 |
| --- | --- |
| 入力（意味論） | 支点1・支点2 におけるハンチ量 **または** 天端高（2点） |
| 幾何 | 2点直線；桁上縁は支点天端高と **平面主桁長** で比例 |
| 出力（意味論） | 各セクション×主桁の天端高 / ハンチ量（帳票 — §6.4） |
| 適用条件 | 計算ライン（主桁）指定 |
| ギャップ | 「平面主桁長」「比例」の閉形式なし；ハンチ↔天端高変換式なし |

**分類:** **採用する公式意味論** → Two-point ファミリ（バリアント: `two_support_points`）

---

#### 3.4.2 タイプ２（§6.3.2, PDF p.135 / print p.129）

> 支点セクション１における天端高またはハンチ量と、主桁の進行方向に向かう勾配を指定して直線を決定します。

| 項目 | 内容 |
| --- | --- |
| 入力 | 支点セクション1 の天端高/ハンチ量；**進行方向勾配** |
| 幾何 | 1点 + 縦勾配の直線 |
| ギャップ | 勾配の定義（Δ標高/Δ測点？主桁沿い？）閉形式なし |

**分類:** **採用する公式意味論** → Two-point ファミリ（バリアント: `one_point_longitudinal_gradient`）

---

#### 3.4.3 タイプ３（§6.3.3, PDF p.135 / print p.129）

> ハンチ量を一定におさえます。

| 項目 | 内容 |
| --- | --- |
| 入力 | 一定ハンチ量（意味論のみ；フィールド詳細は図参照） |
| ギャップ | 「一定」の空間範囲・主桁スコープの閉形式なし |

**分類:** **今回非対象（MVP）** — 4 ファミリ直交マッピング外。`unsupported` fail-closed。将来: Plane 退化（勾配0）または専用バリアントとして監督判断。

---

#### 3.4.4 タイプ４（§6.3.4, PDF p.130 / print p.130）

> 基準主桁の天端高から、同一セクション上で一定の勾配をもたせて、ほかの主桁の天端高を計算します。基準桁の天端高は、先に計算しておく必要があります。

| 項目 | 内容 |
| --- | --- |
| 入力 | 基準主桁（事前計算済み天端高）；同一セクション上の一定勾配 |
| 依存 | **計算順序依存**（基準桁先行） |
| ギャップ | 横断勾配の測定方向・閉形式なし |

**分類:** **今回非対象（MVP）** — 基準桁チェーンは D03 スコープの単純ファミリモデル外。`LINER_HAUNCH_REFERENCE_GIRDER_REQUIRED` 相当の順序依存。**監督判断が必要**（将来 Plane 派生か別モジュールか）。

---

#### 3.4.5 タイプ５（§6.3.5, PDF p.136 / print p.131）

> ２本の基準主桁の天端高を用いて、同一セクション上で比例計算を行ないます。基準桁の天端高は、先に計算しておく必要があります。

**分類:** **今回非対象（MVP）** — タイプ4と同様、基準桁チェーン。**監督判断が必要**。

---

#### 3.4.6 タイプ６（§6.3.6, PDF p.137 / print p.131）

> ３点のハンチ量または天端高を指定し、天端高の平面を決定します。

| 項目 | 内容 |
| --- | --- |
| 入力 | 3点のハンチ量または天端高 |
| 幾何 | 天端高の **平面**（アフィン） |
| ギャップ | 3点の座標系（測点×主桁？平面XY？）閉形式なし |

**分類:** **採用する公式意味論** → Three-point ファミリ（バリアント: `affine_plane_three_points`）

---

#### 3.4.7 タイプ７（§6.3.7, PDF p.137 / print p.131）

> １点のハンチ量または天端高と、縦方向の勾配、横方向の勾配から天端高の平面を決定します。

| 項目 | 内容 |
| --- | --- |
| 入力 | 1点 + 縦勾配 + 横勾配 |
| 幾何 | 平面 |
| ギャップ | 縦/横の基準軸定義なし |

**分類:** **採用する公式意味論** → Plane ファミリ（バリアント: `one_point_two_gradients`）

---

#### 3.4.8 タイプ８（§6.3.8, PDF p.138 / print p.132）

> ハンチ計算をするセクションの範囲を限定します。…次にまたこのタイプを使用するか、次のスパン名称を指定するまで、ここで指定した範囲内にあるセクションに対してのみハンチ計算が行なわれます。

| 項目 | 内容 |
| --- | --- |
| 入力 | 計算範囲セクション；範囲内支点セクション（§6.2 テクニック） |
| 効果 | 後続タイプの **セクションスコープ修飾** |
| 計算ライン | **指定不要**（§6.3 共通） |

**分類:** **採用する公式意味論** → Range ファミリ（`section_range_modifier`）

---

#### 3.4.9 タイプ９（§6.3.9, PDF p.138 / print p.132）

> ３点のハンチ量または天端高を与え、３点を通る２次曲線（放物線）を決定します。

| 項目 | 内容 |
| --- | --- |
| 入力 | 3点 |
| 幾何 | **放物線**（2次）— 平面ではない |
| ギャップ | 独立変数（測点？主桁位置？）と放物線係数の閉形式なし |

**分類:** **採用する公式意味論** → Three-point ファミリ（バリアント: `parabola_three_points`）。**MVP 採用（凍結 S9）:** 独立変数 \(u\) = girder に沿う physical station。

---

#### 3.4.10 タイプ１０（§6.3.10, PDF p.139 / print p.133）

> 基準桁のハンチ量、計算桁に向かう勾配などを与えて計算を行ないます。勾配折れラインは、勾配折れがある場合のみ指定して下さい。

**分類:** **今回非対象（MVP）** — 基準桁依存 + 折れ勾配。**監督判断が必要**（Plane 拡張 vs 将来）。

---

#### 3.4.11 タイプ１１（§6.3.11, PDF p.139 / print p.133）

> ある格点でのハンチ量が最小になる天端高の平面を、最小２乗法で決定します。

| 項目 | 内容 |
| --- | --- |
| 入力 | 複数格点データ（詳細は図 — PDF テキストにフィールド一覧なし） |
| 幾何 | 最小二乗平面 |
| ギャップ | 目的関数・格点集合の定義なし |

**分類:** **今回非対象（MVP）** — 最小二乗は O1 手計算が重い。**将来対象**（Plane ファミリ拡張候補）。

---

#### 3.4.12 タイプ１２（§6.3.12, PDF p.139 / print p.133）

> LINER で計算された２つの高さ（Ｗと WG）の差からハンチ量を計算します。

| 項目 | 内容 |
| --- | --- |
| 入力 | 線形計算マスタの W と WG（§5: WB 平均系） |
| 出力 | ハンチ高 = W − WG（意味論 — §5 p.68–69） |
| 依存 | **LINER 線形計算先行必須**；WG は帳票非出力 |

**分類:** **旧製品固有 / 今回非対象** — マスタファイル・線形データ番号依存。当プロジェクトに W/WG パイプラインなし → `unsupported` fail-closed（`LINER_HAUNCH_LINER_HEIGHT_REQUIRED`）。

---

#### 3.4.13 タイプ１３（§6.3.13, PDF p.140 / print p.134）

> 平面主桁長に比例してハンチ量を変化させます。

**分類:** **今回非対象（MVP）** — 「平面主桁長」比例の閉形式なし。**監督判断が必要**（Two-point 派生か）。

---

#### 3.4.14 タイプ１４（§6.3.14, PDF p.140 / print p.134）

> ２点のハンチ量または天端高とある主桁に対する法線方向の勾配から、天端高の平面を決定します。

| 項目 | 内容 |
| --- | --- |
| 入力 | 2点 + 主桁法線方向勾配 |
| 幾何 | 平面 |

**分類:** **公式意味論は採用** → Plane ファミリ（バリアント: `two_points_normal_gradient`）。**MVP defer（凍結 S14）:** Plane MVP は Type 7 のみ。Type 14 → `LINER_HAUNCH_UNSUPPORTED_TYPE`。

---

#### 3.4.15 タイプ１５（§6.3.15, PDF p.141 / print p.135）

> 基準主桁上の３点のキャンバーから３点を通る円弧を求め、セクション上の勾配なりに移動させる。このタイプを使用する前に、タイプ６，７，１４で主桁天端の平面を決定しておいて下さい。

**分類:** **今回非対象** — 円弧 + タイプ6/7/14 前提。**監督判断が必要**。

---

#### 3.4.16 タイプ１６（§6.3.16, PDF p.141 / print p.135）

> 対角線のハンチ量が等しくなる平面を決定します。

**分類:** **今回非対象（MVP）** — 対角線・平面の閉形式なし。**将来対象**（Plane ファミリ）。

---

#### 3.4.17 タイプ１７（§6.3.17, PDF p.142 / print p.136）

> ハンチ量または天端高をすべて入力します。

**分類:** **今回非対象** — 手入力テーブル（計算ではなく直接指定）。当プロジェクトは計算モジュール；直接入力行は別 concern。

---

### 3.5 §6.4 出力項目変更（PDF p.142 / print p.136）

> 帳票の出力項目名称の変更を行なう。

**分類:** **UI参考のみ** / **今回非対象**（帳票名称カスタム）。

---

## 4. Four type families mapping

### 4.1 正本ファミリ（プロジェクト — D03-C02 必須）

| Family | JIP タイプ対応（意味論） | MVP | 備考 |
| --- | --- | --- | --- |
| **Two-point** (`two_point`) | 1, 2 | **対象** | 13 は将来 |
| **Three-point** (`three_point`) | 6, 9 | **対象** | 6=アフィン平面；9=放物線（凍結 S9） |
| **Plane** (`plane`) | 7（MVP）；14 は将来 | **対象** | 11, 16 は将来；14 は凍結 S14 defer |
| **Range** (`range`) | 8 | **対象** | 後続定義のスコープ修飾 |

### 4.2 JIP タイプ → ファミリ対応表（全17件）

| JIP type | 名称（§6 要約） | Family | MVP | Fail-closed code |
| --- | --- | --- | --- | --- |
| 1 | 2支点直線 + 平面主桁長比例 | two_point | ✅ | — |
| 2 | 1支点 + 進行勾配直線 | two_point | ✅ | — |
| 3 | 一定ハンチ | — | ❌ | `LINER_HAUNCH_UNSUPPORTED_TYPE` |
| 4 | 基準桁 + 横断勾配 | — | ❌ | `LINER_HAUNCH_UNSUPPORTED_TYPE` |
| 5 | 2基準桁比例 | — | ❌ | `LINER_HAUNCH_UNSUPPORTED_TYPE` |
| 6 | 3点平面 | three_point | ✅ | — |
| 7 | 1点 + 縦横勾配平面 | plane | ✅ | — |
| 8 | セクション範囲限定 | range | ✅ | — |
| 9 | 3点放物線 | three_point | ✅ | — |
| 10 | 基準桁 + 勾配折れ | — | ❌ | `LINER_HAUNCH_UNSUPPORTED_TYPE` |
| 11 | 最小二乗平面 | plane (future) | ❌ | `LINER_HAUNCH_UNSUPPORTED_TYPE` |
| 12 | W − WG 差分 | — | ❌ | `LINER_HAUNCH_LINER_HEIGHT_REQUIRED` |
| 13 | 平面主桁長比例ハンチ | — | ❌ | `LINER_HAUNCH_UNSUPPORTED_TYPE` |
| 14 | 2点 + 法線勾配平面 | plane | ❌ | `LINER_HAUNCH_UNSUPPORTED_TYPE` |
| 15 | 円弧キャンバー | — | ❌ | `LINER_HAUNCH_UNSUPPORTED_TYPE` |
| 16 | 対角等ハンチ平面 | plane (future) | ❌ | `LINER_HAUNCH_UNSUPPORTED_TYPE` |
| 17 | 全手入力 | — | ❌ | `LINER_HAUNCH_UNSUPPORTED_TYPE` |

**PDF に無いタイプ番号:** 常に `unsupported` fail-closed（巨大 switch 禁止 — union で表現）。

### 4.3 Discriminated union 提案（実装向けメモ — STEP C 参照）

```typescript
// 記録のみ — 本 STEP ではコード変更なし
type HaunchDefinition =
  | { family: "two_point"; variant: "two_support_points" | "one_point_longitudinal_gradient"; ... }
  | { family: "three_point"; variant: "affine_plane_three_points" | "parabola_three_points"; ... }
  | { family: "plane"; variant: "one_point_two_gradients" | "two_points_normal_gradient"; ... }
  | { family: "range"; variant: "section_range_modifier"; ... };
```

JIP 生の `type: 1..17` を API 表面に露出しない。legacy import（D07）でのみ番号→union 変換を検討。

---

## 5. Geometric / numeric definitions（プロジェクト O1 — not in JIP §6 closed form）

> **Explicit statement:** JIP-LINER manual §6（PDF 131–142 / print 125–136）には、ハンチ量・天端高を計算する **閉形式の数式・座標定義は一切記載されていない**。本節は Stage 8 **R8-13**（O1 hand planes/lines + COMBINED elevation register）および [numerical_accuracy.md](../design/numerical_accuracy.md) に基づく **プロジェクト幾何補完** であり、JIP PDF からの直接転記ではない。不明点は fail-closed。

### 5.1 Common primitives

| Symbol | Definition |
| --- | --- |
| Station \(s\) | `physicalDistance` along active alignment |
| Section \(\Sigma(s)\) | `SectionSliceResult` at \(s\) from `buildIntermediateResult` |
| Girder line \(G\) | Offset line / centerline identified by `lineId` |
| \(P(G,\Sigma)\) | Intersection of girder \(G\) with section \(\Sigma\) in plan \((x,y)\). Missing → `LINER_HAUNCH_DEGENERATE_GEOMETRY` |
| \(z_{\text{profile}}(s)\) | Vertical pipeline elevation datum at \(s\) (profile sample) |
| \(t_{\text{pad}}\) | `pavementPlusDeckThicknessM` when applicable |
| Input mode | **凍結 S16:** `anchor.mode: "elevation" \| "haunch"` per point — conversion below is project freeze, not JIP |

**Tolerance:** coordinates 1e-6 m; elevation 1e-6 m (numerical_accuracy); compare **COMBINED** elevation register per R8-13.

**Haunch ↔ top elevation (project freeze — supervisor S3):**

\[
z_{\text{top}} = z_{\text{ref}} + h_{\text{haunch}}
\]

where \(z_{\text{ref}}\) = `buildIntermediateResult` の **profile elevation**（profile-only MVP；deck-aware 変換は将来 — **凍結 S3**）。入力 `haunch` 時 \(z_{\text{top}}=z_{\text{ref}}+h\)；`elevation` 時 \(h=z_{\text{top}}-z_{\text{ref}}\)。

### 5.2 Two-point family

**JIP semantic mapping:** タイプ1（2支点直線）、タイプ2（1点+縦勾配）

**Variant A — two support points (type 1):**

Anchors \(A_1=(s_1, z_1)\), \(A_2=(s_2, z_2)\) on girder \(G\) (support sections).

\[
z(s) = z_1 + \frac{s - s_1}{s_2 - s_1}(z_2 - z_1), \quad s \in [s_1, s_2]
\]

Type 1 additional JIP text: 桁上縁は支点天端高と **平面主桁長** で比例。**凍結 S15:** O1 = support 交点間の **chord length**（plan XY on girder）。

**Variant B — one point + longitudinal gradient (type 2):**

\[
z(s) = z_0 + g_{\parallel}(s - s_0)
\]

\(g_{\parallel}\) = user gradient along alignment/girder forward direction. **Gap:** JIP does not specify sign convention for \(g_{\parallel}\) — **fail-closed** if gradient dimensionally invalid.

**Degenerate:** \(s_1 = s_2\) → `LINER_HAUNCH_DEGENERATE_GEOMETRY`.

### 5.3 Three-point family

**JIP semantic mapping:** タイプ6（3点平面）、タイプ9（3点放物線）

**Variant A — affine plane (type 6):**

Three anchors \((x_i, y_i, z_i)\), \(i=1..3\), with \((x,y)\) = plan position of anchor on girder/section frame.

\[
\begin{bmatrix} x & y & 1 \end{bmatrix} \begin{bmatrix} a \\ b \\ c \end{bmatrix} = z
\]

Solve for \(a,b,c\); \(z(x,y) = ax + by + c\) at evaluation points.

**Degenerate:** collinear anchors → `LINER_HAUNCH_DEGENERATE_GEOMETRY`.

**Variant B — parabola (type 9) — frozen S9:**

\[
z(u) = au^2 + bu + c
\]

through three \((u_i, z_i)\). Independent variable \(u\) = **physical station along girder**（凍結 S9）。MVP three_point に含める。

### 5.4 Plane family

**JIP semantic mapping:** タイプ7（1点+縦横勾配）、タイプ14（2点+法線勾配）

**Variant A — one point + two gradients (type 7):**

\[
z(s, d) = z_0 + g_{\parallel}(s - s_0) + g_{\perp}(d - d_0)
\]

\(d\) = lateral offset along section traverse from reference girder; \(g_{\parallel}\), \(g_{\perp}\) user-supplied.

**Variant B — two points + normal gradient (type 14) — MVP defer (frozen S14):**

Determine plane through two anchor elevations plus gradient constraint along girder normal in plan. **Not in MVP** — maps to `LINER_HAUNCH_UNSUPPORTED_TYPE`. Future O1 may use explicit 3×3 linear system; degenerate → `LINER_HAUNCH_DEGENERATE_GEOMETRY`.

### 5.5 Range family

**JIP semantic mapping:** タイプ8

Range modifier on definition chain:

\[
\mathcal{S}_{\text{active}} = \{ s \mid s_{\text{from}} \le s \le s_{\text{to}} \}
\]

Subsequent definitions in the same span apply only at \(s \in \mathcal{S}_{\text{active}}\) until next range modifier or span end.

**Fail-closed:**

- \(s_{\text{from}} > s_{\text{to}}\) → `LINER_HAUNCH_RANGE_INVALID`
- Range outside alignment → `LINER_HAUNCH_STATION_OUT_OF_RANGE`
- Overlapping incompatible range modifiers → `LINER_HAUNCH_OVERLAPPING_RANGE` (scope abnormal)

Range produces **no numeric row by itself** — scope modifier only (diagnostics if orphaned).

### 5.6 Sign / side / thickness

| Topic | JIP §6 | Project |
| --- | --- | --- |
| `side` (left/right/both) | 未定義 | **凍結 S6:** optional `left` \| `right` \| `both`；省略時は定義の計算ライン全件 |
| `haunchThicknessM` | 「ハンチ量」語のみ | **凍結 S3/S6:** 厚さ符号 正 = ref より上（\(h>0\)）；\(h = z_{\text{top}} - z_{\text{ref}}\) |
| Negative haunch | 本文無記載 | R8-13 / scope: forbidden case → `LINER_HAUNCH_NEGATIVE_THICKNESS` |
| Gradient sign | 未記載 | User-declared; invalid → validation error |

---

## 6. algorithmVersion

| Version | Scope |
| --- | --- |
| `haunch-0.1.0` | Initial: four families per §4–§5; MVP variants per §4.2 ✅ rows; fail-closed per §7 |

Bump policy: any change to §5 geometric definitions or MVP variant set requires new `algorithmVersion` and updated O1 fixtures.

---

## 7. Diagnostics codes（提案）

| Code | Condition | Level |
| --- | --- | --- |
| `LINER_HAUNCH_UNSUPPORTED_TYPE` | JIP type or variant not in MVP union | error |
| `LINER_HAUNCH_INVALID_REFERENCE` | Unknown alignment / line / section / deck ref | error |
| `LINER_HAUNCH_PROFILE_UNAVAILABLE` | No profile at station | error |
| `LINER_HAUNCH_STATION_OUT_OF_RANGE` | Station outside alignment or definition range | error |
| `LINER_HAUNCH_RANGE_INVALID` | Invalid range bounds (type 8) | error |
| `LINER_HAUNCH_OVERLAPPING_RANGE` | Incompatible overlapping modifiers | error |
| `LINER_HAUNCH_DEGENERATE_GEOMETRY` | Collinear anchors, zero divisor, missing intersection | error |
| `LINER_HAUNCH_NEGATIVE_THICKNESS` | Negative haunch where forbidden | error |
| `LINER_HAUNCH_REFERENCE_GIRDER_REQUIRED` | Types 4/5/10/12/15 chain — MVP rejects | error |
| `LINER_HAUNCH_LINER_HEIGHT_REQUIRED` | Type 12 without W/WG pipeline | error |
| `LINER_HAUNCH_COLLINEAR_ANCHORS` | Three-point degenerate (optional split from DEGENERATE) | error |

**Policy:** error-level → no silent row omission; export blocked when `hasHaunchErrors` (D02 `hasLdistErrors` パターン).

---

## 8. O1 fixture plan（D03-C03）

| Fixture ID | Family | Scenario | Oracle | Validates |
| --- | --- | --- | --- | --- |
| `gc-haunch-two-point-linear` | two_point | Straight alignment; 2 support stations; known elevations | Hand: linear \(z(s)\) | Type 1 semantics |
| `gc-haunch-two-point-gradient` | two_point | One anchor + positive \(g_{\parallel}\) | Hand: \(z_0 + g(s-s_0)\) | Type 2 semantics |
| `gc-haunch-three-point-plane` | three_point | 3 non-collinear plan anchors | Hand: solve \(ax+by+c=z\) | Type 6 semantics |
| `gc-haunch-three-point-parabola` | three_point | 3 stations on girder | Hand: Lagrange quadratic | Type 9 semantics — **MVP 必須** |
| `gc-haunch-plane-gradients` | plane | 1 anchor + \(g_{\parallel}, g_{\perp}\) | Hand: §5.4 Variant A | Type 7 semantics — **Plane O1 最小必須** |
| `gc-haunch-plane-normal` | plane | 2 anchors + normal gradient | Hand: 3×3 plane system | Type 14 semantics — **将来/任意**（S14 defer） |
| `gc-haunch-range-filter` | range | Type 8 modifier; inner two-point def | Hand: rows only inside range | Type 8 semantics |
| `gc-haunch-degenerate-collinear` | three_point | Collinear anchors | Expect `LINER_HAUNCH_DEGENERATE_GEOMETRY` | Fail-closed |
| `gc-haunch-unsupported-type-12` | — | Legacy type 12 mapping attempt | Expect `LINER_HAUNCH_LINER_HEIGHT_REQUIRED` | Fail-closed |

**Minimum for D03-C03:** ≥1 per family (four families) — rows marked ✅ in §4.2 MVP column. Type 9: `gc-haunch-three-point-parabola` **必須**。Plane O1 最小: `gc-haunch-plane-gradients` のみ必須。`gc-haunch-plane-normal` は将来/任意（S14 defer）。

**Tolerance:** elevation 1e-6 m (numerical_accuracy + R8-13 COMBINED).

**Fixture location (implementation phase):** `frontend/src/liner/core/haunch/__tests__/fixtures/` (proposed).

---

## 9. Persistence binding（cross-reference）

- Inputs only: `domainDraft.haunchDefinitions[]` in geometry extension v0.2.0 — **凍結 S17:** span/alignment 内の **ordered list**（JIP タイプ列に相当）；Range(type8) は後続定義のスコープ修飾
- No persisted result cache
- RDD `schemaVersion` 0.1.0
- `haunchCapability.state: "supported"` when definitions exist

---

## 10. Mapping to completion gate

| Gate | This document |
| --- | --- |
| D03-C01 | Supervisor signs §12 below |
| D03-C02 | Four families §4.1 |
| D03-C03 | O1 fixtures §8 |
| D03-C05 | Fail-closed §7 |

---

## 11. Open items — Supervisor freeze

`P4_D03_EXTRACTION_VERDICT`: **APPROVED**（2026-07-21）。以下は監督凍結。実装・O1 は本節に従う。

| # | Freeze |
| --- | --- |
| **S3** | \(z_{\text{ref}}\) = `buildIntermediateResult` の **profile elevation**（profile-only MVP）。deck-aware 変換は将来。入力 `haunch` 時 \(z_{\text{top}}=z_{\text{ref}}+h\)；`elevation` 時 \(h=z_{\text{top}}-z_{\text{ref}}\)。 |
| **S6** | `side`: optional `left` \| `right` \| `both`。省略時は定義の計算ライン全件。厚さ符号: 正 = ref より上（\(h>0\)）。 |
| **S9** | Type 9 放物線を **MVP three_point に含める**。独立変数 \(u\) = girder に沿う physical station。 |
| **S14** | Type 14 は **MVP defer**。Plane MVP は Type 7 のみ。Type 14 → `LINER_HAUNCH_UNSUPPORTED_TYPE`。 |
| **S15** | Type 1「平面主桁長」O1 = support 交点間の **chord length**（plan XY on girder）。 |
| **S16** | `anchor.mode: "elevation" \| "haunch"` per point — 採用。 |
| **S17** | `haunchDefinitions[]` は span/alignment 内の **ordered list**（JIP タイプ列に相当）。Range(type8) は後続定義のスコープ修飾。 |

---

## 12. Supervisor extraction approval

| Field | Value |
| --- | --- |
| Document | `docs/road/phase4/p4_d03_haunch_extraction_record.md` |
| Status | **APPROVED** |
| `P4_D03_EXTRACTION_VERDICT` | **APPROVED** |
| Semantic authority | JIP §6 PDF pp.131–142 / print pp.125–136 |
| Geometric O1 | §5 (explicit: not JIP closed form) |
| Supervisor freezes | S3, S6, S9, S14, S15, S16, S17 — §11 |
| algorithmVersion | `haunch-0.1.0` |
| Supervisor | Cursor Grok 4.5 |
| Approval date | 2026-07-21 |
| Signature / record | Approved by Cursor Grok 4.5 — EXTRACTION_VERDICT APPROVED with freezes S3/S6/S9/S14/S15/S16/S17 |

**D03-C01:** Satisfied by supervisor APPROVED (2026-07-21).

---

## 13. Worker verdict recommendation

| Verdict | **`P4_D03_EXTRACTION_VERDICT: APPROVED`**（監督承認 2026-07-21） |
| --- | --- |
| Rationale | D02 と同パターン: JIP §6 に閉形式は無いが、17 タイプの意味論を全件一覧化し、4 ファミリへの MVP マッピングとギャップを明示済み。§5 の O1 補完で R8-13 最小セット（ファミリごと ≥1）が定義可能。unsupported タイプは fail-closed。推測実装は記録していない。 |
| NOGO would apply if | 監督が 4 ファミリ縮小を要求、または S3/S9/S15 を本稿で凍結できず O1 が一意に定まらないと判断した場合 |
| Residual risk | JIP 原文に数式が無いため、JIP 厳密互換は **claim しない**。互換対象は **意味論 + プロジェクト O1** に限定。 |

---

## 14. Revision log

| Date | Change |
| --- | --- |
| 2026-07-21 | Initial PROPOSED — JIP §6 PDF extraction; 17 types catalogued; 4-family mapping; R8-13 O1 geometric supplement |
| 2026-07-21 | **APPROVED** — `P4_D03_EXTRACTION_VERDICT` APPROVED; supervisor freezes S3/S6/S9/S14/S15/S16/S17 recorded in §11; §4.2 / §8 fixture plan updated |
