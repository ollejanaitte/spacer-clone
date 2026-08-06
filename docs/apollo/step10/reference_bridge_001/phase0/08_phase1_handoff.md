# Phase 1 Handoff

## 1. Purpose

Define the scope, conditions, and deliverables for Phase 1 of STEP 10.

Phase 1 is **source set canonization** — the systematic verification of the
source originals and their correspondence.

## 2. Phase 1 scope

### 2.1 Investigation targets

The following items must be confirmed in Phase 1:

1. **Calculation and drawing sheet correspondence**
   - Every calculation page must be mapped to the drawing sheet(s) it references
   - Every drawing sheet must be mapped to the calculation page(s) it supports

2. **Revision numbers and dates**
   - Identify the revision number of each document
   - Confirm the creation/modification date of each document
   - Identify whether the set is a single self-consistent release or assembled from multiple revisions

3. **Bridge identification**
   - Confirm the bridge name, route name, and construction location
   - Confirm the pier/abutment labels (PU15, PR1, PR2, AR2)
   - Confirm the main girder labels (AG1, AG2)

4. **Span arrangement**
   - Confirm span lengths: 40.201m + 51.000m + 40.200m (ACL上)
   - Confirm total bridge length: 134.001m (ACL上)
   - Confirm girder length: 133.151m (ACL上)

5. **Cross-section data**
   - Confirm total width: 8.010m
   - Confirm effective width: 7.000m
   - Confirm girder spacing and overhang dimensions

6. **Curve alignment**
   - Confirm the horizontal alignment parameters (R=160m, R=3000m)
   - Confirm the transition geometry
   - Confirm the superelevation data

7. **Design standards referenced**
   - Confirm the exact edition of each standard
   - Identify any unlisted or supplementary standards

### 2.2 SOURCE_* classification

Each source element must be classified as:

| Classification | Meaning |
|---------------|---------|
| SOURCE_CONFIRMED | Cross-checked and verified by two independent sources or methods |
| SOURCE_PARTIAL | Partial information available; gap identified |
| SOURCE_CONFLICTING | Two or more sources disagree on the same data |
| SOURCE_MISSING | Required information not found in any source |
| HUMAN_CONFIRMATION_REQUIRED | Requires expert judgment to resolve |

### 2.3 Page-level provenance ledger

Phase 1 must produce a page-level provenance ledger that records:

- Source original
- Page number or sheet number
- Content summary
- Corresponding pages in other documents
- SOURCE_* classification
- Notes

## 3. Phase 1 start conditions

Phase 1 may start when:

- [x] Phase 0 is complete (all 6 PRs merged)
- [x] RB-S10-001 is defined
- [x] Source originals are accessible (3/3 CONFIRMED)
- [x] STEP 9 assets are frozen
- [x] Legacy scope findings are summarized
- [x] Source manifest is recorded with verified SHA256 and page counts
- [ ] Phase 0 closeout report is finalized (P0-F)

## 4. Phase 1 constraints

- **No production code changes** — Phase 1 is documentation-only, same as Phase 0
- No analysis model creation
- No numeric calculation
- No golden JSON creation
- No report renderer implementation
- No drawing renderer implementation
- No PDF or image generation

## 5. Phase 1 deliverables

| # | Deliverable | Description |
|---|-------------|-------------|
| 1 | Source page-level provenance ledger | CSV with page-by-page mapping |
| 2 | Calculation-drawing correspondence matrix | Mapping between calculation pages and drawing sheets |
| 3 | Design standard confirmation report | Exact edition list for all referenced standards |
| 4 | Revision and date analysis | Report on revision status and consistency |
| 5 | Bridge identification confirmation | Confirmed bridge metadata |
| 6 | SOURCE_* classification summary | Per-element classification |
| 7 | Phase 1 completion report | Overall verdict and gaps |

## 6. Phase 1 exit criteria

- All investigation targets addressed
- SOURCE_* classification assigned for each element
- Page-level provenance ledger created
- Any unresolved conflicts documented with HUMAN_CONFIRMATION_REQUIRED
- Phase 2 readiness determined

## 7. Document references

- Source originals: `source_original_manifest.csv` (Phase 0)
- Bridge identity: `04_reference_bridge_001_definition.md` (Phase 0)
- Verification gates: `07_verification_gates_and_milestones.md` (Phase 0)
- STEP 10 roadmap: `06_step10_redefinition_and_phase_map.md` (Phase 0)