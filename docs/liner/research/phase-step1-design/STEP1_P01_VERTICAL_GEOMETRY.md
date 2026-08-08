# STEP-1 P01 — Vertical Geometry Design（凍結）

Status: FROZEN（Step2実装の正本）

## 1. Purpose
水平線形（X4-A/B）と独立に、縦断線形（勾配区間・縦断曲線）から任意 station の
標高 Z と縦断勾配 grade を決定論的に評価する Vertical Geometry の契約を確定する。

現行の elevation 契約「EXPLICIT_INPUT / DEFERRED」を、
「backend vertical profile solver により station→Z を自動算出」へ拡張するための
Step2 実装対象である。X4-D の elevation 契約は後方互換のまま維持する。

## 2. Scope
- 縦断要素モデル（grade 区間 / parabolic 縦断曲線）
- VPI 表現
- station → elevation Z / grade 評価
- 連続性（G0/G1）
- バリデーション・エラー契約・単位・符号規約
- Road Geometry API との統合契約
- test vectors / golden master 方針

## 3. Non-scope（本設計では凍結しない/しない）
- 拡幅・片勾配すり付け等の設計Rule（P02）
- 縦断データの実PDF取込（P06 で replay として扱う）
- frontend UI 変更

## 4. Input
```ts
VerticalAlignmentDraft {
  id: string;
  elements: VerticalElementDraft[];   // grade | parabolic
}
VerticalGradeElementDraft {
  type: "grade";
  id: string;
  startStation: number;
  endStation: number;
  startElevation: number;
  grade: number;      // 内部 ratio（gradePercent/100）
  length: number;
}
VerticalParabolicElementDraft {
  type: "parabolic";
  id: string;
  startStation: number;
  endStation: number;
  startGrade: number;
  endGrade: number;
  length: number;
  startElevation?: number;
  curveType?: "crest" | "sag";
}
```
※ 既存 `frontend/src/liner/schema/types.ts` の `VerticalAlignmentDraft` を正本とする。
※ K値方式・半径R方式は不採用（Master Pre-Decision #2、JIP-LINER互換 parabolic を採用）。
※ VPIはparabolic要素の両端勾配 (startGrade/endGrade) の交点として定義する（明示VPI構造は持たない）。

## 5. Output
station 評価ごとに:
- station
- elevation (Z, m)
- grade (ratio)
- grade_percent (%)
- vertical curvature (1/m, parabolic区間のみ)
- source_element_id

API:
```
backend/rule_engine/vertical/  (Step2 新規パッケージ)
  VerticalProfile / VerticalGradeElement / VerticalParabolicElement
  evaluate_vertical(profile, station) -> VerticalEvaluation
  build_vertical_profile(...) / validate_vertical_profile(...)
  Road Geometry API へ elevation producer として統合
  (RoadGeometryAPI の center_elevation を省略時に profile から算出)
```

## 6. Entity / 単位 / 座標系 / 符号規約
- station: m（水平線形 station と同じ座標系、X4-B と同一 station 空間）
- elevation Z: m（絶対標高、水平基準面）
- grade: ratio（無次元、内部計算値）。%表示は UI 層
- grade 符号: 上り（station増加方向で標高上昇）= 正
- vertical curvature: 上に凸（crest）を負、下に凸（sag）を正 に統一
- parabolic の式: y = y0 + g0·x + 0.5·(Δg/L)·x²
  （既存 `verticalSampling.ts` の `evaluateVerticalElementAtStation` と同一）

## 7. Validation / Error contract
- 要素は station 区間で重複・欠落なし（[start,end] が連続して全線を被覆）
- startStation < endStation、length > 0
- grade は有限値、|grade| ≤ 0.30 を警告（道路構造令参考値、Rule側で照査）
- 要素境界で G0（標高一致）必須、G1（勾配連続）は parabolic→次要素で緩和可（意図的な勾配差はすり付け区間で処理）
- 範囲外 station → 専用 RangeError（X4-B AlignmentRangeError と同様の契約）

## 8. Numeric tolerance
- 内部計算は float64、比較は station ε=1e-9（X4-B と同一）
- 出力丸め: 標高は表示用に mm（0.001）丸め可能だが、内部評価値は丸めない

## 9. Existing module reuse / New module
- 再利用: frontend verticalSampling の数学・schema 型（backend へ mirror する）
- 新規: backend/rule_engine/vertical/
- Rule Engine 統合: X2-R-011 longitudinal_grade / X2-R-012 vertical_curve は
  「縦断曲線設定・勾配」のTableLookup rule。Vertical solver は Geometry であり、
  rule が solver を呼ぶ・または solver の結果を rule へ渡す、責務分離を維持（P02で確定）

## 10. API / Persistence / Report / 3D 影響
- X4-D RoadGeometryRequest へ `verticalProfile` を追加（任意）。設定時は
  center_elevation を無視せず、指定優先のまま（明示が最優先）— Step2 で決定
- Persistence: 既存 frontend schema の verticalAlignment が正本
- Report: 縦断表・縦断図へ供給（P04）
- 3D: centerline XYZ の Z を供給（P05）

## 11. Test strategy / Golden Master
- unit: 単一 grade / parabolic / 境界 / 範囲外 / validation 違反
- regression: frontend verticalSampling テストとの数値一致
- Golden Master: サンプル道路線形計算例（SRC-008）の縦断データ、金沢IC Aランプ橋
  （i=6.000% / VCL=100 / i=0.100%）等を Step2 で取り込み比較
- RoadGeometryAPI 統合テスト（Z 自動算出パス）

## 12. Traceability
- SRC-001 JIP-LINERマニュアル（縦断データ・縦断勾配）
- SRC-008 サンプル道路線形計算例（縦断条件）
- frontend/src/liner/schema/types.ts（VerticalAlignmentDraft, Master Pre-Decision #2）
- frontend/src/liner/core/verticalSampling.ts（評価式）
- X4-C ELEVATION_PIVOT_CONTRACT.md（現行 EXPLICIT_INPUT 契約）

## 13. Acceptance criteria（Step2用）
- [ ] backend/rule_engine/vertical/ の評価が frontend verticalSampling と数値一致
- [ ] RoadGeometryAPI が profile 指定で station→Z を返す
- [ ] X4-D 既存（explicit input）パスは退行なし
- [ ] 実案件縦断データの replay（P06 fixture と接続）
- [ ] 全PRは小PRで段階merge
