# RULE_SPECIFICATION — Rule Specification

本資料は、READY_FOR_X2 18件のRuleを仕様化したものである。全項目は RULE_REGISTRY.csv に集約。

## 仕様化済Rule一覧

| rule_id | rule_category | title | applicability | inputs | outputs | severity | priority |
|---------|---------------|-------|--------------|--------|---------|----------|----------|
| X2-R-001 | ROAD_CLASSIFICATION | 道路区分決定 | 全道路 | 種級,地域,地形,計画交通量 | 種級区分 | ERROR | P0 |
| X2-R-002 | DESIGN_SPEED | 設計速度決定 | 全道路 | 種級,地形 | 設計速度(km/h) | ERROR | P0 |
| X2-R-003 | DESIGN_VEHICLE | 設計車両諸元 | 全道路 | 種級 | 諸元(m) | ERROR | P0 |
| X2-R-004 | LANE_WIDTH | 車線幅員決定 | 全道路 | 種級,設計速度 | 車線幅員(m) | INFO | P0 |
| X2-R-005 | MEDIAN | 中央帯幅員決定 | 対向車線あり | 種級 | 中央帯幅員(m) | WARNING | P0 |
| X2-R-006 | SHOULDER_WIDTH | 路肩幅員決定 | 全道路 | 種級,道路種別 | 路肩幅員(m) | WARNING | P0 |
| X2-R-007 | CURVE_RADIUS | 最小曲線半径照査 | 曲線部 | V,f,i | 最小R(m) | ERROR | P0 |
| X2-R-008 | TRANSITION_CURVE | 緩和区間・クロソイド | 屈曲部 | R,V | 緩和曲線長・A値 | WARNING | P0 |
| X2-R-009 | SUPERELEVATION | 片勾配設定 | 曲線部 | V,R,地域 | 片勾配(%) | ERROR | P0 |
| X2-R-010 | SIGHT_DISTANCE | 視距照査 | 全道路 | V | 視距(m) | ERROR | P1 |
| X2-R-011 | LONGITUDINAL_GRADE | 縦断勾配照査 | 全道路 | 種級,V | 最大縦断勾配(%) | ERROR | P0 |
| X2-R-012 | VERTICAL_CURVE | 縦断曲線設定 | 勾配変移部 | V,A | 半径R・長さL(m) | WARNING | P0 |
| X2-R-013 | CROSS_SLOPE | 横断勾配設定 | 全道路 | 路面,車線数 | 横断勾配(%) | WARNING | P0 |
| X2-R-014 | VALIDATION | 視距照査警告出力 | 全道路 | 設計値,基準値 | 警告WARN | WARNING | P1 |
| X2-R-015 | GRID_POINT | 格点間距離・張り出し長 | スパン | スパン,主桁,セクション | 格点間距離・張り出し(m) | INFO | P1 |
| X2-R-016 | STATION | ブレーキ測点補正 | 測点 | ブレーキ測点,調整 | 補正測点 | INFO | P1 |
| X2-R-017 | COORDINATE | 座標変換 | スパン | TRAN | 座標変換 | INFO | P1 |
| X2-R-018 | EXCEPTION | 例外ルール管理 | 全道路 | 区分,地形,理由 | 適用除外・特例値 | WARNING | P2 |

## 仕様化対象外

| candidate | rule_id | title | 状態 | 理由 |
|-----------|---------|-------|------|------|
| CAND-08 | RO-016 | 最小曲線長照査 | NEEDS_RESEARCH | 数値表未取得 |
| CAND-11 | RO-022〜024 | 曲線部拡幅量 | NEEDS_RESEARCH | 詳細式確認中 |
| CAND-21 | RO-025 | 建築限界 | BLOCKED | 道示ページ要OCR |
