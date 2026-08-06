# Calculation-Drawing Correspondence

## 1. Purpose

Map calculation book chapters/sections to drawing sheet groups. Classify
relationship type and evidence strength.

## 2. Relationship types

| Type | Meaning |
|------|---------|
| DIRECT_REFERENCE | Calculation explicitly references a drawing sheet number or vice versa |
| SHARED_ENTITY_AND_VALUE | Both documents describe the same entity with matching values |
| SHARED_ENTITY_ONLY | Both documents describe the same entity (values may differ or not directly comparable) |
| SEMANTIC_CANDIDATE | Logical correspondence based on subject matter, no explicit cross-reference |
| NO_RELATION_FOUND | No correspondence identified |

## 3. Evidence strength

| Strength | Meaning |
|----------|---------|
| STRONG | Explicit cross-reference or identical values |
| MODERATE | Same entity described; values match or can be derived |
| WEAK | Semantic candidate only |
| NONE | No evidence |

## 4. Correspondence map

### 4.1 Design conditions → Drawing general arrangement

| Calc section | Calc range | Drawing sheets | Relationship | Evidence |
|-------------|------------|----------------|--------------|----------|
| Ch1 (設計条件) | printed 1-10 | 1-9 (位置図〜上部工構造一般図) | SHARED_ENTITY_AND_VALUE | STRONG |

The design conditions (calc printed page 2) are replicated verbatim on the
上部工構造一般図(その1) (sheet 8). All numeric values match.

### 4.2 Composite deck → Composite deck layout

| Calc section | Calc range | Drawing sheets | Relationship | Evidence |
|-------------|------------|----------------|--------------|----------|
| Ch2 (合成床版の設計) | printed 11-109 | 84 (合成床版割付図), 39-44 (スタッド配置図) | SHARED_ENTITY_ONLY | MODERATE |

### 4.3 Main girder design → Main girder drawings

| Calc section | Calc range | Drawing sheets | Relationship | Evidence |
|-------------|------------|----------------|--------------|----------|
| 3.1 (主構断面力) | printed 111-285 | 21-38 (主桁AG1/AG2) | SHARED_ENTITY_ONLY | MODERATE |
| 3.2 (主桁の設計) | printed 286-669 | 21-38 (主桁AG1/AG2) | SHARED_ENTITY_AND_VALUE | STRONG |
| 4.1 (合成主構断面力) | printed 867-1277 | 21-38 (主桁AG1/AG2) | SHARED_ENTITY_ONLY | MODERATE |
| 4.2 (合成主桁の設計) | printed 1278-2020 | 21-38 (主桁AG1/AG2) | SHARED_ENTITY_AND_VALUE | STRONG |

### 4.4 Cross beam design → Cross beam drawings

| Calc section | Calc range | Drawing sheets | Relationship | Evidence |
|-------------|------------|----------------|--------------|----------|
| 3.3.4 (中間横桁) | printed 680-698 | 49-60 (中間横桁) | SHARED_ENTITY_ONLY | MODERATE |
| 3.3.5 (端支点上横桁) | printed 699-729 | 45-46 (端横桁) | SHARED_ENTITY_ONLY | MODERATE |
| 3.3.6 (中間支点上横桁) | printed 730-756 | 47-48 (中間支点横桁) | SHARED_ENTITY_ONLY | MODERATE |

### 4.5 Lateral bracing → Lateral bracing drawings

| Calc section | Calc range | Drawing sheets | Relationship | Evidence |
|-------------|------------|----------------|--------------|----------|
| 3.5 (横構の設計) | printed 783-811 | 61-71 (上下横構) | SHARED_ENTITY_ONLY | MODERATE |

### 4.6 Wrapping concrete → Wrapping concrete drawings

| Calc section | Calc range | Drawing sheets | Relationship | Evidence |
|-------------|------------|----------------|--------------|----------|
| 3.6 (巻き立てコンクリート) | printed 812-835 | 72-79 (巻き立てコンクリート), 80-83 (スタッド) | SHARED_ENTITY_ONLY | MODERATE |

### 4.7 Fatigue → (no direct drawing)

| Calc section | Calc range | Drawing sheets | Relationship | Evidence |
|-------------|------------|----------------|--------------|----------|
| 3.7 (疲労設計) | printed 837-865 | — | NO_RELATION_FOUND | NONE |

Fatigue design is a verification calculation with no direct drawing output.

### 4.8 Bearings → Bearing detail drawings

| Calc section | Calc range | Drawing sheets | Relationship | Evidence |
|-------------|------------|----------------|--------------|----------|
| 5.1 (支承の設計) | printed 2022-2184 | 85-88 (支承詳細図) | SHARED_ENTITY_ONLY | MODERATE |

### 4.9 Expansion joints → Expansion joint drawings

| Calc section | Calc range | Drawing sheets | Relationship | Evidence |
|-------------|------------|----------------|--------------|----------|
| 5.4 (伸縮装置) | printed 2201-2221 | 89-92 (伸縮装置) | SHARED_ENTITY_ONLY | MODERATE |

### 4.10 Drainage → Drainage drawings

| Calc section | Calc range | Drawing sheets | Relationship | Evidence |
|-------------|------------|----------------|--------------|----------|
| 5.3 (排水の設計) | printed 2193-2200 | 101-115 (上部工排水〜橋面排水工) | SHARED_ENTITY_ONLY | MODERATE |

### 4.11 Step prevention → Step prevention drawings

| Calc section | Calc range | Drawing sheets | Relationship | Evidence |
|-------------|------------|----------------|--------------|----------|
| 5.2 (段差防止構造) | printed 2185-2192 | 135-136 (段差防止構造) | SHARED_ENTITY_ONLY | MODERATE |

## 5. Summary

| Relationship type | Count |
|-------------------|-------|
| SHARED_ENTITY_AND_VALUE | 3 |
| SHARED_ENTITY_ONLY | 8 |
| SEMANTIC_CANDIDATE | 0 |
| NO_RELATION_FOUND | 1 |
| DIRECT_REFERENCE | 0 |

No explicit cross-references (DIRECT_REFERENCE) were found in the text
extraction. The correspondence is primarily through shared entity identity.

## 6. Verdict

CALCULATION_DRAWING_CORRESPONDENCE_VERDICT: PASS