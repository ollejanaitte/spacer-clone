# Bridge Identity and Basic Condition Parity

## 1. Purpose

Cross-check all bridge identity and basic condition fields between the
calculation book and the drawing set. Record raw values, normalized values,
parity, and source status.

## 2. Method

- Extract design conditions from calculation book (PDF page 7, printed page 2,
  section 1.1)
- Extract design conditions from drawing title block (PDF page 9, sheet 8,
  上部工構造一般図(その1))
- Compare field by field
- Record raw values with source locators
- Normalize for comparison
- Report MATCH / PARTIAL / CONFLICT / ONLY / NOT_FOUND

## 3. Key findings

### 3.1 Bridge naming

The calculation book uses **金沢IC Aランプ橋** while the drawing set uses
**旭高架橋 Aランプ PU15-AR2**. Both refer to the same structure (same route,
business name, client, date, spans, geometry). This is a naming convention
difference (calc uses IC-based name, drawing uses route-based name).

### 3.2 Support naming

The calculation book uses `A2` for the far abutment, while the drawing set uses
`AR2`. These are the same physical support. The `A2` / `AR2` variation is
documented as notation variation, not a conflict.

### 3.3 All numeric conditions

All numeric bridge conditions (bridge length, girder length, span arrangement,
widths, curve radii, skew angles, slopes, deck thickness, pavement thickness)
match between calculation and drawing.

## 4. Parity summary

| Item | Calc raw | Drawing raw | Normalized | Parity |
|------|----------|-------------|------------|--------|
| Bridge type | 鋼3径間連続少数鈑桁橋(非合成桁,合成断面担保) | 鋼3径間連続少数鈑桁橋(非合成桁,合成断面担保) | Same | MATCH |
| Bridge length | 134.001m (ACL上) | 134.001m (ACL上) | 134.001m | MATCH |
| Girder length | 133.151m (ACL上) | 133.151m (ACL上) | 133.151m | MATCH |
| Span arrangement | 40.201m + 51.000m + 40.200m (ACL上) | 40.201m + 51.000m + 40.200m (ACL上) | 40.201+51.000+40.200m | MATCH |
| Total width | 8.010m | 8.010m | 8.010m | MATCH |
| Effective width | 7.000m (車道幅) | 7.000m (車道幅) | 7.000m | MATCH |
| Main girders | AG1, AG2 | AG1, AG2 | AG1, AG2 | MATCH |
| Supports | PU15, PR1, PR2, A2 | PU15, PR1, PR2, AR2 | PU15, PR1, PR2, A2/AR2 | PARTIAL |
| Skew angle PU15 | 94°14′27″ | 94°14′27″ | Same | MATCH |
| Skew angle PR1,PR2,A2 | 90°00′00″ | 90°00′00″ | Same | MATCH |
| Curve R1 | R=160m (左まわり) | R=160m (左まわり) | 160m | MATCH |
| Curve R2 | R=3000m (右まわり) | R=3000m (右まわり) | 3000m | MATCH |
| Vertical grade | i=6.000%→0.100% | i=6.000%→0.100% | Same | MATCH |
| Cross slope | 5.000%→2.000%→2.958% | 5.000%→2.000%→2.958% | Same | MATCH |
| Pavement | アスファルト t=80mm | アスファルト t=80mm | Same | MATCH |
| Deck | 鋼コンクリート合成床版 t=230mm | 鋼コンクリート合成床版 t=230mm (ハンチ高100mm) | Same | MATCH |
| Main girder height (general) | 2700mm | 2700mm | 2700mm | MATCH |
| Main girder height (PU15 end) | 2580mm | 2580mm | 2580mm | MATCH |
| Steel grade | SM520, SM490Y, SM400, SS400 | SM520, SM490Y, SM400, SS400 | Same | MATCH |

## 5. A2/AR2 notation variation

The calculation book uses `A2` while the drawing set uses `AR2` for the far
abutment. This is a common notation variation in Japanese bridge design
(A=abutment, R=ramp). The physical support is the same structure.

## 6. Verdict

BRIDGE_IDENTITY_PARITY_VERDICT: PASS (with noted A2/AR2 notation variation)