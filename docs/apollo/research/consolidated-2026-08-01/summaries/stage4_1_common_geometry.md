# Stage 4 Part 1 — Common Geometry

## Verdict

```text
APOLLO_STAGE4_PART1_COMMON_GEOMETRY_VERDICT: COMPLETE
```

## Scope categories

project_management, bridge_basic_conditions, unit_system, bridge_type_selection, span_configuration, alignment, alignment_import, longitudinal_alignment, cross_section_lines, member_line_assignment, skew_angle, road_width, cross_slope, girder_layout, standard_section

## Counts

- Feature rows: 72
- Evidence: 70
- Unknown: 2

## Evidence highlights

1. 工事名フォルダ `C:\y-Design-Bridge\工事名`（MAN-021）
2. 線形データ拡張子 `.alg` / `．ａｌｇ`（MAN-021）
3. 単位系 SI/重力。切替時の荷重等自動変換なし（MAN-021）
4. ハンチで単位指定→他プログラムへ伝播（MAN-021）
5. Align 経由の縦断/横断勾配指定・線形計算変換（MAN-003）
6. 設計データ: 支承条件・主桁全体/桁高/断面（MAN-005）
7. 支承条件はチェックリスト反映の記載あり。設計未使用の旨の記載あり（MAN-005）→ Phase1 支承の扱い要継続確認

## Interpretation

- UI操作順（コントロール左上→右下）は依存の近似。計算依存と同一視しない（Stage2継続）。
- RC鈑桁主桁本数上限15は適用規模。Phase1の「4〜6本」は運用制約でありソフト上限とは別。

## Unknown

詳細は `features/stage4_1_unknowns.md`。

## Sources

MAN-021, MAN-002, MAN-003, MAN-005（Phase1 CORE）
