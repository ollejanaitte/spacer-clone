# Feature Data Flow (Stage4)

## Design DB
- 工事名.mdb（Access）— 設計データ中核（形式詳細 Unknown）

## Analysis
- SuperDesigner → Analyzer入力データ（物理形式 Unknown）→ Analyzer → 結果 → 断面力変換 → 自動設計

## Reports
- RTF（詳細/サマリー）; エラー/ワーニング注記; Excel照査リスト

## Drawings
- 製図データ自動生成 → GSP逐次 → DWG(AutoCAD) または RCCAD
- DXF: キャンバー/荷重強度図等

## Materials
- NPDATA.txt / Weight.txt → y-Mater

## Audit
- 設計者・責任者・版・実行日時・ユーザ記録（Access内）
