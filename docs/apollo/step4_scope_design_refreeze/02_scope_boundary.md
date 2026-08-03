# 02 — Scope Boundary

**DEVELOPMENT_RESULT_LABEL:** UNVERIFIED_DEVELOPMENT_ONLY
**NUMERIC_DESIGN_AUTHORIZATION:** NOT_GRANTED

## A. Step 4 committed scope

| ID | Scope | Verification level | Phase |
|----|-------|--------------------|-------|
| C-01 | Design workflow control UI (original UX; SuperDesigner principles, not copy) | Development E2E + state tests | 4-A, 4-H |
| C-02 | WorkflowStateModel + prerequisites / recommended / STALE / NOT_AUTHORIZED | Unit + integration | 4-A |
| C-03 | Left/right curb, left/right wall railing, median, optional barrier; EXPLICIT_NONE | Schema + geometry Golden (dev) | 4-B, 4-C |
| C-04 | RC deck haunch per main girder; rectangular/trapezoidal; constant longitudinal range | Geometry + quantity parity | 4-B, 4-C |
| C-05 | Appurtenance + haunch volume → quantity → user unit weight → line load → analysis input (dev-only distribution) | Traceability tests | 4-C |
| C-06 | SpliceAssembly: station, flange/web plates, fillers, simplified bolt pattern; NOT DESIGN-CHECKED | Geometry/qty/drawing/3D | 4-D |
| C-07 | AlignmentBridgeBinding: straight, single grade, constant crossfall/width, CL binding, start/end station | Compatibility cases | 4-E |
| C-08 | 3D dimension overlay + 2-point measure from canonical values (not mesh reverse-engineering) | GUI evidence | 4-F |
| C-09 | Re-integrate into quantity/report/drawings/member schedule/ZIP | Bundle + E2E | 4-G, 4-H |

**Supported initial geometry (committed):** straight; simple single span; equal depth; non-composite RC deck steel plate girder; skew 90°; constant I-section; SI; development-only analysis.

## B. Optional if prerequisites satisfied

| ID | Scope | Prerequisite |
|----|-------|--------------|
| O-01 | Multiple longitudinal segments for appurtenances | C-03 stable; segment UI |
| O-02 | Haunch trapezoid with different top/bottom | C-04 rectangular first |
| O-03 | Splice self-weight into analysis | Explicit decision DEC-S4-0011 |
| O-04 | Road binding with non-zero transverse offset | C-07 centerline first |
| O-05 | Persist dimension overlay annotations in project | 4-F display-first |

## C. Explicit out of scope

| ID | Item | Reason |
|----|------|--------|
| X-01 | Wall railing / curb / median structural checks | Formal standards not authorized |
| X-02 | Bolt count auto-design; slip/bearing/net section/block shear | Design check not granted |
| X-03 | Fatigue checks | Prior freeze; NOT_AUTHORIZED |
| X-04 | Weld design | Out of Step 4 |
| X-05 | Curve / skew / widening / crossfall transition / full V-curve | Geometry complexity |
| X-06 | Variable haunch along span | Deferred |
| X-07 | Fabrication / construction drawings | Step 3 policy |
| X-08 | Formal criteria adoption / OK/NG / authorization GRANTED | Human gate |
| X-09 | Direct copy of legacy Apollo SuperDesigner UI assets | Copyright / modernization |

## Formal boundaries

All Step 4 outputs remain:

- `UNVERIFIED_DEVELOPMENT_ONLY`
- `NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED`
- `DESIGN_OR_CONSTRUCTION_USE: PROHIBITED`
