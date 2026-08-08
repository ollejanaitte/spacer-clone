# X4-D Scope

## 目的
X4-AのCanonical Geometry Kernel、X4-BのCanonical Alignment Solver、
X4-CのCanonical Cross Section Generatorを正本として維持したまま、
単一の Road Geometry API entry point（facade）から道路幾何情報を一貫して取得できる
production interfaceを確立する。

## 対象
- backend/rule_engine/road_geometry/（新規facade層）
- 入出力contract・型の定義（RoadGeometryRequest / RoadGeometryResult）
- Geometry Kernel / Alignment Solver のfacade統合
- Cross Section Generator / width / crossfall / road edge のfacade統合
- AlignmentGeometryRule（X4B-R-001）のglobal RuleRegistry正式登録
- validation / error契約整理
- facade契約テスト / X4-A/B/C回帰テスト / project replay
- phase docs / completion gate

## 非対象（実装禁止・スコープ外）
- vertical profile solver新設（elevationはexplicit input / deferred契約を維持）
- widening / 拡幅設計rule
- curve-length設計rule
- 建築限界rule
- frontend/src/liner のUI / 3D / drawing
- backend/rule_engine/geometry・alignment・crosssection の破壊的変更
- docs/apollo/step10 / Reference Bridge / substructure / feature/phase-c1
- unrelatedなリファクタリング
- mainのreset / force push / 並行branchの削除

## 境界
- Road Geometry APIは「確定済みの水平線形・幅員・横断勾配・中心標高」を単一入口から
  一貫評価するfacadeであり、設計値を決定するRule Engineではない
- 既存のgeometry / alignment / crosssectionを再実装しない。facadeで統合する。

## 完了後gate
X5_GATE_VERDICT算出。GO判定後もPhase X5は自動開始しない。
