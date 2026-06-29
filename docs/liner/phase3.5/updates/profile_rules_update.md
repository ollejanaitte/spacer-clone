# profile_rules.md Update Proposal

## 対象

- 元ファイル: `docs/liner/profile_rules.md`
- 関連Phase: 3.5-2/3.5-3
- 更新理由: Phase3.5-0調査で `zProvenance` ぁE埋めで、縦断pipeline未接続、横断Z合成未実装��判明したため、N3/N4の責務�E離を反映する。
## 更新箇所

| 現状章 | 現状記述 | 更新後記述 |
|---|---|---|
| 1. Vertical component split | crossfall/superelevationは0 in MVP | Phase3.5-3でcrossfallOffsetを実値化、localFrame回転は3.5-4と明記|
| 2. Vertical segment types | formulaのみ | pipeline接続、fixed-z置換、heightPoints/PVI/PVC/PVT入力を追記|
| 4. Cross-section | template field列挙 | 符号規紁E offset左正、crossfall左上がり正、`crossfallOffset=c*d` を追記|

## 差分
```diff
@@ 1. Vertical component split
- Cross-section module (0 in MVP)
+ Cross-section module. Phase3.5-3 generates real `crossfallOffset`.
+ Superelevation rotation of `localFrame` is deferred to Phase3.5-4.

@@ 2. Vertical segment types
+ Phase3.5-2 replaces the fixed-Z pipeline path. Existing `z` is migrated to a
+ zero-grade vertical segment covering the full alignment. PVI/PVC/PVT values are
+ UI/domain inputs and are emitted into `vertical.segments` where applicable.

@@ 4. Cross-section and structural reference
+ Sign convention:
+ - transverse offset is positive left of alignment.
+ - crossfall is positive when the left side rises.
+ - `crossfallOffset = crossfall(s) * offset`.
```

## 参照

- `docs/liner/phase3.5/vertical_alignment_design.md`
- `docs/liner/phase3.5/cross_section_superelevation_design.md`
- `docs/liner/phase3.5/coordinate_integration_3d_design.md`
