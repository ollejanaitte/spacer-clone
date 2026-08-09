# 13. Scope Progression by Source Availability

## 1. Readiness Levels

For each area, define the readiness level:
- GO_NON_NUMERIC_GEOMETRY: Can implement non-numeric geometry (UI, input, validation, display)
- GO_NON_NUMERIC_MODEL: Can implement non-numeric structural model (schema, validation, preview)
- GO_WITH_RESTRICTIONS: Can implement with restrictions (straight-only fallback, assumptions)
- BLOCKED_ANALYSIS: Cannot implement analysis (requires theory/reference)
- BLOCKED_DESIGN_CHECK: Cannot implement design check (requires design standard)
- BLOCKED_REPORT: Cannot implement report (requires format/spec)
- BLOCKED_DRAWING: Cannot implement drawing (requires template/spec)
- NO_GO: Cannot implement at all (fundamental dependency missing)

## 2. Current Readiness Assessment

### NON_NUMERIC_GEOMETRY_READINESS: GO_NON_NUMERIC_GEOMETRY
- Can implement: single circular arc input, horizontal alignment display, centerline sampling, main girder offset line, non-numeric validation, save/load, 3D preview, STL, zero-curvature straight bridge regression
- What's needed: existing road alignment core (arc.ts, clothoid.ts, horizontal.ts, coordinate3d.ts, vector.ts)
- No additional sources required for non-numeric geometry
- Example: Centerline curve → offset lines → 3D mesh → STL (non-numeric, for visualization only)

### NON_NUMERIC_MODEL_READINESS: GO_WITH_RESTRICTIONS
- Can implement: structural model schema for curved bridges, validation, grid generation
- Restrictions: cross beam direction must be assumed radial, bearing direction must be assumed radial/tangential, no formal verification
- What's needed: basic understanding of curved bridge geometry (can be derived from existing geometry kernel)
- Risk: Direction assumptions may need revision when design standards are found

### ANALYSIS_READINESS: BLOCKED_ANALYSIS
- Cannot implement: warping torsion analysis, secondary stress in lateral bracing, centrifugal load
- Reason: The current 6DOF solver does not include warping (7DOF). No reference implementation for curved bridge torsion.
- Workaround: Users could manually define a curved 3D frame model, but without warping, results would be incorrect for curved I-girders.
- Required sources: Vlasov torsion theory, secondary stress calculation method, centrifugal load formula

### DESIGN_CHECK_READINESS: BLOCKED_DESIGN_CHECK
- Cannot implement: main girder design check, biaxial bending check, torsion + bending interaction, warping stress check, lateral buckling, cross frame design, bracing design, bearing design, camber
- Reason: All curved bridge design checks require Japanese design standards (道路橋示方書) and detailed design procedures
- Required sources: 道路橋示方書 鋼橋編, 鋼橋設計便覧, design calculation examples

### REPORT_READINESS: BLOCKED_REPORT
- Cannot implement: curved bridge calculation report
- Reason: Report format depends on design check results and design standard requirements
- Required sources: design calculation examples showing report format

### DRAWING_READINESS: BLOCKED_DRAWING
- Cannot implement: curved bridge fabrication drawings
- Reason: Drawing format depends on curved bridge detailing rules (radial cross beam, bearing orientation, girder camber)
- Required sources: existing curved bridge drawings, fabrication standards

## 3. Capabilities That Can Be Started Now

These can be implemented with existing sources:
1. **Curved alignment input UI** (horizontal alignment editor already exists for road)
2. **Curved girder line visualization** (offset line display already exists)
3. **Non-numeric curved bridge validation** (schema validation without analysis)
4. **Curved bridge 3D preview** (STL export pattern exists for straight bridges)
5. **Curved bridge model save/load** (persistence pattern exists)
6. **Zero-curvature regression** (straight bridge fallback when radius → ∞)
7. **Curved bridge schema definition** (extend existing types)

## 4. Capabilities That Are BLOCKED

These require sources not yet available:
1. **Warping torsion analysis** → BLOCKED_ANALYSIS (needs Vlasov theory reference)
2. **Secondary stress calculation** → BLOCKED_ANALYSIS (needs calculation method)
3. **Centrifugal load** → BLOCKED_ANALYSIS (needs design standard formula)
4. **Bearing constraint direction** → BLOCKED_ANALYSIS (needs design standard)
5. **Main girder design check** → BLOCKED_DESIGN_CHECK (needs design standard)
6. **Cross frame design** → BLOCKED_DESIGN_CHECK (needs design standard)
7. **Bearing design** → BLOCKED_DESIGN_CHECK (needs design standard)
8. **Camber calculation** → BLOCKED_DESIGN_CHECK (needs calculation method)
9. **Fatigue check** → BLOCKED_DESIGN_CHECK (needs design standard)
10. **Formal calculation report** → BLOCKED_REPORT (needs format)
11. **Formal fabrication drawing** → BLOCKED_DRAWING (needs template)

## 5. Phase Recommendation

**Phase 0-PRE**: Complete this survey (current phase)
**Phase 0**: Search for missing sources, implement non-numeric geometry/model
**Phase 1**: Implement analysis (requires sources)
**Phase 2**: Implement design check (requires sources)
**Phase 3**: Implement report (requires sources)
**Phase 4**: Implement drawing (requires sources)

## 6. Decision Matrix

If sources are found:
- All phases become GO with source-dependent timeline
- If Vlasov torsion theory found → Phase 1 can start
- If 道路橋示方書 found → Phase 2-3 can start
- If drawing examples found → Phase 4 can start

If sources are NOT found:
- Non-numeric geometry and model: GO (current sources sufficient)
- Analysis: NO_GO (cannot develop without theory)
- Design check: NO_GO (cannot develop without standards)
- Report: NO_GO (cannot develop without design check)
- Drawing: NO_GO (cannot develop without design check)