# System Dependency Map

## Evidence ベースの依存（確認済み）

```mermaid
flowchart TD
  User[User input] --> Align
  Align -->|".alg"| SD[SuperDesigner]
  SD -->|design ".mdb"| SD
  SD -->|解析データ作成| AN[Analyzer]
  AN -->|断面力変換| SD
  SD -->|RTF| Word[MS-Word]
  SD -->|".mdb"| DR[SuperDrawing]
  DR -->|DWG or GSP| CAD[AutoCAD / RCCAD]
  DR -->|NPDATA.txt| YM[y-Mater]
  SD --> SA[Standalone programs]
  SA -->|RTF / .spl etc.| Word
```

## 非合成鈑桁（Phase1）操作ブロック

```mermaid
flowchart LR
  A[基本データ] --> B[格子解析]
  B --> C[RC床版]
  C --> D[主桁設計]
  D --> E[床組設計]
  E --> F[主桁補剛材]
  F --> G[鋼重]
  G --> H[疲労]
```

注: 矢印は MAN-002 の配置・推奨ガイドに基づく **Interpretation 寄りの要約図**。厳密依存は `unresolved_system_structure.md` 参照。

## 単体と自動設計

| 関係 | 判定 |
|---|---|
| 単体は SuperDesigner メニューから起動可能 | Evidence（MAN-021 §3-4, MAN-063） |
| 単体は自動設計以外でも単独利用可 | Evidence（MAN-021 §3-1） |
| コントロール「断面計算と添接計算」＝ Section.exe + Splice.exe | **UNKNOWN**（名称類似だが同一証明なし） |
| Girder と構造解析リンク | Evidence（MAN-021 §3-4 Girder 説明） |

## ファイル依存

詳細: `features/data_exchange_catalog.csv`
