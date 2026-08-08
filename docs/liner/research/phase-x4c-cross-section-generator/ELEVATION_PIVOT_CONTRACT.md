# Elevation / Pivot Contract

## Z / Elevation Contract
### 最小必要入力
- **center_elevation** または **pivot_elevation**
  - 指定Stationの中心標高（m）
  - 明示入力としてCrossSectionRequestに入る

### 既存Profile evaluator
- frontend `elevationAt.ts` に縦断evaluator（grade / parabolic）がIMPLEMENTED_VERIFIEDで存在
- backendには縦断evaluatorが**ない**（ABSENT）
- **X4-C方針**: backendでVertical Alignment Solverを新設**しない**
- center_elevationは明示入力として受領し、producer contractは「EXPLICIT_INPUT / DEFERRED」として扱う
- frontend側Profile evaluatorがある場合のadapter利用は将来migrate可能にする（現時点ではexplicit input契約を維持）

### delta_z計算
```
delta_z = -(slopePercent/100) * (offset - pivot_offset)
section_z = center_elevation + template_elevation + delta_z
```
- 全数式をcanonical helper（`backend/rule_engine/crosssection/geometry.py`）へ集約

## Pivot / Crown Contract
### 基準軸の明示（hidden default禁止）
候補:
- **CENTERLINE**（pivot_offset = 0）→ 既定
- CUSTOM_OFFSET（中心線からoffset m）
- EXPLICIT_POINT（明示XYZ）
- LEFT_EDGE / RIGHT_EDGE（将来。現在は対応しない）

既存LINER仕様（`crossfallResolution.ts`）は主にCENTERLINEを仮定し、pivot_changeを不対応にしている。
x4cでは既定=CENTERLINE、pivot_offsetを明示入力可能にする。変更時の間違 → fail-closed。

### 未解決（PIVOT_UNRESOLVED）
- pivot情報が提供されず、かつcenterlineが不明な場合は `CrossSectionError` でfail-closedする。
- 既定CROSSFALL_PIVOT= centerline でなくとも、EXPLICIT入力があれば使用。

## 縦断線形の自動生成
- X4-C対象外。profile producer不明 / 未実装のときは、explicit center_elevation契約を維持し、
  ELEVATION_CONTRACT: EXPLICIT_INPUT / DEFERRED として記録する。