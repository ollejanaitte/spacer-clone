# 04 — H-03 Architect Decision: bundle unsupportedScope lists continuous design drawings

> **Authority:** Phase 2.5-D (architect decision)
> **Carried from:** Phase 1 `08_gap_analysis.md` G-06 → `05_detailed_report_spec.md` §2; Phase 2 `01_phase1_input_review.md` §10.
> **Judge:** Apollo architecture (recorded).

## 1. Item

**H-03**: `artifactBundle.ts` manifest `unsupportedScope` lists "curve/skew/continuous design drawings" — does this prohibit continuous **design drawings** output, and does it conflict with the Phase 3 Report Model (non-numeric confirmation)?

## 2. Evidence

| # | Source | Statement |
|---|--------|-----------|
| E-01 | `artifactBundle.ts:157-178` | Bundle README known-limitations: "Development drawings only (not fabrication / construction)"; "Straight simple-span equal-depth non-composite RC-deck steel plate girder". |
| E-02 | `artifactBundle.ts:235-239` | manifest `unsupportedScope: ["curve/skew/continuous design drawings", "fabrication drawings", "formal authorization"]`. |
| E-03 | `artifactBundle.ts:186-201` | Bundle still emits generic sheets (G-01..G-07), S-01 standard section, HTML report + drawing-set — for any system incl. continuous (generic). |
| E-04 | Phase 2 `03_report_chapter_structure.md` §5 | CP-08 (線形条件) curve/skew = FORBIDDEN via `unsupportedScope`; CP-18 (3Dモデル確認) = solids + STL manifest only. |
| E-05 | Phase 2 `chapter_matrix.csv` CP-18 | `data_source = solidGeometryParameters + exportApolloBinaryStl manifest`; value_kind = `geometry`; NOT design drawings. |
| E-06 | Phase 2 `chapter_matrix.csv` CP-14 / CP-24 | CP-14 = standard section reference (STANDARD_SECTION, dev preview); CP-24 = GOLD-* refs. No continuous design-drawing chapter. |
| E-07 | Phase 2 `06_output_permission_matrix.md` | PROHIBITED outputs = O-19..O-30 (numeric results); drawing outputs are non-numeric geometry (O-14/O-15) within ALLOWED_WITH_WARNING. |
| E-08 | `continuous_girder/README.md` §1/§4 | Scope = geometry/visualization only; "正式解析・負曲げ・活荷重包絡を明示的に除外し、fail-closed を維持する". Phase C1–C4 = non-numeric geometry/3D. |

## 3. Analysis

- `unsupportedScope` "continuous design drawings" = **continuous-specific design / general-arrangement CAD drawings** (e.g. pier cap details, continuous moment/shear diagram sheets, fabrication-level layouts). These remain unsupported until Phase 6, consistent with `continuous_girder/README.md` §1 (geometry/visualization only, no formal analysis/negative-bending/loads).
- The **dev bundle / Report Model do NOT produce design drawings** at all:
  - Report Model chapters are confirmation-only (CP-18 = 3D solids + STL manifest; CP-14 = standard section reference; CP-24 = GOLD refs). There is no "continuous design drawing" chapter.
  - Numeric results (O-19..O-30, CP-30..34) are PROHIBITED/NOT_AVAILABLE.
- Therefore H-03 does **not conflict** with Phase 3 Report Model scope. The Report Model emits non-numeric confirmation (geometry existence, STL manifest, validation, status) — never `continuous design drawings`. Keeping `unsupportedScope` is consistent with the non-numeric Report Model boundary.
- The generic dev drawing set (G-01..G-07 + S-01) is retained for continuous (development preview), but continuous-specific design drawings stay PROHIBITED.

## 4. Decision

**VERDICT: RESOLVED — ADOPTED**

- `artifactBundle.ts:235-239` `unsupportedScope` entry "curve/skew/continuous design drawings" is **RETAINED** (continuous design drawings remain PROHIBITED until Phase 6).
- Report Model (Phase 3) emits **non-numeric confirmation only** (geometry/STL manifest/validation/status); no design-drawing chapter exists or is planned. No conflict.
- No code change required.
- **Phase 3 implication:** Phase 3 must NOT emit continuous design drawings; CP-14 must remain a STANDARD_SECTION dev reference only. Tracked `DEC-PHA-0003`.

## 5. Phase 3 impact

- Satisfies Phase 3 GO condition "H-01/H-02/H-03 architect 解決済み" for H-03.
- Does **not** unblock numeric/drawing authorization (`NOT_GRANTED`/`PROHIBITED` unchanged).
- Reinforces PROHIBITED reconfirmation in `07_prohibited_output_reconfirmation.md`.

## 6. Status

- H-03: RESOLVED/ADOPTED.
- HEAD: 51090d5 (no code change).
