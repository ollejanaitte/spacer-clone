# Stage 8: Verification, Numerical Benchmarks, and Acceptance Plan

> **Authority:** Target verification plan. Rows marked current describe evidence at the Stage 0-5
> fact baseline; planned rows are future acceptance work. A manual/reference result is not an oracle
> until its version, inputs, sign/unit mapping, provenance, and tolerance are qualified.

Generated: 2026-07-15 (Asia/Tokyo)
Evidence HEAD: 21c8a93c41533f78c66c021db84931cd3aaed5db

1. Executive Summary

Stage 8 defines how correctness will be demonstrated for the two products, their versioned
Road-to-Frame boundary, persistence/migration, and outputs. It does not infer correctness from a
test name, a self-generated snapshot, or agreement with the same implementation through another
route. Every acceptance row identifies a fixture, oracle, comparison quantity, sign/unit rule,
tolerance policy, binary pass/fail rule, priority, automation level, and dependent Gap.

The oracle hierarchy is fixed as follows:

  O1  exact invariant, published formula/standard, or independently reviewed hand calculation
  O2  independent implementation/solver with recorded version, inputs, and conventions
  O3  controlled SPACER result export with product version/settings and independently mapped signs
  O4  approved golden derived from O1/O2/O3 and protected by provenance/checksum/review
  O5  metamorphic/property/conservation relation
  O6  semantic parse/render assertions and expert visual review (supplemental, never numeric proof)

The tolerance strategy is quantity-specific. Exact identity/topology/schema/checksum assertions are
not blurred by numeric tolerance. Numeric rows choose absolute, relative, or combined comparison
from a reviewed tolerance register. A combined comparison passes when:

  abs(actual - expected) <= max(absTol, relTol * max(abs(expected), scaleFloor))

Units and sign conventions are asserted before magnitude comparison. A sign mismatch is a failure
unless the oracle classifies the expected quantity as zero within its approved zero band. Solver
conditioning never justifies silently widening a tolerance: equilibrium, residual, condition
diagnostics, and response comparisons are separate acceptance quantities.

Existing reusable evidence is strongest for current LINER straight/arc/clothoid/vertical/cross-
section calculations; closed-form beam/torsion FEM cases; eigen, response-spectrum, influence-line,
and moving-load units; and Drawing/DXF semantic output. It is not complete target coverage. Spring,
release, rigid offset, static combinations, full INFLOAD, formal frame DRAFT, LDIST, HAUNCH, HOSO,
TOOL, multiple-line/branch/merge/widening, target migration preservation, and transfer transaction
behavior remain planned acceptance suites.

`examples/spacer-reference/` contains only a README/template, not actual SPACER CSV results.
Consequently no current test may be called SPACER parity. Portal-frame, truss, and L-frame metadata
also contain missing expected values or equilibrium-only checks; they are fixtures/property tests,
not qualified numerical goldens until an independent oracle is added.

Stage 8 is complete. Open numerical tolerance values, reference-corpus acquisition, performance
budgets, and visual baseline environments have explicit owners and release gates; they do not
reopen Stage 6/7 ownership or contracts.

2. Scope

IN:
- Oracle hierarchy, tolerance governance, golden governance, and automation classification.
- Road geometry and planned LINER/LDIST/HAUNCH/HOSO/GDRAW/TOOL/Importer acceptance.
- Road-to-Frame coordinate/ID/re-import/conflict/protection/rollback acceptance.
- Frame model, static/dynamic/influence/live-load/PRINT/DRAFT numerical acceptance.
- Save/reload, migration, raw/unknown preservation, route/deep-link compatibility.
- Drawing, DXF, PDF, CSV, Viewer semantic and visual verification.
- Performance, large-model, recovery, result-staleness, and backward-compatibility gates.
- Traceability from D6/D7 and P0/P1 risks/Gaps to suites and release gates.

OUT:
- Source, tests, fixtures, schema, migration, solver, UI, route, or dependency implementation.
- Final numerical values for every future tolerance and performance budget without evidence.
- Stage 9 asset disposition and Stage 10 implementation sequence.

3. Inputs Reviewed

Accepted architecture/contract inputs:
- [Stage 6 target architecture](./stage6_target_architecture.md)
- [Stage 7 shared platform and contracts](./stage7_shared_platform_and_contracts.md)
- [decision log](./decision_log.md)
- [open decisions](./open_decisions.md)
- [Stage 4 road current facts](../../scoping/stage4_road_design_scope.md)
- [Stage 5 frame current facts](../../scoping/stage5_frame_analysis_scope.md)
- [current feature gaps](../../scoping/feature_gap_matrix.md)
- [current risks and unknowns](../../scoping/risks_and_unknowns.md)

