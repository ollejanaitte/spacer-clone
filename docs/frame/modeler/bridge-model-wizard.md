# bridge-model-wizard.md

<!-- DOC-AUTHORITY:START -->
> **Authority:** LEGACY MIXED MODELER REFERENCE
> This BridgeProject/wizard/generator design mixes Road and Frame concerns and is retained as current compatibility evidence. It is not the target `BridgeFrameAnalysisDocument`, transfer package, or direct apply authority; target ownership and edit protection are governed by [`../../planning/stage6-10/responsibility_matrix.md`](../../planning/stage6-10/responsibility_matrix.md) and [`../../planning/stage6-10/road_to_frame_contract.md`](../../planning/stage6-10/road_to_frame_contract.md).
<!-- DOC-AUTHORITY:END -->

## 1. Feature Purpose

Allow even beginner users, who are not yet ready for the SPACER-style table input, to automatically generate a 3D frame FEM model through a wizard from the bridge''s semantic information: road conditions, spans, impact factor, traffic lines, and loads.

Compared to the conventional SPACER:

- SPACER: a "table input" style where the user enters numbers directly into the node and member tables.
- This feature: the user enters the bridge conceptually, and the system converts the input into nodes, members, supports, and loads internally.

Design principles:

- The **UI** takes semantic input.
- The **FEM model generation** performs numerical conversion.
- The **analysis engine** reuses the existing implementation.

## 2. Six Step Structure

| Step | Name | Main input | Purpose |
| --- | --- | --- | --- |
| 1 | Road conditions | Lane count, lane width, median, sidewalk, barrier | Decide the bridge transverse composition and the main girder candidate y coordinates |
| 2 | Span setting | Number of spans, length of each span, offset | Decide the bridge axis x coordinates |
| 3 | Impact factor | Auto / manual, value | Decide the load amplification factor |
| 4 | Line setting 3D | Click two points to add a line | Record load / traffic / reference lines |
| 5 | Load setting | Load type, target line, value, direction | Define loads per load case |
| 6 | FEM model generation | `mesh_division` | Generate the existing `project.json` format |

## 3. Screen Flow

```text
[Start]
   |
   v
[Step1 RoadCondition] -> (Next) ->
[Step2 SpanSetting]   -> (Next) ->
[Step3 ImpactFactor]  -> (Next) ->
[Step4 LineSetting3D] -> (Next) ->
[Step5 LoadSetting]   -> (Next) ->
[Step6 ModelGeneration] -> (Generate) -> [Viewer / Send to Analysis]
```

The user can return to any previous step.

## 4. Input Items per Step

### Step 1 Road Conditions
- `lane_count` (int, 1..6)
- `lane_width` (m, >0)
- `median_width` (m, >=0)
- `sidewalk_width` (m, >=0)
- `barrier_width` (m, >=0)

### Step 2 Span Setting
- `spans[]` (at least 1)
  - `index` (1..N)
  - `length` (m, >0)
  - `offset` (m, >=0)

### Step 3 Impact Factor
- `auto` (bool)
- `value` (number, 0.0..1.0)
- `formula` (optional, for display)

### Step 4 Line Setting
- Mode: view / draw_line / select / delete
- `BridgeLine`:
  - `id`, `type` (traffic/load/reference), `name`
  - `points`: [[x,y,z], [x,y,z]] (MVP: a straight line of two points)

### Step 5 Load Setting
- `BridgeLoad`:
  - `id`, `type` (self_weight/distributed/vehicle), `name`
  - `magnitude`, `direction` (X/Y/Z/-X/-Y/-Z)
  - `line_id` (optional)

### Step 6 FEM Model Generation
- `mesh_division` (int, >=1)
- `mesh_density` (coarse/standard/fine)

## 5. Validation

- Step 1: dimensions must be > 0, total width must not be 0
- Step 2: span length > 0, number of spans >= 1
- Step 3: when auto is on, `value` is computed and only displayed
- Step 4: a line requires two points, no duplicates on the same line
- Step 5: the target `line_id` must exist
- Step 6: `mesh_division >= 1`

## 6. Error Display

- Inline error (red) under each input field.
- Aggregated error messages in the bottom of the sidebar.
- API failures are reported with a toast.

## 7. Beginner-friendly UX Policy

- When the road conditions are entered, an immediate preview (transverse composition) is shown in the sidebar.
- Span add / remove is operated with +/- buttons.
- 3D uses OrbitControls for camera operation; double-click fits the view.
- The "Next" button is enabled only when the current step passes validation.
- Technical terms are supported with helper text.

## 8. Integration with the Existing App

- Add a "Create Bridge Model" button to the main toolbar.
- Opening it shows the BridgeWizard in a separate (full-screen) modal.
- The generated `project.json` is fed into the normal project state, and the existing analysis runs unchanged.
- The existing `project` / `nodes` / `members` / ... sections are not destroyed.
