# Stage4 Part5 Analysis Data Flow

## Evidence flow (from manuals)

1. 設計データ入力（荷重・剛度等） — MAN-005 / MAN-007
2. 解析データ作成 → APOLLO Analyzer 入力データ自動生成 — MAN-007 / MAN-002
3. 構造解析（Analyzer実行） — MAN-007 / MAN-002
4. 断面力変換（結果を自動設計へ読込） — MAN-007 / MAN-002
5. 断面力計算書出力（変換終了時ダイアログ） — MAN-007
6. たわみ・剛比確認 / 実剛度格子計算 — MAN-010
7. 許容応力度データ — MAN-005

## Explicit formats stated
- 荷重強度図: Rtf・Dxf — MAN-007
- キャンバー図: DXF — MAN-010
- Analyzer 物理ファイル拡張子: **not stated in Part5 extract** → Unknown (non-blocking for Stage4)

## Distinctions
- 解析モデル変更（節点/要素/支点）は任意指定オプション — MAN-007
- 仮定剛度 vs 実剛度格子計算 — MAN-010