Existing road and transfer candidates:
- frontend/src/liner/core/__tests__/**
- frontend/src/liner/schema/__tests__/**
- frontend/src/liner/importer/** tests and built-in samples
- frontend/src/liner/adapters/** tests
- frontend/src/liner/mapper/** tests
- frontend/src/liner/headless/__tests__/createHeadlessLinerFrameProject.test.ts
- frontend/src/bridgeDefinition/** tests, semanticParity fixtures, and regression goldens
- examples/liner/gc-01-domain.json and gc-06-domain.json with expected intermediate files
- docs/liner/test_plan_geometry.md and phase3.5/updates/test_plan_geometry_update.md

Existing frame candidates:
- backend/tests/test_engine_verification_cases.py
- backend/tests/test_regression_verification.py
- backend/tests/test_verification_framework.py
- backend/tests/test_eigen_analysis.py
- backend/tests/test_response_spectrum_analysis.py
- backend/tests/test_influence_analysis.py
- backend/tests/test_moving_load_analysis.py
- backend/tests/test_bridge_fem_generator.py and test_bridge_validation.py
- examples/verification/**, examples/*.json, and backend/tests/sample_models.py
- docs/11_test_spec.md
- examples/spacer-reference/README.md

Existing output/nonfunctional candidates:
- frontend/src/liner/drawing/** tests
- frontend/src/liner/dxf/** tests and frontend/tests/e2e/phase5-* drawing/DXF specs
- frontend/src/exports/resultCsvExport.test.ts and resultPdfReport.test.ts
- frontend/src/viewer/** tests
- frontend/src/timeHistory/** persistence/migration tests
- frontend/src/liner/importer/storage/** tests
- backend API/schema/save/load/result tests
- docs/verification/time-history-*-manual-smoke-test.md

Manual references used only for target semantics/coverage, not numerical truth:
- JIP-LINER manual: sections 5.2-5.8 pp.33-124; HAUNCH section 6 pp.125-136;
  HOSO section 7 pp.137-142; drawing section 8 pp.143-156; samples section 10 pp.162-168.
- SPACER manual: section 6.1.3 p.32 load combination table; section 6.2 pp.34-64 fixed
  load/influence creation including nodal/member springs; section 6.3 pp.65-101 influence;
  section 6.4 pp.102-113 eigen/response spectrum; sections 6.5-6.6 pp.114-177 PRINT/DRAFT;
  TV/PV descriptions pp.4-5. No manual body is copied into this plan.

4. Current Facts Used

CF8-01. LINER tests include analytical straight/arc references, a high-resolution Simpson
clothoid reference, multi-element alignment, station equations, vertical grade/parabola, crossfall,
cross-section sampling, and continuity tolerances. Clothoid smoke code still identifies itself as
a Phase 0 approximation, so target accuracy requires qualification beyond current green tests.

CF8-02. Existing LINER tolerance constants mix use cases: coordinate 0.001 m, length/elevation/
station 1e-6, offset 1e-4, azimuth 0.001 degree, plus display/DXF/frame sampling bands. These are
evidence candidates, not a universal release tolerance.

CF8-03. Multiple alignments have schema/UI preparation evidence, but branch, merge, and widening
target behavior is incomplete. LDIST, HAUNCH, HOSO, and TOOL are absent. GDRAW and Importer are
partial. Their Stage 8 rows are planned acceptance, not current coverage.

CF8-04. Static engine cases compare cantilever, simple-beam point/uniform load, and torsion against
closed-form theory; validation includes unstable and invalid-reference cases. Current helper default
is combined relative 1e-5 and absolute 1e-9, with some regression metadata at other bands.

CF8-05. Influence-line tests use closed-form cantilever/simple-beam relations. Moving-load MVP tests
cover a single point load, linear scaling, envelope/history, and invalid direction/magnitude.
This is not full INFLOAD vehicle/lane/combination functionality.

CF8-06. Eigen tests include spring-mass/condensed-bending formulas, mass normalization, effective
mass, schema/API, and failure cases. Response-spectrum tests include SDOF response, interpolation,
SRSS/CQC properties, reactions/section forces, schema/API, and invalid inputs. Independent multi-DOF
reference solver/SPACER corpora are not present.

CF8-07. Spring, member-end release, rigid offset, static load combinations, full PRINT, and formal
frame CAD DRAFT are absent/partial per Stage 5. Existing Viewer is not a DRAFT oracle.

CF8-08. DXF tests parse round-trips for LINE/LWPOLYLINE/ARC/TEXT, Japanese text, layer and meter
header, large/negative coordinates, mapping, deterministic ordering, and invalid finite values.
Drawing tests assert paper geometry, scale, station alignment, labels, bounds, and non-overlap.
They do not replace external CAD interoperability and printed visual review.

CF8-09. PDF tests primarily assert report sections/HTML and values supplied by fixtures; CSV tests
assert headers, ordering, finite values, and selected influence/eigen fields. Current PDF omits some
influence/moving-load content. Output formatting tests do not independently validate solver values.

CF8-10. Existing migration tests cover selected LINER v0.1/v0.2/v0.3 roundtrips/idempotence and
reject unknown fields. They do not implement D7 raw preservation/quarantine/collision behavior.

CF8-11. `examples/spacer-reference/` contains only README instructions. No displacement/reaction/
member-force CSV or metadata corpus exists. SPACER manual defines functions and operations, not a
machine-readable result oracle for this repository.

CF8-12. `examples/verification/frame/portal_frame_horizontal.meta.json` and truss/L-frame metadata
contain null or to-be-determined expected values. Current tests mainly assert equilibrium. These
cannot be promoted to O4 golden without an O1/O2/O3 qualification record.

5. Decisions

D8-01 | DECIDED | Oracle hierarchy and independence
Decision: use O1 through O6 hierarchy above. Prefer O1/O2 for numerical core; use O3 SPACER as a
controlled compatibility reference, not as unexplained truth. O4 requires upstream provenance.
Rationale: agreement with the same code path can preserve the same defect. Impact: every benchmark
records oracle source/version/checksum and independence. Compatibility: existing goldens are
candidates pending qualification. Verification: oracle metadata schema and review gate.
Revisit only if a certified benchmark standard supplies stronger evidence.

D8-02 | DECIDED | Quantity-specific tolerance register
Decision: no one tolerance applies to all quantities. Each benchmark registers exact/absolute/
relative/combined mode, absTol, relTol, scaleFloor, quantity/unit, source evidence, owner, and review
date. Unset numeric values block the affected acceptance gate. Rationale: coordinate, displacement,
force, eigenvalue, and report layout scales differ. Impact: tolerance changes are reviewed changes,
not snapshot updates. Compatibility: existing values seed evidence only. Verification: boundary,
zero, scale, and rejection tests. Revisit with new standards/conditioning evidence per quantity.

D8-03 | DECIDED | Sign and unit checks precede magnitude
Decision: assert canonical units and axis/local-global convention first. Nonzero sign mismatch fails
even when absolute magnitude matches. Vector components and result labels are compared explicitly;
norms alone are insufficient. Rationale: P0 coordinate/sign risk. Impact: fixtures include asymmetric
components. Compatibility: Viewer transforms remain display-only. Verification: permutation/sign/
unit metamorphic cases. Revisit: never without changing the governing D6 contract.

D8-04 | DECIDED | Current and planned acceptance are separate
Decision: tag each suite CURRENT-CANDIDATE, CURRENT-PARTIAL, or PLANNED. Passing current tests does
not satisfy a PLANNED target row. Rationale: prevents overclaim for missing modules. Impact: Stage 10
exit gates require planned suites to exist/pass. Compatibility: current assets can be reused.
Verification: traceability report rejects missing suite IDs. Revisit only when implementation and
evidence promote a row through review.

D8-05 | DECIDED | Solver correctness is multi-metric
Decision: numerical response comparison, global equilibrium, element/node consistency, normalized
linear-system residual, finite-value checks, and conditioning diagnostics are independent criteria.
Ill-conditioned fixtures are warning/error behavior tests and do not receive an unreviewed wider
tolerance. Rationale: a response can match one scalar while the model is unstable. Impact: solver
results expose/derive diagnostic quantities. Compatibility: current theory tests remain useful.
Verification: well-conditioned, near-singular, rigid-body, and scale-transformed fixtures.
Revisit if solver algorithm changes; criteria remain, thresholds may be requalified.

D8-06 | DECIDED | Specialized dynamic comparison
Decision: eigenvalues/frequencies use numeric comparison; normalized mode shapes use sign-invariant
MAC, and repeated/near-repeated modes compare invariant subspaces. Mass normalization/effective mass
and residuals are separate. SRSS/CQC compare modal inputs, correlation properties, combined values,
and nonnegative envelope semantics. Rationale: raw mode-vector signs/order are not stable or
meaningful. Impact: independent multi-DOF references required. Verification: SDOF and repeated-mode
fixtures. Revisit if a different normalization is declared in the contract.

D8-07 | DECIDED | Transfer acceptance is fail-closed and non-mutating
Decision: asymmetric non-origin non-zero-Z fixtures are mandatory. Exact context/unit/ID/revision/
checksum assertions precede coordinates. Re-import uses three-way expected ChangeSets; frame-owned
mechanics/results/Viewer fields must be byte/semantic unchanged. Invalid partial dependency closure,
stale source, coordinate uncertainty, or ID collision must reject atomically. Rationale: D6/D7 P0
boundaries. Impact: transaction-level integration suite required. Verification: T8 matrix.
Revisit: never for compatibility convenience.

D8-08 | DECIDED | Migration success includes preservation evidence
Decision: a migration is accepted only when original raw checksum remains recoverable, known fields
map correctly, unknowns follow D7 classification, rerun is idempotent, split commit is atomic,
legacy source is unchanged, and rollback restores the target reference state through a new revision.
Rationale: a valid target schema alone does not prove no data loss. Impact: destructive-path fault
injection and future-version fixtures. Verification: M8 matrix. Revisit only with equivalent formal
preservation guarantees.

D8-09 | DECIDED | Semantic output and visual output are separate gates
Decision: Drawing/DXF/PDF/CSV/Viewer semantic assertions validate entities, values, units,
coordinates, dimensions, labels, pages, and clipping. Visual goldens/manual inspection separately
validate legibility/layout on controlled environments. A pixel snapshot cannot prove CAD semantics;
a parser cannot prove readable print. Rationale: different failure modes. Impact: both gates where
the output is user-facing. Verification: O8 matrix. Revisit if a certified semantic renderer exists.

D8-10 | DECIDED | Golden update governance
Decision: every numerical/visual golden has fixture/oracle/version/checksum, creation method,
reviewer, tolerance, and reason. Updating production code and its expected golden in one PR requires
independent oracle evidence and explicit approval. Rationale: prevents self-blessing regressions.
Impact: generated artifacts are reviewed. Compatibility: current goldens remain unqualified until
metadata exists. Verification: CI metadata/checksum policy. Revisit only for stronger governance.

D8-11 | DECIDED | Performance is baseline-and-budget based
Decision: record hardware/OS/runtime/build, warmup, repetitions, model dimensions, median and tail,
memory, output size, and baseline commit. Product owners approve budgets after measurements; absent
budgets block the affected release gate, not design work. Rationale: arbitrary thresholds are not
evidence. Impact: dedicated non-flaky performance lane. Compatibility: SPACER documented size limits
are fixture candidates, not automatically product promises. Verification: N8 matrix.
Revisit on supported-environment or algorithm changes with a new baseline.

D8-12 | DECIDED | Layered acceptance gates and traceability
Decision: G0 contract, G1 road, G2 migration, G3 transfer, G4 frame static/model, G5 dynamics/live
load, G6 outputs, and G7 nonfunctional/release gates are independently blocking for their scope.
Every P0/P1 and D6/D7 decision maps to suites and a gate. Rationale: a single all-tests-green status
cannot show which product invariant is proven. Impact: Stage 10 PR/phase exits reference these gates.
Verification: traceability completeness check. Revisit by adding gates, not collapsing evidence.

6. Recommended Items

R8-01 | RECOMMENDED | Introduce a benchmark manifest format containing fixture checksum, oracle
class/source/version, units/sign, comparison quantities, tolerance register IDs, and approval.

R8-02 | RECOMMENDED | Build an independent reference harness for matrix assembly/solution and road
geometry using a separate implementation/library. Avoid importing production evaluator functions
into expected-value generation.

R8-03 | RECOMMENDED | Acquire a licensed, reviewable SPACER corpus for a small orthogonal set of
models before claiming SPACER compatibility. Record product version/module/settings and preserve
raw exports. Do not populate expected values from the clone's first successful run.

R8-04 | RECOMMENDED | Add property-based transformations: translation/rotation/unit conversion for
road/transfer geometry; load/material scaling, node reordering, and coordinate rotation for FEM.

R8-05 | RECOMMENDED | Run semantic output checks in ordinary CI and visual/CAD interoperability/
performance suites in controlled scheduled or release lanes.

7. Open Decisions

OD6-01 | OPEN | P0 | Legacy coordinate authority
Stage 8 gate: no affected migration/transfer fixture passes G2/G3 until authoritative context is
classified. Owner: road geometry plus migration owner. Evidence: real legacy corpus and asymmetric
goldens. Default remains preview/quarantine only.

OD6-02 | OPEN | P0 | Stable ID migration/collision aliases
Stage 8 gate: collision/recreated-ID/reorder/one-to-many/rollback corpus must pass before G2/G3.
Owner: ID contract plus migration owner. Default remains apply block.

OD6-04 | OPEN | P2 | Redirect retirement
Stage 8 gate: compatibility aliases are tested indefinitely. Removal needs product telemetry/release
policy and a revised route matrix. It does not block current Stage 8 completion.

OD8-01 | OPEN | P1 | Production numerical tolerance register values
Question: what approved numeric bands apply per road coordinate/station/elevation, FEM displacement/
force/residual, eigen/subspace, response-spectrum, and transfer coordinate quantity?
Default: current values are evidence candidates only; unset row blocks its acceptance gate.
Owner: road numerical lead or solver numerical lead with verification owner.
Evidence: O1/O2/O3 cross-run distribution across representative scale/conditioning and supported
platforms. Decision gate: before the affected feature exits G1/G3/G4/G5.

OD8-02 | OPEN | P1 | Independent/SPACER reference corpus availability
Question: which SPACER exports and independent solver results can be legally stored and reproduced?
Default: no SPACER parity claim; O1/O2-qualified features may proceed independently.
Owner: product/licensing owner plus verification owner.
Evidence: raw exports, version/settings, fixture mapping, checksums, review notes.
Decision gate: before any SPACER-parity acceptance claim or broad frame compatibility release.

OD8-03 | OPEN | P1 | Performance and large-model budgets
Question: supported hardware/runtime and numeric time/memory/file-size budgets per workflow.
Default: record baselines without pass claim; missing budget blocks G7 performance release.
Owner: performance/release owner with road/frame product owners.
Evidence: repeated baseline measurements at declared model sizes and user workflow targets.
Decision gate: before production performance acceptance.

OD8-04 | OPEN | P2 | Controlled visual baseline environments
Question: supported browser/Electron, fonts, DPI, paper/PDF engine, CAD viewers, and permitted pixel
variation for visual goldens.
Default: semantic checks plus manual review; no cross-platform pixel-equivalence claim.
Owner: drawing/report QA and release owner.
Evidence: representative platform matrix and approved baseline captures.
Decision gate: before GDRAW/PRINT/DRAFT visual release gate G6.

8. Main Matrices / Architecture

8.1 Matrix Legend

Common columns in every verification matrix:
- Fixture: deterministic input plus version/checksum; `planned` means it does not yet exist.
- Oracle: O1-O6 hierarchy above.
- Compare/sign/unit: quantities and their governing coordinate/local-axis/unit convention.
- Tol: EXACT, ABS(registry), REL(registry), COMBINED(registry), or VISUAL(registry).
- Pass: binary criterion; warnings never silently convert a fail to pass.
- Pri: P0-P3 risk priority.
- Auto: A0 current automated candidate; A1 planned unit/contract; A2 planned integration;
  A3 planned E2E/release; M controlled manual review supplemental.
- Gap: dependent feature/contract Gap; CURRENT means implemented but still subject to qualification.

8.2 Numerical Benchmark Matrix - Road Design

ID | Target | Fixture | Oracle | Compare/sign/unit | Tol | Pass | Pri | Auto | Gap
R8-01 | straight | translated/rotated 100 m line, endpoints/interior | O1 analytic | x/y m, azimuth rad, right-handed | ABS road-coordinate register | every point/tangent/end exact within band | P0 | A0+A1 | CURRENT
R8-02 | circular arc | left/right arcs, non-origin, quadrant crossing | O1 trig formula | x/y m, signed curvature 1/m, azimuth rad | ABS+angle registers | samples/end/tangent/curvature pass, sign exact | P0 | A0+A1 | CURRENT
R8-03 | clothoid | straight-to-curve and finite-radius transitions both turns | O2 independent Fresnel/high-precision integration | x/y m, curvature 1/m, azimuth rad | ABS+angle, evidence pending OD8-01 | all stations plus C1 boundaries pass; no Phase0-only claim | P1 | A0 candidate+A1 | clothoid qualification
R8-04 | compound alignment | straight-arc-clothoid-arc, translated/asymmetric | O1 per element + O5 continuity | point/tangent/curvature, m/rad/1/m | ABS/angle; exact element IDs/order | C0/C1 rules and cumulative length/stations pass | P0 | A0 partial+A1 | compound/multi-element
R8-05 | station/equation | origin offset, interval, duplicate, add/sub equations | O1 hand table | physical/display station m; boundary before/after sign | EXACT IDs/order + ABS station | table, duplicate diagnostics, inverse lookup pass | P0 | A0+A1 | station completeness
R8-06 | vertical profile | grades and convex/concave parabolas, discontinuity negatives | O1 formula/hand table | elevation m, grade ratio/sign, station m | ABS elevation/grade registers | values, slopes, coverage diagnostics pass | P0 | A0+A1 | CURRENT
R8-07 | cross slope | left/right/crown/inversion, nonzero center elevation | O1 z=profile+template-offset*slope | z/offset m, slope %, right-down convention | ABS z + exact sign/mode | each side and inversion pass; no double application | P0 | A0+A1 | CURRENT
R8-08 | cross-section composition | lanes/sidewalk/median/custom offsets, change section | O1 hand geometry + O5 symmetry | offsets/z m, role/ID exact | ABS coordinates + EXACT topology | boundaries/order/roles/elevations/reference closure pass | P1 | A0 partial+A1 | cross-section completeness
R8-09 | multiple alignments | two independent crossing alignments with shared station values | O1 analytic per line + O5 isolation | coordinates/stations IDs, m/rad | row tolerances + EXACT namespace | no cross-line ID/data leakage; each oracle passes | P1 | A1+A2 | multiple alignment
R8-10 | branch/merge | main/branch/merge at skew non-origin points | O1 constructed intersection + O2 reference geometry | junction point/tangent/ownership, m/rad | ABS+angle + EXACT graph | graph/reference continuity and branch rules pass | P1 | A1+A2 | branch/merge
R8-11 | widening | constant, linear, quartic widening and transition boundaries | O1 formula/hand table; manual 5.2 semantics | offset/width m and derivative/sign | ABS offset + boundary angle | widths, continuity, endpoints and side sign pass | P1 | A1+A2 | widening
R8-12 | LDIST | skew/curved girders and overhang at stations | O1 vector distance/projection hand calc | distance/overhang m, selected line IDs | ABS distance register | all requested distances/sign/labels and invalid refs pass | P2 | A1+A2 | LDIST absent
R8-13 | HAUNCH | representative type families incl. 2-point/3-point/plane/range | O1 hand planes/lines + controlled LINER sample/O3 if acquired | haunch/top elevation m, station/side sign | COMBINED per elevation | each type/range/boundary and diagnostics pass | P2 | A1+A2 | HAUNCH absent
R8-14 | HOSO | auto, longitudinal, transverse, 2/3-point thickness | O1 hand plane/interpolation + controlled sample | pavement thickness/elevation m, nonnegative/sign | COMBINED thickness | points/ranges/checks and negative rejection pass | P2 | A1+A2 | HOSO absent
R8-15 | GDRAW | plan/profile/cross-section/coordinate/dimension fixture | O1 source geometry + O6 output semantics | m model, mm paper, rad; labels exact | semantic EXACT/ABS; visual separate | O8 semantic and visual rows both pass | P2 | A0 partial+A3+M | GDRAW partial
R8-16 | TOOL | station/coordinate/angle/distance calculators by declared catalog | O1 hand formula set | declared m/rad and sign | ABS/angle or EXACT per tool | every catalog case and invalid input passes | P2 | A1 | TOOL absent/catalog pending
R8-17 | Importer | GC-01/GC-06 plus skew/asymmetric reviewed PDF mapping | O4 approved mapping review backed by source annotation | extracted values/IDs/units/coordinates | EXACT categorical + ABS numeric register | no unreviewed fallback; diagnostics/provenance/roundtrip pass | P1 | A0 partial+A2+A3 | Importer partial

8.3 Numerical Benchmark Matrix - Bridge Frame Analysis

ID | Target | Fixture | Oracle | Compare/sign/unit | Tol | Pass | Pri | Auto | Gap
F8-01 | node/member/material/section/support | minimal valid + invalid refs/duplicates/nonfinite | O1 schema/invariants | IDs/topology exact; m,kN,kN_m,kN/m2,m2,m4 | EXACT except finite numeric domains | valid accepted; each invalid path/code rejected | P0 | A0+A1 | validation completeness
F8-02 | cantilever point load | existing 1-member P,L,E,I | O1 PL3/3EI, PL2/2EI, P,PL | displacement m, rotation rad, reaction kN/kN_m; local/global signs | COMBINED response register | response, equilibrium, residual, finite all pass | P1 | A0 qualified | CURRENT
F8-03 | simple beam center load | existing 2-member center-node fixture | O1 PL3/48EI, P/2, PL/4 | m,kN,kN_m and sagging/reaction signs | COMBINED | displacement/reaction/moment/equilibrium pass | P1 | A0 qualified | CURRENT
F8-04 | uniform fixed load | existing simply-supported full-span w | O1 5wL4/384EI, wL/2, wL2/8 | w kN/m, response units/signs | COMBINED | equivalent load, response, equilibrium/residual pass | P1 | A0 partial+A1 | fixed load completeness
F8-05 | torsion/3D frame | cantilever torsion plus asymmetric L/portal frame | O1 TL/GJ for torsion; O2 independent solver for frames | rad,kN_m and all 6 components/local axes | COMBINED per quantity | torsion plus full vector response/residual/equilibrium pass | P1 | A0 torsion+A1 | 3D qualification
F8-06 | diagonal/coupled/node-member spring | axial/lateral/rotational and coupled small systems | O1 kx=F and matrix hand calc + O2 | kN/m,kN_m/rad, displacement/rotation signs | COMBINED + matrix symmetry EXACT | stiffness assembly/response/reaction/energy pass | P1 | A1+A2 | spring absent
F8-07 | member-end release | fixed-pinned, pinned-pinned, partial rotational release | O1 beam theory + O2 | released force component zero; rotations/moments signs/units | ABS zero + COMBINED response | released DOF force, rank/stability and response pass | P1 | A1+A2 | release absent
F8-08 | rigid offset | eccentric cantilever/frame both ends | O1 rigid kinematics/equilibrium + O2 | offset m, rotations rad, moment transfer kN_m | COMBINED; rigid relation ABS | kinematics, transformed forces, equilibrium pass | P1 | A1+A2 | rigid offset absent
F8-09 | fixed load catalog | nodal, member point/UDL, self-weight, temperature if scoped | O1 equivalent nodal load and beam formulas | local/global force/moment/load units and signs | COMBINED | load vector, response, superposition/equilibrium pass | P1 | A0 partial+A1+A2 | fixed load partial
F8-10 | influence line | existing cantilever and simple beam station sets | O1 closed-form triangular/linear relations | unit-load response signs; station m | COMBINED + endpoint ABS | ordinates, endpoints, reciprocity/property pass | P1 | A0 qualified+A1 | influence partial
F8-11 | full INFLOAD | lanes, axles, multiple vehicles, direction, simultaneous forces | O1 hand convolution small case + O2/O3 corpus | axle kN, positions m, effect signs/envelope | COMBINED response; EXACT placement IDs | placement, superposition, critical positions/envelopes pass | P1 | A1+A2 | INFLOAD incomplete
F8-12 | moving-load MVP | existing single point magnitude/history/on-off | O1 influence convolution + O5 linearity | station m, effect kN/kN_m signs | COMBINED + exact history cardinality | history/envelope/max station/scaling/errors pass | P1 | A0 candidate | moving-load MVP
F8-13 | eigen | SDOF axial, cantilever bending, 2DOF distinct/repeated modes | O1 SDOF/condensed; O2 eigensolver | eigenvalue, Hz,s, mass; MAC/subspace sign-invariant | COMBINED eigen + MAC/subspace register | values, residual, normalization, effective mass/order pass | P1 | A0 partial+A1 | eigen qualification
F8-14 | response spectrum | SDOF, 2DOF SRSS/CQC, interpolation endpoints/directions | O1 SDOF/modal formulas + O2 | acceleration convention, m/kN/kN_m; envelope nonnegative | COMBINED + exact method/config | modal, interpolation, correlation, combined/result forces pass | P1 | A0 partial+A1 | R-SPECTRUM qualification
F8-15 | static combinations | signed factors incl. 0/negative, nested prohibited/declared | O1 linear superposition hand table | component signs/units/case IDs | EXACT factors/order + COMBINED result | every component equals weighted sum; invalid refs/cycles reject | P1 | A1+A2 | combinations absent
F8-16 | envelope/max-min | cases with different component extrema and stations | O1 enumerated hand table | signed min/max, absMax, governing case/station exact | COMBINED values + EXACT provenance | extrema and governing provenance pass; no sign loss | P1 | A1+A2 | envelope incomplete
F8-17 | PRINT | static/dynamic/influence/live-load/combination report fixture | O1 source result object + O3 layout semantics reference | all labels/values/units/signs/pages | EXACT semantics; numeric source register; visual separate | complete sections and source equality plus O8 visual pass | P2 | A0 partial+A3+M | PRINT partial
F8-18 | formal DRAFT | structure/load/result/influence drawings at skew 3D model | O1 source model/result + O6 controlled drawing review | projected coordinates, symbols, scales, units/labels | semantic ABS/EXACT; visual separate | complete drawing catalog, no Viewer substitution, O8 pass | P1 | A1+A3+M | DRAFT partial

8.4 Acceptance Gates

Gate | Scope | Blocking Acceptance
G0 Contract | schemas, IDs, coordinate/unit/sign, revision/checksum | all P0 contract/schema negative tests; no NaN/Infinity; forbidden domain fields absent
G1 Road | R8-01..17 applicable to released modules | all released P0/P1 road rows automated; P2 module rows before that module release
G2 Migration | M8 matrix | raw recovery, version classification, idempotence, atomicity, rollback, source unchanged
G3 Transfer | T8 matrix | coordinate/ID gates, three-way diff, no frame overwrite, atomic/rollback/stale behavior
G4 Frame Static | F8-01..09,15..16 | O1/O2 numerical, residual/equilibrium, validation, combinations/envelopes for released scope
G5 Dynamics/Live | F8-10..14 | independent numerical qualification, modal/live-load properties, output provenance
G6 Outputs | O8 matrix plus F8-17/18/R8-15 | semantic gate always; controlled visual/interoperability gate for user-facing release
G7 Release/NFR | N8 matrix | save/reload/staleness/recovery/compatibility and approved performance budgets

9. Compatibility

9.1 Road-to-Frame Test Matrix

ID | Target | Fixture | Oracle | Compare/sign/unit | Tol | Pass | Pri | Auto | Gap
T8-01 | coordinate transform | x/y/z all distinct, non-origin, non-zero-Z, skew axes | O1 homogeneous transform hand table | right-handed z-up x/y/z m; determinant/sign exact | ABS transfer-coordinate + EXACT context | all points/vectors/lines transform and inverse roundtrip pass | P0 | A1+A2 | OD6-01/coordinate adapter
T8-02 | unit conversion | legacy mm/degree provenance to target m/rad | O1 conversion constants | m/rad exact declared units; angles signed | COMBINED conversion + EXACT unit tags | values convert once; missing/duplicate conversion reject | P0 | A1 | unit adapter
T8-03 | stable IDs | reordered geometry, persisted IDs, duplicate/recreated IDs | O1 identity manifest | namespaces/kinds/IDs/aliases exact; N/M forbidden | EXACT | reorder stable; collisions block with diagnostic | P0 | A1+A2 | OD6-02/stable ID
T8-04 | one-to-many mapping | one road girder/support region -> multiple FEM entities | O1 expected mapping graph | road IDs separate frame IDs; cardinality exact | EXACT graph | complete mapping/provenance, no ID conflation | P0 | A1+A2 | mapping contract
T8-05 | first import | minimum applyable `bridge-frame-v1` package | O1 package/apply manifest | exact contexts/revisions/checksums; coords m | EXACT + coordinate ABS | expected frame candidates/revision/record only | P0 | A2 | transfer apply
T8-06 | re-import no frame edit | baseline/new road/current frame with source-only change | O1 enumerated three-way ChangeSet | stable-ID operations and revisions exact | EXACT ops + numeric row tolerances | expected proposals apply atomically/idempotently | P0 | A2 | diff engine
T8-07 | conflict/frame protection | same road geometry and mapped frame item both edited | O1 enumerated conflict table | ownership/status exact; mechanics units untouched | EXACT conflict + byte/semantic unchanged | conflict raised; frame preserved by default; no revision on reject | P0 | A2+A3 | conflict resolver
T8-08 | mechanics/results/Viewer exclusion | package adjacent to materials, sections, springs, loads, results, UI state | O1 forbidden-field list + target snapshots | hashes/values/IDs exact; all engineering units | EXACT | fields absent from package and unchanged after apply/reject | P0 | A1+A2 | ownership filter
T8-09 | dependency-closed partial apply | span/girder/support operations selected valid/invalid subsets | O1 dependency graph | IDs/edges exact | EXACT | valid closure commits all; invalid subset commits none | P0 | A1+A2 | partial apply
T8-10 | rollback | applied transfer, unrelated later edit, inverse preconditions | O1 revision/patch ledger | before/after revision/checksum and values exact | EXACT + numeric row tolerance | allowed inverse creates new revision; stale inverse rejects atomically | P0 | A2 | rollback/history
T8-11 | stale source | accessible changed source, matching source, inaccessible source | O1 state table | revision/checksum/status exact | EXACT | changed blocks; match passes; inaccessible needs explicit approval/unverified record | P0 | A2 | stale detection
T8-12 | missing capabilities | empty advanced arrays with each capability state | O1 D7-07 profile rules | collection/cardinality/status exact | EXACT | preview valid; apply only when minimum profile met; no defaults fabricated | P1 | A1 | package v1
T8-13 | tamper/transaction failure | checksum mutation and injected failure at each commit step | O1 checksum/atomic ledger | checksum/status/revision exact | EXACT | tamper rejects; no partial docs/refs; failed record policy honored | P0 | A2 | transaction infrastructure

9.2 Migration Test Matrix

ID | Target | Fixture | Oracle | Compare/sign/unit | Tol | Pass | Pri | Auto | Gap
M8-01 | current exact version | target doc with known/extensions fields | O1 identity manifest | raw/content checksums, fields/units exact | EXACT | save/reload canonical equality and raw recovery pass | P0 | A1+A2 | target I/O
M8-02 | same-major future minor | known + nested unknown fields/pointers | O1 original raw/pointer manifest | unknown bytes/pointers exact; known numeric units unchanged | EXACT unknown + numeric source tolerance | known read; unknown reinjected; warning; no loss | P0 | A1+A2 | unknown store
M8-03 | future major | valid-looking unsupported major payload | O1 D7 classification table | version/status/raw checksum exact | EXACT | full quarantine; no operational/save-as-current/apply | P0 | A1+A2 | quarantine
M8-04 | invalid/missing version/JSON/schema | corrupt and structurally invalid payloads | O1 error matrix | raw bytes/checksum and diagnostic code/path exact | EXACT | preserved, quarantined, rejected; no deletion | P0 | A1+A2 | ingestion
M8-05 | unknown/new-known collision | unknown pointer later claimed by target schema | O1 collision manifest | both raw values/status exact | EXACT | no silent winner; save/apply blocked pending adapter | P0 | A1 | collision resolver
M8-06 | stepwise/idempotent | supported older target and LINER v0.1/v0.2 inputs | O1 expected targets/migration ledger | target fields/IDs/revisions/checksums/units | EXACT structure + numeric row tolerance | migrate twice same target; source unchanged; steps recorded | P0 | A0 partial+A2 | migration framework
M8-07 | atomic legacy split | mixed ProjectModel/BridgeProject/BridgeDefinition with injected step failures | O1 road/frame split manifest | document refs/ownership/checksums exact | EXACT | all docs+record+manifest commit or none | P0 | A2 | split adapters
M8-08 | legacy source immutability | writable source plus target edits/saves | O1 before byte checksum | source raw bytes exact | EXACT | source never overwritten; explicit export separate | P0 | A2 | no dual write
M8-09 | rollback | successful split migration then inverse/manifest rollback | O1 revision ledger | refs/revisions/checksums exact | EXACT | new rollback revision restores membership; evidence retained | P0 | A2 | migration rollback
M8-10 | coordinate/ID gate | ambiguous legacy coordinates and duplicate IDs | O1 state/diagnostic table | status/code/context/IDs exact | EXACT | preview/quarantine allowed; target applyable commit rejected | P0 | A2 | OD6-01/02
M8-11 | result staleness | legacy/result resource bound to old/current model/load/solver hashes | O1 binding manifest | hashes/status exact; numeric results not recomputed | EXACT | current accepted; mismatched marked stale/unusable | P1 | A1+A2 | result persistence
M8-12 | route/deep link | all Stage 7 aliases, encoded IDs, query/hash, unknown | O1 route table | canonical path/query/hash/ID/history exact | EXACT | direct load/popstate/replaceState/no-loop/not-found pass | P1 | A1+A3 | route compatibility

9.3 Drawing / DXF / PDF / CSV / Viewer Test Matrix

ID | Target | Fixture | Oracle | Compare/sign/unit | Tol | Pass | Pri | Auto | Gap
O8-01 | Drawing semantic geometry | plan/profile/cross sheets incl. curves/skew/large coords | O1 source geometry/paper transform | model m/rad; paper mm; entity IDs/layers | ABS geometry + EXACT semantics | primitives, bounds, projection, layers/source values pass | P1 | A0 partial+A1 | Drawing shared/domain adapters
O8-02 | dimensions/annotations/scale/page/clipping | dense labels, long text, multi-page and boundary objects | O1 computed dimensions/bounds + O6 layout rules | dimension m shown with declared precision; scale/page mm | ABS paper + EXACT labels; no pixel oracle | correct values/scale/page; nothing improperly clipped/overlaps semantic boxes | P2 | A0 partial+A1 | GDRAW/DRAFT
O8-03 | Drawing visual golden | representative road and frame formal sheets | O6 approved raster/PDF render on controlled environment | visual orientation/text/symbol conventions; units visible | VISUAL OD8-04 | approved diff and expert checklist; semantic O8-01/02 already pass | P2 | A3+M | OD8-04/GDRAW/DRAFT
O8-04 | DXF parse/entities/layers | LINE/LWPOLYLINE/ARC/CIRCLE/TEXT/DIM representation | O1 DxfDocument/entity manifest + external parser | model coordinates m, arc degrees in DXF, layer/style exact | ABS coordinate + EXACT entity/layer/header | parse contains expected entities/order/refs; finite only | P1 | A0+A1 | DXF platform
O8-05 | DXF roundtrip/units/coordinates | Japanese text, negative/large/non-origin coordinates, all supported entities | O1 source manifest + independent CAD parser O2 | `$INSUNITS` meter; no Y/Z swap; text preserved | ABS coordinate + EXACT header/text | serialize-parse semantic equality; external viewer opens without loss | P1 | A0 partial+A3 | DXF interoperability
O8-06 | PDF semantic | static/dynamic/influence/moving/combination reports | O1 source document/result/report manifest | values/signs/units/labels/page sequence exact | numeric source register + EXACT text/sections | every required section/value/provenance present; no stale result | P2 | A0 partial+A1 | PRINT/PDF gaps
O8-07 | PDF visual/print | multi-page dense tables, Japanese fonts, page breaks | O6 controlled renderer and print checklist | paper size/margins/font/DPI declared | VISUAL OD8-04 | no clipping/overlap/missing glyph; readable scales; approved platforms | P2 | A3+M | PRINT visual
O8-08 | CSV semantic/roundtrip | all result kinds incl. min/max provenance and commas/nonfinite negatives | O1 result object/schema | canonical headers/order/decimal/unit documentation/signs | EXACT strings/schema + numeric source tolerance | parser roundtrip values/IDs; nonfinite rejects; units documented | P2 | A0 partial+A1 | PRINT CSV completeness
O8-09 | Viewer semantic | asymmetric nodes/loads/reactions/local forces/deformation | O1 scene-object manifest and display transform table | model values unchanged; display axes explicit; labels units/sign exact | ABS scene coords + EXACT source immutability | objects/directions/scales/selection map correctly; source unchanged | P1 | A0 partial+A1 | Viewer adapters
O8-10 | Viewer visual/recovery | large/small models, resize, WebGL and forced fallback | O6 screenshot+canvas pixel/nonblank checklist | viewport/DPI/platform declared; no engineering unit mutation | VISUAL + semantic nonblank/count assertions | framed/nonblank/no overlap; fallback recovers; interactions retain identity | P2 | A3+M | Viewer NFR

9.4 Nonfunctional Acceptance Matrix

ID | Target | Fixture | Oracle | Compare/sign/unit | Tol | Pass | Pri | Auto | Gap
N8-01 | save/reload | each target doc/package/record with all optional fields | O1 canonical manifest + raw store | bytes/checksums/IDs/revisions/units exact | EXACT; numeric canonical equivalence | no loss, checksum valid, independent revisions preserved | P0 | A1+A2 | target persistence
N8-02 | result staleness | mutate model/load/solver/schema after persisted result | O1 binding matrix | hashes/status exact; result values immutable | EXACT | stale blocked from authoritative display/export; recompute creates new result | P1 | A1+A2 | result persistence
N8-03 | large road model | declared line/element/station/bridge scales incl. manual-limit candidates | O5 invariants + approved performance baseline | counts/refs exact; time ms, memory MB | correctness EXACT; performance OD8-03 | no reference loss/nonfinite; budgets met when approved | P1 | A2+perf lane | scalability
N8-04 | large frame model | tiered nodes/members/cases through and beyond 1500/2500 candidate | O5 equilibrium/schema + O2 sampled reference | counts/response units; time/memory | numeric row registers; perf OD8-03 | correct/error policy and approved budgets; no silent truncation | P1 | A2+perf lane | solver scalability
N8-05 | recovery/atomic write | crash/power-loss fault points during save/migrate/apply | O1 transaction ledger | file/ref/revision/checksum exact | EXACT | old or new complete state recoverable; never mixed/corrupt accepted | P0 | A2 fault injection | recovery framework
N8-06 | backward compatibility | target/legacy formats and all route aliases | O1 compatibility matrices | field/path/query/hash/checksum exact | EXACT + mapped numeric tolerances | supported read/redirect passes; unsupported quarantines/not-found explicitly | P1 | A2+A3 | compatibility
N8-07 | performance regression | fixed small/medium/large workflow corpus | O4 approved baseline at declared environment | median/p95 time, peak memory, output size | budget OD8-03; statistical run policy | no approved budget regression; correctness suite also passes | P1 | scheduled perf | performance
N8-08 | audit/recovery history | repeated migrate/apply/conflict/rollback sequence | O1 append-only ledger | actor/time/status/revisions/checksums/mappings exact | EXACT | complete causal history, tamper detection, successful replay/audit | P0 | A2 | audit/rollback

9.5 Traceability Matrix

Trace | Decisions/Risk | Feature/Gap | Primary Suites | Acceptance Gate | Required Evidence
TR8-01 | D6-06,D7-06; P0 coordinate | coordinate authority/adapters | R8-01..07,T8-01/02,M8-10 | G0,G2,G3 | asymmetric nonzero-Z O1/O2 and OD6-01 resolution
TR8-02 | D6-07,D7-06; P0 overwrite | stable ID/one-to-many | T8-03/04,M8-05/10,N8-08 | G2,G3 | collision corpus, aliases, reorder, rollback
TR8-03 | D6-04/09/10/11; P0 mutation | transfer diff/conflict/partial/rollback | T8-05..13 | G3 | enumerated ChangeSets, fault injection, unchanged frame-owned hashes
TR8-04 | D7-03/04/05/11; P0 data loss | version/unknown/migration/no dual write | M8-01..10,N8-01/05/06 | G2,G7 | raw bytes, checksums, idempotence, atomic split, quarantine
TR8-05 | D6-01,D7-02; P0 dual truth | independent target docs/revisions | M8-07/09,N8-01/08 | G0,G2,G7 | exact reference/revision ledger and atomic transaction
TR8-06 | D6-02; P1 road gaps | LINER/LDIST/HAUNCH/HOSO/GDRAW/TOOL | R8-01..17,O8-01..05 | G1,G6 | O1/O2 numerical and semantic/visual output evidence
TR8-07 | D6-03; P1 structural core | springs/releases/offset/fixed load | F8-01..09 | G4 | theory/independent solver, residual/equilibrium
TR8-08 | D6-03; P1 INFLOAD | influence/full live/moving load | F8-10..12 | G5 | closed form/convolution plus O2/O3 representative corpus
TR8-09 | D6-03,D7-12; P1 dynamics/results | eigen/R-spectrum/result staleness | F8-13/14,M8-11,N8-02 | G5,G7 | eigen residual/MAC/subspace, modal combination, checksum binding
TR8-10 | D6-03; P1/P2 output | combinations/envelope/PRINT/DRAFT | F8-15..18,O8-06..10 | G4,G6 | hand table/independent values plus semantic and controlled visual
TR8-11 | D7-09; P1 shared boundary | Drawing/DXF/Viewer split | O8-01..10 | G0,G6 | neutral primitives, domain adapter assertions, no Viewer state in docs
TR8-12 | D7-10; P1 compatibility | legacy/deep routes | M8-12,N8-06 | G7 | direct-load/popstate/query/hash/ID/no-loop E2E
TR8-13 | D8-11; P1 scalability | large models/performance/recovery | N8-03..08 | G7 | declared environment, approved budget, repeated metrics/fault injection

10. Risks

P0-8-01. A single tolerance or magnitude-only comparison can hide sign/unit/axis failures.
Gate: D8-02/03, T8-01/02, separate unit/sign assertions before numeric comparison.

P0-8-02. A migration can validate while losing unknown/raw data or partially splitting documents.
Gate: D8-08, M8-01..10, N8-05; original bytes precede parsing and commit is atomic.

P0-8-03. Road-to-Frame re-import can overwrite frame mechanics/results or corrupt dependency graphs.
Gate: D8-07, T8-06..10/13; preserve-by-default and unchanged hashes.

P1-8-04. Self-generated goldens can encode solver/geometry defects as expected behavior.
Gate: D8-01/10; O4 requires O1/O2/O3 provenance and independent review.

P1-8-05. Existing portal/truss/L-frame and semantic-parity fixtures may be overclaimed as independent
numerical proof. Gate: current-partial labels; missing expected values must be independently filled.

P1-8-06. No actual SPACER result corpus exists despite a reference directory README.
Gate: OD8-02; prohibit parity claim, preserve manual as semantic reference only.

P1-8-07. Solver tolerances may pass ill-conditioned models by widening response bands.
Gate: D8-05; residual/equilibrium/conditioning are separate and near-singular cases have explicit
warning/error expectations.

P1-8-08. Performance budgets invented without environment/baseline are non-repeatable.
Gate: D8-11/OD8-03; missing budget blocks G7 performance claim.

P2-8-09. Parser-correct drawings/reports can remain unreadable; visual snapshots can remain
semantically wrong. Gate: D8-09 and separate semantic/visual rows.

11. Dependencies

Stage 9 depends on the CURRENT-CANDIDATE/CURRENT-PARTIAL/PLANNED distinction to assign test assets
without assuming target coverage. Asset disposition must preserve O1/O2-qualified fixtures and
identify where current goldens need provenance upgrades.

Stage 10 depends on:
- G0-G7 as phase/PR exit gates.
- P0 G0/G2/G3 work preceding Road-to-Frame feature implementation.
- G4/G5 numerical infrastructure and OD8-01 tolerance approval before feature release.
- OD8-02 before a SPACER-parity claim, not before O1/O2-qualified implementation.
- OD8-03/04 before performance/visual production acceptance, not before core development.

Implementation dependency summary:
  benchmark manifest + tolerance registry
    -> contract/migration/transfer test harnesses
    -> road/frame numerical suites
    -> semantic output suites
    -> controlled visual/interoperability/performance release lanes

12. Verification

Stage 8 report validation requires:
- every required matrix present and using the common row fields;
- every requested road, transfer, frame, migration, output, and nonfunctional topic mapped;
- every P0/P1 Stage 6/7 risk connected to suites and a gate;
- no unspecified numeric tolerance represented as decided;
- no SPACER/reference/example asset overclaimed;
- no Stage 6/7 ownership/contract decision reopened.

Existing test/example reuse classification:

Asset | Evidence | Reuse Classification | Limitation
LINER core golden/unit tests | analytical/Simpson/formula and current tolerances | REUSE candidate for R8-01..08 | qualify clothoid and target tolerance provenance
GC-01/GC-06 examples | checked-in source/expected intermediates | REUSE fixture/O4 candidate for Importer | mapping review is not full PDF/source oracle
BridgeDefinition semantic parity | real-route comparison and deterministic reports | REUSE property/regression | routes may share logic; not independent numerical truth
Beam verification examples/tests | closed-form formulas and expected metadata | KEEP/REUSE O1 | confirm shear/model assumptions and tolerance register
Portal/truss/L-frame examples | equilibrium tests; missing expected values | REUSE fixture/O5 only | cannot be O4 until O2/O3 expected values exist
Eigen/response/influence tests | formulas/properties/schema | REUSE current-partial | add independent multi-DOF/repeated-mode/live-load corpus
Moving-load tests | single-point convolution/linearity | REUSE MVP | not full INFLOAD
Drawing/DXF tests | semantic entities, bounds, parser roundtrip | REUSE current-partial | add external CAD and controlled visual gate
PDF/CSV tests | sections/headers/order/fixture values | REUSE current-partial | output cannot validate solver; missing result kinds
Viewer tests | transform/scene/fallback behavior | REUSE semantic/UI | Viewer is not formal DRAFT and state is not domain truth
LINER/importer migration tests | selected version roundtrip/idempotence | REUSE legacy fixtures | current unknown rejection is not D7 preservation
SPACER reference README | format proposal only | KEEP as acquisition guide | zero result files; no current O3 corpus
LINER/SPACER manuals | sections/pages define target operations | KEEP as semantic reference | not numeric oracle; no bulk copying

## Stage Verdict

The verification strategy, numerical/oracle/tolerance governance, acceptance gates, road/frame/
transfer/migration/output/nonfunctional matrices, reuse limitations, and traceability are fixed.
Open tolerance/corpus/performance/visual details have fail-closed release gates and owners and do not
prevent Stage 9 asset-disposition planning.

STAGE8_VERDICT: COMPLETE
READY_FOR_STAGE9: YES
