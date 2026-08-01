# Unresolved System Structure

Stage 2 で確認できなかった／断定しない項目。

| ID | 内容 | 影響 | Blocking for Stage2? | 次の調査候補 |
|---|---|---|---|---|
| U-S2-001 | Analyzer 断面力・結果ファイルの物理フォーマット | OSS 連携設計 | No（未知として明示済） | Analyzer マニュアル探索 |
| U-S2-002 | MS-Access 設計DBのテーブル構造 | データモデル | No | Stage4 で画面/出力から逆推定（推測禁止のまま） |
| U-S2-003 | コントロールボタン名と単体プログラム名の完全対応表 | 実装マッピング | No | ヘルプ/実行ファイル名の追加資料 |
| U-S2-004 | y-Mater の出力・編集・DB | 材料フロー末端 | No | y-Mater マニュアル |
| U-S2-005 | Align 専用マニュアル欠落（本リポジトリ） | 線形入力詳細 | No | 原本追加 or Stage4 |
| U-S2-006 | MAN-061 vs MAN-062 の版関係 | Section 採用版 | No | 改訂履歴ページ精読 |
| U-S2-007 | Prefloor と「横桁設計」ボタンの関係 | 床組パイプライン | No | MAN-011 等 |
| U-S2-008 | Ribsection/Ribchk 等の機能説明空白 | 単体責務 | No | ヘルプ文書 |
| U-S2-009 | SuperDrawing「製図データベース」の実体 | 製図データモデル | No | SuperDrawing 詳細 |
| U-S2-010 | データリンクの失敗時・再計算範囲 | 運用手順 | No | 運用注意・ヘルプ |

## 仮説フローで未確認だった接続

- Analyzer → SuperDesigner の**ファイル形式**（変換の存在は Evidence、形式は UNKNOWN）
- y-Mater の下流成果物

## 意図的に扱わなかった範囲（Stage2初期）

- 箱桁・鋼床版・合成桁の詳細手順
- AutoCAD / MS-Office の再実装方針
- 既存 OSS へのマッピング（Stage 6）
