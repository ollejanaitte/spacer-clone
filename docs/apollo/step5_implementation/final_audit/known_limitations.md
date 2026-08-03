# Step 5 Final Audit — Known Limitations

## Authorization (binding)

- `DEVELOPMENT_RESULT_LABEL: UNVERIFIED_DEVELOPMENT_ONLY`
- `NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED`
- `FORMAL_RELEASE_READINESS: NO_GO_PENDING_HUMAN_VALIDATION`
- `DESIGN_OR_CONSTRUCTION_USE: PROHIBITED`
- `STRUCTURAL_ENGINEERING_CORRECTNESS: NOT_AUTHORIZED`
- `FORMAL_STRUCTURAL_APPROVAL: NOT_GRANTED`

## Engineering / geometry

1. **Cross-frame / 対傾構 topology (DEC-S5-0006 / ER-001)**  
   P4 changed **labels only**. Sway V topology (top flange mid → bottom flange mid) remains DEVELOPMENT. User-reported position concern is **not** resolved by code change of attachment/elevation.

2. **L-angle section (DEC-S5-0007/0008 / ER-002)**  
   - Schema `lateralAngleSection` on `1.3.0-development`  
   - Sample dims `CAT-S5-LAT-UNVERIFIED` placeholders — not invented as ADOPTED standards  
   - Viewer uses **two-plate** approximation, not a single L-polygon extrusion  
   - Exact orientation pending ER-002

3. **Pavement / markings**  
   - Apollo draft owns pavement until Step 4-E LINER bind  
   - Markings visualization-only (`exportable: false`)  
   - Catalog thickness/unit weight are development placeholders

4. **Haunch display**  
   - TRAPEZOID solids may use average-width box display (Step 4-C known limitation); quantity/load keep trap area

5. **Guided Mode**  
   - Shell + G01–G15 implemented; full keyboard/a11y/mobile acceptance pending real GUI Audit C  
   - No Playwright Step 5 suite on main prior to Audit C

6. **Formal analysis**  
   - No formal OK/NG structural checks; sample loads derive-only (DEC-S5-0011)

## Open human gates

| Gate | Topic |
|------|-------|
| ER-001 | Cross-frame attachment topology adoption |
| ER-002 | L-angle catalog dimensions / orientation |
| OQ-S5-004/005 | Open questions from Step 5-2 design package |
