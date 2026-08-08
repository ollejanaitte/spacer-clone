# GEOMETRY_INTERFACE — Rule Engine ↔ Geometry Engine

| interface | producer | consumer | input_fields | output_fields | unit | coordinate_system | ownership | validation | version |
|-----------|----------|----------|-------------|--------------|------|-----------------|-----------|------------|---------|
|ALIGNMENT|RULE_ENGINE|GEOMETRY_ENGINE|alignment_type,design_speed|alignment_coordinates|-,m|LOCAL_XY|ROAD|station,cross_check|v1.0|
|ALIGNMENT_ELEMENT|RULE_ENGINE|GEOMETRY_ENGINE|element_type(S/R/A),R,A|element_coordinates,length|-,m,m|LOCAL_XY|ROAD|rule:v_curve_radius,geometry:calc|v1.0|
|STATION|RULE_ENGINE|GEOMETRY_ENGINE|station_name,station_value|station_coordinates|m|LOCAL_XY|ROAD|station,coordinate|v1.0|
|COORDINATE|RULE_ENGINE|GEOMETRY_ENGINE|station|x,y,rotation|m,度|LOCAL_XY|ROAD|coordinate|v1.0|
|PROFILE|RULE_ENGINE|GEOMETRY_ENGINE|grade,vertical_curve_params|profile_z|%,m|LOCAL_Z|ROAD|grade,vertical_curve|v1.0|
|CROSSFALL|RULE_ENGINE|GEOMETRY_ENGINE|crossfall_value,superelevation|cross_section_slope|%|LOCAL|ROAD|crossfall,superelevation|v1.0|
|CROSS_SECTION|RULE_ENGINE|GEOMETRY_ENGINE|lane_width,shoulder,median|section_geometry|m|LOCAL|ROAD|width,offset|v1.0|
|WIDTH|RULE_ENGINE|GEOMETRY_ENGINE|width_type,value|width_geometry|m|LOCAL|ROAD|width|v1.0|
|SUPPORT_LINE|RULE_ENGINE|GEOMETRY_ENGINE|support_type,stations|support_coordinates|m|LOCAL_XY|BRIDGE|support,station|v1.0|
|SPAN|RULE_ENGINE|GEOMETRY_ENGINE|span_length,span_type|span_geometry|m|LOCAL|BRIDGE|span,length|v1.0|
|GIRDER_LINE|RULE_ENGINE|APOLLO|girder_name,girder_type|girder_geometry|m|LOCAL|BRIDGE|girder,apollo|v1.0|
|GRID_POINT|RULE_ENGINE|GEOMETRY_ENGINE|grid_point_name|grid_coordinates|m|LOCAL_XY|BRIDGE|grid_point,ldist|v1.0|

## 境界原則

1. Rule Engine: 要求値の判定（最小曲線半径・片勾配・縦断勾配等）
2. Geometry Engine: 実際の幾何計算（座標・測点・断面高さ等）
3. 両者間の値はENGINE_DATA_CONTRACT.mdのData Contractで受け渡し
