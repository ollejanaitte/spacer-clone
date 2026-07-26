# 02 — System Overview

## APOLLO 全体構成（Evidence）

APOLLO は鋼橋設計システムの総称。次のサブシステムと市販アプリで構成される（MAN-021 §2-1-1）。

| コンポーネント | 責務 |
|----------------|------|
| Align | 線形計算 |
| Analyzer | 構造解析 |
| SuperDesigner | 自動設計（MS-Access DB 中心） |
| SuperDrawing | 自動製図 |
| y-Mater | 材料計算 |
| MS-Office / AutoCAD | 帳票・図面連携 |

出典: `summaries/apollo_system_overview.md`

## データフォルダ構成

```text
y-Design-Bridge/
  └── 工事名/
       ├── Align/    （線形データ）
       ├── Design/   （設計データ）
       └── Draw/     （図面データ）
```

Evidence: MAN-021 §4-1(5)

## ファイル形式と境界

| 形式 | 用途 | 本パッケージ |
|------|------|--------------|
| `.alg` | Align 線形データ | 同梱しない |
| `.mdb` | 設計 DB（Access） | 同梱しない |
| RTF | 計算書 | 形式言及のみ |
| GSP / DWG | 図面 | 同梱しない |
| NPDATA.txt | 材料計算入力 | 同梱しない |

## SuperDesigner 内部

- MS-Access データベースを中心に設計アプリ群（Slab, Girder, Floor, Splice 等）
- 非合成鈑桁コントロールでは「線形計算」「解析データ作成」「断面計算」等の実行ボタンが並ぶ（MAN-002）
- ボタン名と exe 名の 1:1 対応は資料上すべて明示されていない → **UNKNOWN**

## 解析ソフト（Analyzer）との境界

```text
SuperDesigner → 解析入力データ（物理形式 UNKNOWN）→ Analyzer → 結果 → 断面力変換 → 照査
```

- Analyzer 入力の物理形式はマニュアル上未確認（`features/feature_data_flow.md`）
- 格子解析マニュアル（MAN-002/007）が存在するが、本 Phase 1 では静的線形が前提
- 骨組み計算ソフト側の責務分割は **候補** として `docs/06_frame_analysis_boundary.md` を参照

## 今回対象: 非合成 RC 床版鋼鈑桁

- マニュアル群: MAN-001〜014（非合成鈑桁）、MAN-021（総論）
- 単体アプリ: Section, Splice 等（Phase 1 関連分）
- 詳細マニュアル一覧: `summaries/phase1_relevant_manuals.md`

## Stage 6 観点

骨組み計算ソフトは Analyzer 相当またはその代替モジュールとして、荷重モデルから断面力・反力・変位を返す境界が論点となる。APOLLO 側の DB 内部表現は本調査では確定していない。
