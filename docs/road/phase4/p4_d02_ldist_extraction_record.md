# P4-D02 LDIST Extraction Record

**Date:** 2026-07-17
**Status:** APPROVED — supervisor extraction approval (2026-07-17)

**Scope parent:** [p4_d02_scope.md](p4_d02_scope.md)
**Phase 4 parents:** [phase4_planning_freeze.md](phase4_planning_freeze.md), [phase4_design_document.md](phase4_design_document.md), [phase4_completion_gate.md](phase4_completion_gate.md)
**Completion gate:** D02-C01（本書の監督承認で充足）
**algorithmVersion (proposed):** `ldist-0.1.0`

---

## 1. Purpose

JIP-LINER マニュアル §5.8 から **semantic authority** を抽出し、§5.8 本文に存在しない幾何定義を **Stage 8 R8-12 O1 oracle** で明示する。数式の捏造を避けつつ、P4-D02 実装・Vitest O1 baseline の根拠文書とする。

---

## 2. Source document

| Field | Value |
| --- | --- |
| File | `マニュアル/JIP-LINER_マニュアル.pdf` |
| Extraction method | `pdftotext -layout`（2026-07-17） |
| Semantic authority section | **§5.8 格点間距離チェック** |
| PDF pages | **128–130** |
| Print pages (footer) | **122–124** |

---

## 3. Semantic citations（JIP §5.8 原文要約）

### 3.1 §5.8.1 スパン一覧（PDF p.128 / print p.122）

> 格点間距離または張り出し長の帳票出力を行なうスパン名称を指定します。

- 帳票対象スパンの追加・編集・削除 UI
- スパン追加後は格点間距離編集画面へ遷移

**採用:** 意味論のみ（スパンは当プロジェクトでは optional `spanId` filter にマッピング — 監督凍結 N3）
**不採用:** スパン一覧 UI、帳票ビューワ、`.lin` データブロック

### 3.2 §5.8.2 格点間距離（PDF p.129 / print p.123）

> **距離の計算方法** — セクション上の距離をそのまま出力するか、セクション上の距離に基準ラインとの交角のサインの値を乗じた距離を出力するかを選択します。後者を選択した場合は、その基準ラインを指定します。

> **計算ライン（主桁）** — 帳票出力するライン（主桁）名称を１行に１つずつ指定します。

> **計算セクション** — すべて出力するか、または出力する名称を指定するかを選択できます。

**採用（意味論）:**

| JIP ラベル | プロジェクト対応 |
| --- | --- |
| 距離をそのまま（モード A） | `distanceMode: "mode_a"` |
| 交角のサインを乗じる（モード B） | `distanceMode: "mode_b"` + `referenceLineId` 必須 |
| 計算ライン（主桁） | `pairs[].fromLineId` / `toLineId`（明示ペア） |
| 計算セクション | `sectionIds[]` または全セクション |

**ギャップ（本文に無いもの）:**

- 「セクション上の距離」の plan XY 幾何定義（閉形式なし）
- 「交角のサイン」の符号・角度測定法の数式（閉形式なし）
- ライン間の全組合せ規則（ペア列挙か直積か — 本文無記載）

### 3.3 §5.8.3 張り出し長（PDF p.130 / print p.124）

> 表示中のスパンで張り出し長を帳票出力するには、張り出し長を出力するをチェックし、左側ライン・右側ラインと計算セクションを指定します。計算セクションは、すべて出力するか、または出力する名称を指定するかを選択できます。指定方法は、格点間距離の編集画面と同じです。

**採用（意味論）:** 左ライン・右ライン・セクション scope・出力有効フラグ
**ギャップ:** 張り出しの基準線（ピア？支承？）の幾何定義式は §5.8.3 本文に **無し**

### 3.4 関連（参考・非 authority）

| Location | Note | 分類 |
| --- | --- | --- |
| §1.2 p.2 | LDIST = 格点間距離・張り出し長の出力 | モジュール名確認 |
| §2.3 p.16–17 | LS1=構文、LS2=結果 | 記録のみ無視（N3） |
| §3.5.2 p.25 | LDIST 帳票実行；LS1/LS2 記述矛盾 | 記録のみ無視 |
| §6+ | ハンチ | P4-D03 境界 |
| §7+ | 舗装厚 | P4-D04 境界 |
| §8.8 p.151 | ライン間寸法（垂直 vs セクション上） | P4-D05 参考 |

---

## 4. Geometric definitions（プロジェクト O1 — not in JIP §5.8 closed form）

