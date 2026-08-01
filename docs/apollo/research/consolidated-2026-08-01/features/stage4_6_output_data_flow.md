# Part6 Output Data Flow

1. 設計プログラム［計算＆出力］→ RTF計算書（詳細/サマリー）→ 任意で MS-Word 表示
2. 照査リスト → Excel サマリー
3. 製図: 入力データ作成(.mdb標準値) → 設計データ変換 → 全部材作成 → 図面作成(GSP逐次) → AutoCAD変換(DWG) または RCCAD(GSP)
4. 材料出力 → NPDATA.txt → y-Mater
5. 鋼重計算 → 概略鋼重 / Weight.txt → y-Mater；実鋼重は仮定鋼重へ反映（MAN-013）
6. 監査: 設計者・責任者・版・実行日時・ユーザ記録を Access 設計データに保管

DXF: MAN-021 / MAN-002 / MAN-007 に出力記載あり（キャンバー・荷重強度図等）。
