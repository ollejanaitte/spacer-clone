# Phase 1 Handoff

## 1. Purpose

Define the scope, conditions, and deliverables for Phase 1 of STEP 10.

Phase 1 is **source set canonization** — the systematic verification of the
source originals and their correspondence.

Phase 1 focuses on **document/section/page-range/drawing-group/evidence-anchor
canonization**. Full structural decomposition of every page, table, formula,
note, and drawing element is **Phase 2** responsibility.

## 2. Phase 1 scope

### 2.1 Investigation targets

The following items must be confirmed in Phase 1:

1. **Document identity and revision**
   - Identify the revision number/status of each document
   - Confirm the creation/modification date of each document
   - Identify whether the set is a single self-consistent release or assembled
     from multiple revisions

2. **Bridge identification**
   - Confirm the bridge name, route name, and construction location
   - Confirm the pier/abutment labels (PU15, PR1, PR2, AR2)
   - Confirm the main girder labels (AG1, AG2)

3. **Basic condition parity**
   - Bridge length, girder length, span arrangement
   - Total width, effective width, girder spacing
   - Curve alignment parameters (R=160m, R=3000m)
   - Cross-section type and dimensions
   - Material specifications

4. **Drawing sheet catalog**
   - All 141 sheets by name and PDF page
   - Sheet grouping (general, structure, alignment, cross-section, girder,
     cross-beam, bracing, bearings, etc.)
   - Title block review for representative sheets

5. **Calculation section catalog**
   - Table of contents: chapters and sections
   - Chapter/section start pages (PDF and printed)
   - Page numbering model (offsets, gaps, unnumbered pages, inserts)

6. **Calculation-drawing correspondence**
   - Chapter/section ranges mapped to drawing groups
   - Direct references vs. semantic candidate separation
   - Evidence strength classification

7. **Design standards**
   - Exact edition, organization, year of each referenced standard
   - H29_REFERENCE vs. R7_COMPLIANCE separation

### 2.2 Phase 1 does NOT do

- Full page-by-page table/number extraction
- One-to-one mapping of every calculation page to every drawing sheet
- Design formula verification
- Numeric recomputation
- Golden JSON creation
- Production code implementation

### 2.3 SOURCE_* classification

Each source element must be classified as:

| Classification | Meaning |
|---------------|---------|
| SOURCE_CONFIRMED | Cross-checked and verified by two independent sources or methods |
| SOURCE_PARTIAL | Partial information available; gap identified |
| SOURCE_CONFLICTING | Two or more sources disagree on the same data |
| SOURCE_MISSING | Required information not found in any source |
| HUMAN_CONFIRMATION_REQUIRED | Requires expert judgment to resolve |

### 2.4 Page-level provenance anchors

Phase 1 must produce anchor records for key pages:

- Cover / title page
- Table of contents
- Drawing catalog
- Chapter start pages
- Major section start pages
- Representative drawing sheets (first/last of each group)
- Any page with critical identification metadata

Full structural decomposition of every page is Phase 2.

## 3. Phase 1 start conditions

Phase 1 may start when:

- [x] Phase 0 is complete (all 6 PRs merged)
- [x] Phase 0 closeout merge SHA recorded: aa35c6143af4cbe69b223077bede2aa109692f9a
- [x] RB-S10-001 is defined
- [x] Source originals are accessible (3/3 CONFIRMED)
- [x] STEP 9 assets are frozen
- [x] Legacy scope findings are summarized
- [x] Source manifest is recorded with verified SHA256 and page counts
- [x] Phase 0 closeout report is finalized

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