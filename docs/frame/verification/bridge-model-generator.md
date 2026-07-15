# bridge-model-generator.md (verification material)

<!-- DOC-AUTHORITY:START -->
> **Authority:** CURRENT VERIFICATION REFERENCE
> This retains a current procedure, constraint, or benchmark design. Existing checks do not prove absent or partial Frame capabilities; target acceptance and oracle rules are governed by [`../../planning/stage6-10/stage8_verification_plan.md`](../../planning/stage6-10/stage8_verification_plan.md).
<!-- DOC-AUTHORITY:END -->

Minimum verification models and expected values for the generation logic from a Bridge Project to a FEM Model.

## 1. Test Model List

| Name | Outline | Expected Behavior |
| --- | --- | --- |
| `bridge-simple-2lane` | Single span, 2 lanes, 30 m span, mesh 10 | 33 nodes, 30 bridge-axis members, 32 transverse members, 62 total members, 4 supports (2 on each end) |
| `bridge-2span-3girder` | 2 spans, equivalent of 3 main girders, 30 m + 40 m | xCount=21, yCount=5 (both ends + 3 main girders), 105 nodes, 124 members, 6 supports |
| `bridge-load-line` | Single span 30 m, 2 lanes, 1 line, 12 kN/m distributed load | As above plus 1 member load |

## 2. Formulas for Expected Values

```text
xCount = sum(span.length / unit) + 1
       = total_spans * mesh_division + 1
yCount = y_positions.length (>= 5)
nodeCount = xCount * yCount
memberCount (x direction) = (xCount-1) * yCount
memberCount (y direction) = xCount * (yCount-1)
total members = x direction + y direction
supportCount (both end y only) = 2 * (1 + number of spans)
```

### 2.1 Single Span 30 m, mesh=10, 3 main girders in cross-section (yCount=5)

```text
xCount = 11
yCount = 5
nodeCount = 55
member x = 10 * 5 = 50
member y = 11 * 4 = 44
total    = 94
support = 4 (both ends y=0, y=4)
```

## 3. Verification Items

### 3.1 Automated Tests

- `backend/tests/test_bridge_fem_generator.py`:
  - Single span model -> expected node count / member count
  - 2-span model -> expected node count / member count
  - Model with a load line -> memberLoads are generated
  - `span.length = 0` -> `BridgeFemGenerationError`
  - `mesh_division = 0` -> `BridgeFemGenerationError`
  - No duplicate nodes
  - No isolated nodes
  - Element length is not 0
  - Supports are always generated

- `backend/tests/test_bridge_api.py`:
  - `POST /bridge` normal case
  - `GET /bridge/{id}`
  - `PUT /bridge/{id}`
  - `DELETE /bridge/{id}`
  - Non-existent ID -> 404
  - Invalid schema -> 400
  - `POST /fem/generate` normal and failure cases

- `backend/tests/test_bridge_validation.py`:
  - Validation at the JSON Schema level

### 3.2 Hand Calculation

The simplest example:

```text
span 10 m, mesh_division = 2, yCount = 3
xCount = 3, yCount = 3
nodeCount = 9
member x = 2 * 3 = 6
member y = 3 * 2 = 6
total = 12
support = 4
```

## 4. Known MVP Limitations

- The full live load specification of the Road Bridge Specification is not implemented.
- Impact factor uses the MVP simplified formula: `i = min(0.3, 20 / (50 + L_max))`.
- The transverse y positions follow a fixed logic; the user-defined number of main girders is computed from the lanes in Step 1.
- There is no UI for a strict bearing condition (the minimum configuration is pin at both ends and roller at intermediate supports).
- Curved bridges are not supported (only straight).
- Automatic integration with dynamic and response spectrum analyses is not implemented.

## 5. Candidates for the Next Phase

- UI to add main girders at arbitrary y coordinates.
- Full support of the Road Bridge Specification `i` formula (not only L, but also the type and live load category).
- Generation of live load patterns (vehicle, crowd, truck).
- Automatic integration with the influence line analysis.
- Detailed UI for piers, foundations, and bearings.
- Full support of distributed and moving loads on arbitrary lines.