> **Explicit statement:** JIP-LINER manual §5.8（PDF 128–130）には、以下の幾何量を計算する **閉形式の数式・座標定義は記載されていない**。本節は Stage 8 **R8-12**（O1 vector distance / projection hand calc）および監督凍結 **N1** に基づくプロジェクト正本である。JIP 原文の「サイン」と本節の \(\sin(\theta_{\text{ref}})\) は、R8-12 O1 採用のための **プロジェクト幾何補完** であり、JIP PDF からの直接転記ではない。

### 4.1 Common primitives

| Symbol | Definition |
| --- | --- |
| Station \(s\) | `physicalDistance` along active alignment |
| Section \(\Sigma(s)\) | `SectionSliceResult` at \(s\) from `buildIntermediateResult` |
| Line \(L\) | Offset line or centerline identified by `lineId` |
| \(P(L,\Sigma)\) | Unique intersection of line \(L\) with section \(\Sigma\) in **plan XY** \((x,y)\). Missing intersection → `LINER_LDIST_DEGENERATE_GEOMETRY` |
| \(\mathbf{v}(L)\) | Unit direction of line \(L\) at \(\Sigma\) in plan (tangent of offset trace at station) |
| \(\mathbf{v}(\Sigma)\) | Section traverse direction (left → right edge unit vector in plan) |

Tolerance: [`numerical_accuracy.md`](../design/numerical_accuracy.md) — coordinates 1e-6 m; offset inverse 1e-4 m; compare ABS distance register per R8-12.

### 4.2 Grid distance — Mode A (`mode_a`)

**JIP semantic mapping:** 「セクション上の距離をそのまま出力」

For each explicit pair \((L_{\text{from}}, L_{\text{to}})\) in `job.pairs[]`, station \(s\), section \(\Sigma\):

\[
P_{\text{from}} = P(L_{\text{from}}, \Sigma), \quad P_{\text{to}} = P(L_{\text{to}}, \Sigma)
\]

\[
d = \| P_{\text{from}} - P_{\text{to}} \|_2 \quad \text{(m, plan XY)}
\]

Output: `distanceM = d`, `fromLineId`, `toLineId`, `signConvention: "mode_a_unsigned"`.

### 4.3 Grid distance — Mode B (`mode_b`)

**JIP semantic mapping:** 「セクション上の距離に基準ラインとの交角のサインの値を乗じた距離」

Let \(L_{\text{ref}}\) = `referenceLineId` (required). Define:

\[
\theta_{\text{ref}} = \angle\bigl(\mathbf{v}(\Sigma),\, \mathbf{v}(L_{\text{ref}})\bigr) \in [0, \pi]
\]

\[
d_{\text{base}} = \| P_{\text{from}} - P_{\text{to}} \|_2
\]

\[
d = d_{\text{base}} \times \sin(\theta_{\text{ref}})
\]

**Fail-closed:**

- `referenceLineId` missing → `LINER_LDIST_REFERENCE_LINE_REQUIRED` (job validation)
- \(|\sin(\theta_{\text{ref}})| \le \varepsilon\) (degenerate) → `LINER_LDIST_DEGENERATE_GEOMETRY` (row error, no numeric result)
- Coincident \(P_{\text{from}} = P_{\text{to}}\) → `LINER_LDIST_DEGENERATE_GEOMETRY`

Output: `distanceM = d`, `signConvention: "mode_b_sin_theta_ref"`.

**Note on JIP 「サイン」 vs \(\sin\):** JIP text says サイン (sign/sine ambiguous in context). Project freezes **\(\sin(\theta_{\text{ref}})\)** per supervisor N1 without further JIP survey.

### 4.4 Overhang (`kind: "overhang"`)

**JIP semantic mapping:** 左側ライン・右側ライン・計算セクション指定（§5.8.3）

**Default reference (supervisor N1):** **Pier line** from existing `pierLineGeometry`:

- Pier anchor = alignment point at station \(s\) for pier \(p\)
- Pier line direction = `pierLineDirectionFromSkew(azimuth, skewAngleRad)`
- Pier line \(\Pi(p,s)\) = infinite line through anchor with that direction

For side \(\in \{\text{left}, \text{right}\}\):

\[
P_{\text{side}} = P(L_{\text{side}}, \Sigma)
\]

\[
h_{\text{side}} = \text{distancePointToPierLine}(P_{\text{side}}, \text{anchor}, \text{azimuth}, \text{skew})
\]

