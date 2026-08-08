# Width / Crossfall Conventions

## Width Contract
- **unit**: m
- **sign convention**: 中心線基準。right = 正offset、left = 負offset（既存frontend `CrossSectionOffsetLineDraft.offset` と統一）
- **segment width**: 非負float
- **total width**: `total_right_width = Σ right segments width`、`total_left_width = Σ left segments width`
- **station interpolation**: piecewise-constant（既存 `widthResolution.resolveWidthAtDistance` のhold方式を正本とする）。線形補間をoverride defaultにしない
- **missing width**: fail-closed（width未指定segmentはエラー）
- **discontinuity policy**: 幅員変化点は隣接を持たせない（重複stationはvalidation error）既存 `validateWidthChangePoints` 準拠

### 拡幅
- 「設計基準から拡幅量を決める」→ **実装禁止**
- 「上流から与えられた幅員値/プロファイルを指定Stationで評価」→ 許可（explicit input consumption）

## Crossfall Contract
- **canonical unit**: %（既存 `CrossSlopeIntervalDraft.*SlopePercent`）
- **sign convention**: 
  - `delta_z = -(slopePercent/100) * (offset - pivot_offset)`（既存 `resolveCrossfallOffset` と一致）
  - 負offset → left_slope、正offset → right_slope
  - offsetがpivot±offset_tolerance内 → delta_z=0（clamp）
- **downward/upward**: 正值slopeは「右が下がる」方向。文字通り既存式に従う
- **pivot/reference axis**: centerline基準。pivot_offset（m）を明示
- **segmentごとのcrossfall**: Segment.crossfall として明示入力
- **interpolation ownership**: X2/X3 Rule Engineに判定を委譲。Generatorでは確定値の消費のみ
- **missing crossfall**: flat（slope=0）として扱い、warning出力。pivot不明は fail-closed

### Pivot
- 既定: CENTERLINE（pivot_offset=0）
- CUSTOM_OFFSET / EXPLICIT_POINT は明示指定時のみ
- pivotのstation間変化は既存 `LINER_CROSSFALL_PIVOT_CHANGE_UNSUPPORTED` と同様に不対応（validation error）