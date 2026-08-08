# Cross Section Contract

## Scope
Cross Section Generatorは、X4-B Alignment Solverから取得するcenter poseと、
外部から与えられる width / crossfall / center_elevation を、指定Stationの
実座標XYZへ変換する。

## Request（CrossSectionRequest）
| field | type | 備考 |
|-------|------|------|
| alignment_id | str | X4-B Alignment 識別子 |
| station | float | 評価station（alignment station空間） |
| center_elevation | float | 中心標高（explicit input or upstream provider） |
| left_segments | List[Segment] | 左側segment列 |
| right_segments | List[Segment] | 右側segment列 |
| crossfall | CrossfallInput | left/right slope + pivot |
| pivot_definition | str | CENTERLINE / CUSTOM_OFFSET / EXPLICIT_POINT |
| source_trace | dict | 入力のprovenance |

## Segment（CrossSectionSegment）
- segment_id, side(LEFT/RIGHT/CENTER), segment_type(CENTER/LANE/SHOULDER/MEDIAN/SIDE_STRIP/SIDEWALK/OTHER)
- width（非負）, crossfall（%）, start_offset, end_offset, source

## CrossfallInput
- left_slope_percent, right_slope_percent（正=下り勾配でdelta_z負= -slope%…)は WIDTH_CROSSFALL_CONVENTIONS に従う
- pivot_offset（中心線基準）

## Result（CrossSectionResult）
- alignment_id, station, alignment_element_id
- center_point_xyz, tangent, normal, pivot
- segments, section_points
- left_edge_xyz, right_edge_xyz
- total_left_width, total_right_width
- trace, warnings, errors

## section_point
- point_id, side, segment_id, offset, elevation, xyz, source_trace