(`distancePointToPierLine` = perpendicular distance in plan — existing implementation.)

Output: `overhangM = h_side`, `side`, `pierId` when applicable.

**Pier selection:**

- If exactly one pier applies at station \(s\) within job scope → implicit
- If multiple piers at \(s\) → `pierId` **required**; missing → `LINER_LDIST_PIER_ID_REQUIRED`

**Gap vs JIP:** §5.8.3 does not define whether overhang is perpendicular to pier line, along section, or along girder. Project freezes **perpendicular to pier line** via `distancePointToPierLine` (N1).

#### ASCII diagram (overhang — plan view)

```text
        L_left              L_right
          |                   |
          |    P_left    P_right
          ×--------+---------×  ← section Σ at station s
                   |
                   |  h_left = dist(P_left, pier line Π)
                   |
    ═══════════════╪════════════════  pier line Π (skew)
                   |
              (anchor on alignment)
```

### 4.5 Skew / curved context

R8-12 requires skew/curved girder cases. Skew enters via:

- Pier line skew (`skewAngleRad`) for overhang
- Line directions \(\mathbf{v}(L)\) at curved alignments sampled from pipeline (not straight-line shortcut)

No additional JIP formula extraction required for skew beyond §5.8 semantics + R8-12 O1.

---

## 5. O1 fixture plan（D02-C03）

| Fixture ID | Scenario | Oracle | Validates |
| --- | --- | --- | --- |
| `gc-ldist-straight-orthogonal` | Straight alignment; two parallel offset lines; orthogonal section | Hand: \(d = \|\Delta x\|\) or Pythagoras in plan | Mode A; pair distance |
| `gc-ldist-skew-pier` | Single skewed pier; left/right edge lines; one station | Hand: pier line + point-to-line distance | Overhang; `pierLineGeometry` |
| `gc-ldist-mode-b-sine` | Straight section; two lines; reference line at known angle | Hand: \(d_{\text{base}} \times \sin(\theta_{\text{ref}})\) | Mode B |
| `gc-ldist-degenerate-sin-zero` | Reference line parallel to section traverse | Expect `LINER_LDIST_DEGENERATE_GEOMETRY` | Mode B fail-closed |

**Tolerance:** length 1e-6 m (numerical_accuracy + R8-12 ABS distance register).

**Fixture location (implementation phase):** `frontend/src/liner/core/ldist/__tests__/fixtures/` (proposed).

---

## 6. algorithmVersion

| Version | Scope |
| --- | --- |
| `ldist-0.1.0` | Initial: Mode A/B per §4.2–4.3; overhang per §4.4; fail-closed diagnostics per scope §10 |

Bump policy: any change to §4 geometric definitions requires new `algorithmVersion` and updated O1 fixtures (no silent numeric drift).

---

## 7. Persistence binding（cross-reference N2）

- Inputs only: `domainDraft.ldistJobs[]` in geometry extension v0.2.0
- No persisted result cache
- RDD `schemaVersion` 0.1.0

---

## 8. Mapping to completion gate

| Gate | This document |
| --- | --- |
| D02-C01 | Supervisor signs §9 below |
| D02-C02 | `algorithmVersion` = §6 |
| D02-C03 | O1 fixtures §5 |
| D02-C05 | Fail-closed rows §4.3–4.4 |

---

## 9. Supervisor extraction approval

| Field | Value |
| --- | --- |
| Document | `docs/road/phase4/p4_d02_ldist_extraction_record.md` |
| Status required | APPROVED (changes PROPOSED → APPROVED) |
| Semantic authority | JIP §5.8 PDF pp.128–130 / print pp.122–124 |
| Geometric O1 | §4 (explicit: not JIP closed form) |
| algorithmVersion | `ldist-0.1.0` |
| Supervisor | Cursor Grok 4.5 |
| Approval date | 2026-07-17 |
| Signature / record | APPROVED — JIP §5.8 semantic + R8-12 geometric O1 freeze (N1); D02-C01 satisfied for implementation start |
| Notes | Mode B uses \(\sin(\theta_{\text{ref}})\) as project freeze; JIP 「サイン」ambiguity recorded. Overhang = perpendicular distance to pier line. |

**D02-C01:** Satisfied by this APPROVED record. Implementation may proceed under approved scope + plan; numeric COMPLETE still requires D02-C02..C07 evidence.

---

## 10. Revision log

| Date | Change |
| --- | --- |
| 2026-07-17 | Initial PROPOSED — post NOGO scope revision; N1 geometric freeze |
