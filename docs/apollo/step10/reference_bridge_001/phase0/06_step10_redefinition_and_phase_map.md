# STEP 10 Redefinition and Phase Map

## 1. STEP 10 formal name

**STEP 10: Reference Bridge 001 Reproduction Project**

## 2. Development paradigm shift

The previous approach (STEP 9 Phase 6–9) planned "horizontal parallel development"
across curved bridge features. This is **terminated**.

The new approach is **vertical single-path development**:

- Reproduce a single concrete bridge (Reference Bridge 001) end-to-end
- Simple straight bridges are deferred to a future Regression Bridge 002 candidate
- Existing continuous girder assets from STEP 9 are retained for later integration
- Phase 0–5 are docs-first / documentation-only
- Production code changes begin in Phase 6 (bridge geometry reproduction)

## 3. Phase map

| Phase | Name | Description | Docs-only | Production code |
|-------|------|-------------|-----------|-----------------|
| 0 | Old plan freeze and STEP 10 redefinition | Freeze old curved-bridge plan; define RB-S10-001; record source manifest; establish roadmap | YES | NO |
| 1 | Source set canonization | Full page-level provenance; confirm calculation ↔ drawing correspondence; revision mapping; SOURCE_* classification | YES | NO |
| 2 | Complete structural decomposition | Page-by-page decomposition of calculation and drawing content; identify every structural member, load case, design check | YES | NO |
| 3 | Input data goldenization | Transcribe input parameters from originals to structured golden JSON; no solver execution | YES | NO |
| 4 | Layered golden creation | Create layer-specific golden files (geometry, loads, analysis results, design checks, report content, drawing geometry) | YES | NO |
| 5 | Apollo common bridge data model freeze | Freeze the canonical data model for bridge geometry, loads, analysis, design, report, and drawing | YES | NO |
| 6 | Bridge geometry reproduction | Implement geometry model for 3-span continuous curved girder; alignment, cross-section, member layout | NO | YES |
| 7 | Structural analysis model reproduction | Implement structural model, load application, and analysis execution | NO | YES |
| 8 | Load and analysis result reproduction | Run analysis and confirm numeric parity with source | NO | YES |
| 9 | Design check and section adoption reproduction | Implement design checks and confirm adopted sections match source | NO | YES |
| 10 | Apollo standard design calculation report spec freeze | Freeze report model spec for RB-S10-001 class bridges | YES | NO |
| 11 | Design calculation renderer | Implement report renderer producing content-parity output | NO | YES |
| 12 | Design drawing model and renderer | Implement drawing model and renderer producing geometry-parity output | NO | YES |
| 13 | Integrated reproduction test | End-to-end test: input → analysis → design → report → drawing | NO | YES |
| 14 | Simple girder and existing continuous girder migration | Migrate existing simple girder and STEP 9 continuous girder assets to new standard | YES | YES |
| 15 | H29 / R7 standard profile separation | Separate H29 reference standard from R7 compliance standard | YES | YES |

## 4. Key architecture decisions

### 4.1 Single bridge focus

RB-S10-001 (Kanazawa IC A-ramp, 3-span continuous curved steel plate girder) is
the only reproduction target. No other bridge is validated until Phase 13.

### 4.2 Simple girder deferral

Simple straight girders (single-span, non-composite RC deck) are not in scope
for STEP 10. They become Regression Bridge 002 candidates in a future step.

### 4.3 Existing continuous girder asset reuse

STEP 9 continuous girder report model assets (types, transformer, validator,
export gate) are retained unchanged. They will be connected to the new standard
in Phase 14.

### 4.4 Docs-first through Phase 5

No production code is written in Phases 0–5. All deliverables are documentation,
specifications, and golden JSON schemas.

### 4.5 Standard separation

H29_REFERENCE (the standard used by the source original) and R7_COMPLIANCE
(a future target) are kept separate. Phase 15 handles the formal separation.

## 5. Phase 0 completion status

| Phase | Status |
|-------|--------|
| P0-A Baseline | COMPLETE (PR #419) |
| P0-B STEP 9 freeze | COMPLETE (PR #420) |
| P0-C Legacy scope recovery | COMPLETE (PR #421) |
| P0-D Source manifest | COMPLETE (PR #422) |
| P0-E Plan and handoff | COMPLETE (this PR) |
| P0-F Closeout | PENDING |

## 6. Phase 1 readiness

Phase 1 start requires:

- [x] Source originals accessible (3/3 CONFIRMED)
- [x] SHA256 and page count verified
- [x] Bridge identification candidates recorded
- [x] Conflicts enumerated for Phase 1 resolution
- [x] STEP 9 assets frozen
- [ ] Phase 0 closeout complete (P0-F)

## 7. Non-targets for STEP 10

- Concrete box girder bridges
- Steel box girder bridges
- Truss bridges
- Arch bridges
- Cable-stayed bridges
- Suspension bridges
- Seismic isolation design (beyond what is in the source)
- Dynamic analysis (beyond what is in the source)
- Construction stage analysis
- 3D visualization (deferred from previous STEP 6)
- BIM / IFC export