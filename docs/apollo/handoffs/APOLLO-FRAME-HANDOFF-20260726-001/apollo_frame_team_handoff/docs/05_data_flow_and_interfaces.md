# 05 — Data Flow and Interfaces

## APOLLO 設計データフロー（Interpretation）

```text
線形・橋梁幾何
    ↓
部材・断面
    ↓
荷重モデル
    ↓
骨組み解析入力
    ↓
断面力・反力・変位
    ↓
設計照査
    ↓
帳票・図面・材料
```

Evidence 起点: `features/feature_data_flow.md`, `features/feature_dependency_map.md`

## 各段の候補責務（断定しない）

| 段 | APOLLO 側（候補） | 骨組み計算ソフト側（候補） |
|----|-------------------|---------------------------|
| 線形・幾何 | Align / SuperDesigner DB | 幾何入力の受け取り or 独自定義 |
| 部材・断面 | Girder, Section, Splice | 断面プロパティの参照 |
| 荷重 | SuperDesigner 荷重入力 | 荷重ケース定義の共有 |
| 解析入力 | 解析データ作成（形式 UNKNOWN） | 節点・部材・荷重のモデル化 |
| 解析実行 | Analyzer | 静的線形解析エンジン |
| 結果 | 断面力変換 | 断面力・反力・変位の出力 |
| 照査 | Section, Girder 等 | 設計照査は APOLLO 側の可能性大 |
| 出力 | RTF, GSP, DWG, NPDATA | 帳票・図面は境界外の可能性 |

## ファイル・DB 境界（候補）

| 候補 I/O | 方向 | 状態 |
|----------|------|------|
| `.alg` 線形 | Align → Design | Evidence あり、本パッケージ非同梱 |
| `.mdb` 設計 DB | SuperDesigner 内部 | スキーマ UNKNOWN |
| Analyzer 入力 | Design → Analyzer | **物理形式 UNKNOWN** |
| 解析結果 | Analyzer → Design | **物理形式 UNKNOWN** |
| NPDATA.txt | Design → y-Mater | パス言及のみ |

詳細候補: `analysis-input/input_output_candidates.csv`, `analysis-input/frame_analysis_interface_candidates.csv`

## Stage 6 作業

1. 既存骨組み計算ソフトの入出力と上表を突合
2. `direction=APOLLO_TO_FRAME` / `FRAME_TO_APOLLO` 候補の採否
3. UNKNOWN 境界（Analyzer 物理形式）の調査計画

## 禁止

- 未確認のファイル形式を確定仕様として実装に着手すること
- READY 69 以外の I/O を優先実装すること
