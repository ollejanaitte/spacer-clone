# Phase 7-01C: Section / Material Contract（設計Freeze）

- Phase: 7-01 Step C
- baseline: `9766128e44ec22f0cdd83f59336182f4c47bd162`
- 日付: 2026-08-13
- 凍結: Design Decision D-06 / D-10
- 対応R: R7

## 1. 目的

R7を解決：grillage内の固定宣言断面・材料を正式解析の正本とせず、
SuperstructureDocument実断面・実材料からAnalysis Modelへ正式接続する。

## 2. Section Contract（Freeze）

### 2.1 source（正本）

| source | field |
|---|---|
| `SuperstructureDocument.girderConfiguration.girderSectionModel` | depthM / webThicknessM / topFlange / bottomFlange / areaM2 / unitWeightPerM |
| `SuperstructureDocument.deckConfiguration` | deck（床版）断面 |
| `crossBeamConfiguration.crossBeams[]` | 横桁（depthM/widthM） |

### 2.2 断面性能（A / Iy / Iz / J）

- I断面（plate girder）: `computeSuperstructureSectionProperties`（KEEP・`superstructureComponents.ts`）から導出。
  - A = flange×2 + web（or areaM2直接値）
  - Iy（横曲げ）・Iz（鉛直曲げ）・J（ねじり）をI断面公式で計算。
- 直接値（areaM2）がある場合: CONFIRMED。
- 導出値: COMPUTED。
- **box桁・合成桁等**: 非対応（`UNSUPPORTED_SECTION`で明示DEFER）。

### 2.3 欠損時挙動（fail-closed）

| 状態 | 挙動 |
|---|---|
| 断面値全てMISSING | `NOT_AVAILABLE`・解析不可（fallback禁止） |
| 一部MISSING | 必要性能（A/I/J）に欠損→NOT_AVAILABLE。check用（depth等）はnull許容 |
| unitWeightPerM欠損 | DERIVED（ρ×A）or MISSING |

### 2.4 単位

| field | unit |
|---|---|
| A | m² |
| Iy / Iz / J | m⁴ |
| depthM / widthM / thicknessM | m |
| unitWeightPerM | kN/m |

## 3. Material Contract（Freeze）

### 3.1 source（正本）

- SuperstructureDocumentに `materialConfiguration`（E/G/ν/ρ）を**任意fieldとして追加設計**（Phase 7-02）。
- 未設定時の既定: 既存宣言steel（E=2.05e8 kN/m²・G=8.0e7・ν=0.3・ρ=78.5）を `CONFIRMED` かつ `source="structuralSteel_default"` として明示使用（**無根拠固定値ではなく明示宣言**）。

### 3.2 コンクリート（床版）

- deck自重はunitWeight（kN/m³）で表現（DL-DECK計算に使用）。解析modelのstructural materialには鋼材のみ（床版は非構造massとして扱う）。

### 3.3 単位

| field | unit |
|---|---|
| E | kN/m² |
| G | kN/m² |
| ν | —（|ν|<0.5） |
| ρ | kN/m³ |

## 4. AnalysisDocumentへの出力（Freeze）

| field | 値 |
|---|---|
| entityId | uuid5(`section:{sourceEntityId}` / `material:{sourceEntityId}`) |
| sourceEntityId / sourceKind | girderSectionModel / deck / crossBeam / structuralSteel / concrete |
| derivation | DECLARED_INTENT / COMPUTED / NOT_AVAILABLE |
| valueState（material） | CONFIRMED / DERIVED / NOT_AVAILABLE |

## 5. solver入力（Freeze）

- AnalysisDocument section/material → backend solver project（engine model.py）の `sections` / `materials` へ変換。
- backend solverは既存 `parse_material` / `parse_member`（KEEP）を使用（単位・field整合）。

## 6. 禁止事項（Freeze）

- grillage内の固定宣言値（`grillage.py` の `declared_section` / `STEEL_MATERIAL`）を**無条件に正本化しない**。
- 既定steelはsource="structuralSteel_default"と明示してのみ使用（上流材料設定が無い場合）。
- 欠損断面のfallback（任意の仮断面で解析）禁止。

## 7. validation / fail-closed

| 項目 | 挙動 |
|---|---|
| A/Iy/Iz/J ≤0 | reject |
| 断面欠損 | NOT_AVAILABLE・解析不可 |
| ν out of range | reject |
| box/合成非対応 | UNSUPPORTED_SECTION |

## 8. tests観点

- I断面のA/Iy/Iz/J導出（closed-form照合）
- areaM2直接値（CONFIRMED）
- 欠損fail-closed
- material既定steel（明示source）
- solver入力変換（単位/field整合）
