# unit / status / provenance 方針（Phase 3-1/3-2）

## 1. unit

| 次元 | canonical | source/display |
|------|-----------|----------------|
| 長さ | m | mm（3D/図面） |
| 角度 | rad | deg（表示） |
| 勾配（縦断） | ratio | %（UI） |
| 横断勾配 | %（right_down_positive） | — |
| 曲率 | 1/m | — |

- 各 `BpValue` / CBDM `ResolvedValue` に unit を必須付与。
- silent conversion 禁止（source unit 保持は今後の拡張で対応）。

## 2. status（BpValue → CBDM）

| BpValue | CBDM ResolvedValue | 使用例 |
|---------|--------------------|--------|
| CONFIRMED | CONFIRMED（+authority） | support station / skew / bridge start・end |
| DERIVED | DERIVED（+derivedFrom + generatedBy） | XYZ / azimuth / curvature / grade / crossfall / width / length / span |
| INFERRED | INFERRED（+inferenceBasis） | 現時点不使用（CASE B 復元で使用予定） |
| MISSING | HOLD_INSUFFICIENT_SOURCE（+stateReason） | 縦断なしの grade / deckWidth 無 |
| DEFERRED | DEFERRED（+stateReason） | skew 未指定 |
| NOT_AUTHORIZED | NOT_AVAILABLE / 文書レベル numericDesignAuthorization | 設計値・反力 |

- **INFERRED / MISSING / DEFERRED を自動で CONFIRMED へ昇格しない。**
- authority: CONFIRMED(USER_INPUT) → `USER_PROVIDED_UNVERIFIED`、
  CONFIRMED(ORIGINAL) / DERIVED → `SOURCE_TRACED`。

## 3. provenance

- 文書: CBDM / manifest に `provenance`（createdAt/createdBy/producer）。
- 値: `BpValue.generatedBy`（`spacer-bridge-project-alignment-adapter` /
  `spacer-bridge-project-geometry-generator`）+ `sourceReference`（supportId / golden）。
- DERIVED 値は `derivedFrom` に導出式を記録。
- 決定論: createdAt は options で固定可能（既定 `2026-08-08T00:00:00.000Z`）。

## 4. 決定論・保存

- canonical JSON（キーソート・NaN/Infinity 拒否）+ sha256 checksum。
- `serializeCommonBridgeModel` / `parseCommonBridgeModel` / manifest 版で
  Save/Load/Replay の round-trip を保証。
