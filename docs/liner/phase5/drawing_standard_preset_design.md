# Drawing Standard Preset Design

> Status: `READY_WITH_OPEN_DECISIONS`
> Date: 2026-07-13
> Phase: Phase 5 / Preset
> Readiness: `README.md` の `READY_WITH_OPEN_DECISIONS`
> Related docs: [README.md](README.md), [formal_drawing_ui_design.md](formal_drawing_ui_design.md), [dxf_export_design.md](dxf_export_design.md), [phase5_liner_formal_drawing_design.md](phase5_liner_formal_drawing_design.md)

## 1. 確認済み事実

- `drawing-core` を基盤に、`mlit-cad-r7.12` を経由して `client-preset` に落とす階層候補が必要である。
- 国土交通省 CAD 製図基準 令和7年12月版の図面表現・レイヤ・用紙・尺度等を参考にした preset 候補を扱う。
- DXF は formal output の唯一の表現ではなく、`drawing-core` / `mlit-cad-r7.12` / `client-preset` の各層で意味を分離する。

## 2. 提案

### 2.1 preset 階層

```mermaid
flowchart LR
  CORE["drawing-core"]
  MLIT["mlit-cad-r7.12"]
  CLIENT["client-preset"]

  CORE --> MLIT --> CLIENT
```

`drawing-core` は最小共通定義、`mlit-cad-r7.12` は国交省基準の参照層、`client-preset` は案件ごとの上書き層とする。

### 2.2 preset に含める項目

- `layer`
- `sheet`
- `title`
- `scale`
- `text`
- `lineweight`
- `band`
- `version`
- `fallback`
- `warning`
- `OD` 参照
- `revision`

### 2.3 layer / sheet / title

- `layer`: 役割ベースの semantic layer を採用する
- `sheet`: plan / profile / cross-section ごとに独立管理する
- `title`: 版数、図種、対象区間を明示する
- `layer` の後段変換は manual からの GCONVA 後段 layer 変換概念のみを参照し、製品固有変換は採用しない

### 2.4 scale / text / lineweight

- `scale` は図面種別ごとに既定値を持つ
- `text` は日本語を前提にし、文字高を preset 側で固定する
- `lineweight` は printer / PDF / DXF の差を吸収できるよう tier 化する
- `scale` / `text` / `lineweight` は案件差分が大きい前提で、電子納品成果として扱える旨を示す候補定義として扱う

#### 2.4.1 図種別 `textHeightMm`（凍結決定 DD-TR-01）

Phase 5 Step 2 screen の paper 文字高。`minReadableTextHeightMm = 7` を全図種の下限とする。

| 図種 | 用途 | mm |
| --- | --- | --- |
| plan | 幾何注記（測点・曲線） | 7 |
| plan | 方位・縮尺 | 10 |
| plan / profile | 帯 値 | 7 |
| plan / profile | 帯 ラベル | 8 |
| profile | 幾何注記 | 7 |
| cross-section | タイトル・点注記 | 7 |

screen への写像時は [formal_drawing_ui_design.md](formal_drawing_ui_design.md) §2.9 の px clamp を適用する。builder は mm、renderer / workspace は px 責務境界とする。

### 2.5 band

band は profile を中心に、station と注記密度を支える補助 preset とする。plan では省略可能、profile では標準、cross-section では最小限に留める。

### 2.6 version / fallback / warning

version は preset の適用元を追跡できるようにし、fallback は `drawing-core -> mlit-cad-r7.12 -> client-preset` の順で解決する。warning は案件差分、基準版差分、SXF 未保証、DXF と正式 SXF の非同一性を明示するために使用する。

### 2.7 report wording

以下の断定表現は使わない。

- 準拠
- 適合
- 電子納品成果として扱える旨

代わりに、`国土交通省CAD製図基準 令和7年12月版の図面表現・レイヤ・用紙・尺度等を参考にしたpreset候補` という文言を使う。

## 3. Open Decision

| ID | 論点 | 未決理由 | Step2影響 | Step3影響 | 推奨初期値 | 参照 OD | 決定後に更新する文書 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| OD-PS-01 | standard preset の粒度 | 案件差分をどこまで吸収するか | 中 | 高 | 3層固定 | `README.md` の OD-03 / OD-04 | `README.md`, `phase5_liner_formal_drawing_design.md` |
| OD-PS-02 | title block の必須項目 | 納品先差分を整理したい | 中 | 高 | 図種 / 区間 / 版数 / 日付 | `README.md` の OD-07 | `README.md`, `phase5_liner_formal_drawing_design.md` |
| OD-PS-03 | text style の統一単位 | screen と DXF の差を減らしたい | 中 | 高 | mm ベース | `README.md` の OD-09 | `README.md`, `drawing_standard_preset_design.md` |
| OD-PS-04 | lineweight の正規化段数 | 表示崩れを抑えたい | 中 | 高 | 3段階 | `README.md` の OD-12 | `README.md`, `drawing_standard_preset_design.md` |
| OD-PS-05 | report wording | 誤認防止と案件説明を両立したい | 中 | 高 | 断定しない参考表現 | `README.md` の OD-15 | `README.md`, `drawing_standard_preset_design.md` |
| OD-PS-06 | fallback 解決順 | preset の解決失敗を避けたい | 高 | 高 | `drawing-core -> mlit-cad-r7.12 -> client-preset` | `README.md` の OD-03 / OD-05 | `README.md`, `drawing_standard_preset_design.md` |
| OD-PS-07 | warning 表示条件 | 利用者へ差分を伝えたい | 中 | 高 | 基準差分 / 互換差分 / 未保証を表示 | `README.md` の OD-10 | `README.md`, `formal_drawing_ui_design.md` |

## 4. Acceptance Criteria

- preset が `drawing-core -> mlit-cad-r7.12 -> client-preset` で構成される
- layer / sheet / title / scale / text / lineweight / band / version / fallback / warning が定義される
- 国土交通省 CAD 製図基準 令和7年12月版を参考にした候補であることが明示される
- 直轄 / NEXCO / 自治体差分を preset の上書き層で分離できる
- README の関連 OD ID を参照できる
