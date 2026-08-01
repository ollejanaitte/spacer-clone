# Program Responsibility Matrix (Part 3)

| Program | Evidence role | Sources | Notes |
|---|---|---|---|
| Girder | 主桁断面の設計。断面力は構造解析とリンクし補間 | MAN-021 §3-4; MAN-008 | 自動設計内「断面計算と添接計算」との対応は名称類似、1:1未証明 |
| Section | 汎用断面計算。CADライク形状。.sec/.csv/rtf | MAN-021; MAN-062 | MAN-061はSUPPORT差分確認用。版断定しない |
| Isection | Ｉ型断面。非合成等に適用可能 | MAN-021; MAN-061/062 | |
| Splice | 添接計算。.spl、RTF | MAN-021; MAN-009; MAN-063 | 単体と自動設計内添接の関係は機能隣接、同一プロセス未証明 |

## Distinctions
- 入力 vs 結果、添接位置 vs 断面変化、描画制限 vs 計算制限を混同しない
- Analyzer詳細は Part 5
