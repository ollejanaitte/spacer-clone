# Linear Time History Analysis UI Design (TH-5d)

## 1. Purpose

This document describes the UI design for the Linear Time History
Analysis feature. The frozen API contract lives in
[time-history-api-contract.md](time-history-api-contract.md); the
persisted result block lives in [result-schema.md](result-schema.md).
This document is the bridge between those two and the future React
implementation.

This document is a design document. It does not perform any
implementation, does not create any components, does not wire any
API calls, and does not change any source file outside this design
note. The only deliverable of TH-5d is this document.

## 2. Design Goals

- The UI is composed of three top-level surfaces: an Analysis
  Settings Panel, a Ground Motion Manager, and a Result Viewer.
- A fourth surface (Envelope Viewer) and the export / viewer
  integration items are documented for the future but are out of
  scope for the first implementation pass.
- The Settings Panel collects the inputs that the
  `/api/analysis/time-history` endpoint expects. It never reaches
  into the project model directly; it always edits the
  `analysisSettings.timeHistory` block plus the `groundMotions`
  list.
- The Result Viewer consumes the frozen response envelope. It only
  reads `result.timeHistoryResult.meta`, `result.timeHistoryResult.time`,
  `result.timeHistoryResult.displacements`,
  `result.timeHistoryResult.velocities`, and
  `result.timeHistoryResult.accelerations`. The `analysisSummary`
  block drives the status banner.
- All UI text is Japanese. The keys are organized in
  `frontend/src/i18n/ja.ts` under a new `timeHistory` group, mirroring
  the existing `responseSpectrum` / `eigen` / `comparison` groups.

## 3. Top-Level Layout

The Time History UI lives inside the existing `ResultsPanel` /
`PropertyPanel` shell. A new tab `時刻歴` is added next to the
existing `静的` / `固有値` / `応答` tabs.

```text
+--------------------------------------------------------------+
|  App Toolbar  [新規] [開く] [保存] [解析: 静的|固有|応答|...]  |
+--------------------------------------------------------------+
| Project Tree  |  Property Panel / Results Panel            |
|               |                                            |
|               |  [静的] [固有値] [応答] [時刻歴]            |
|               |  +----------------------------------------+|
|               |  |  Time History Tab (active)            ||
|               |  |  ┌────────────┬────────────────────┐ ||
|               |  |  │ Settings   │   Result Viewer    │ ||
|               |  |  │  Panel     │                    │ ||
|               |  |  │ (left)     │   (right)          │ ||
|               |  |  └────────────┴────────────────────┘ ||
|               |  +----------------------------------------+|
+---------------+--------------------------------------------+
| Status bar: [未保存] [状態: 成功 / 失敗 / 実行中]            |
+--------------------------------------------------------------+
```

The left half of the Time History tab is the **Analysis Settings
Panel**; the right half is the **Result Viewer**. The **Ground
Motion Manager** is a modal dialog launched from the Settings Panel
and from the project tree (the project tree already lists
`groundMotions` as a child node, so the manager is reachable from
both places).

## 4. Analysis Settings Panel

The Settings Panel is rendered when the user activates the
`時刻歴` tab in the existing `ResultsPanel`. It writes to
`project.analysisSettings.timeHistory` and to
`project.groundMotions` (one entry at most in the MVP).

### 4.1 Fields

| Field            | Source                          | Notes                                                |
| ---------------- | ------------------------------- | ---------------------------------------------------- |
| Mass Case        | `massCases[].id` (select)       | Required. Default: first mass case.                  |
| Ground Motion    | `groundMotions[].id` (select)   | Required. Default: first record.                     |
| Direction        | `groundMotions[0].direction`    | Required. Selectable from X / Y / Z.                 |
| Time Step        | `timeStep` (number, s)          | Required. > 0.                                       |
| Duration         | `duration` (number, s)          | Required. > 0.                                       |
| Rayleigh Alpha   | `damping.alpha` (number)        | Optional. Default 0.0. Non-negative.                 |
| Rayleigh Beta    | `damping.beta` (number)         | Optional. Default 0.0. Non-negative.                 |

### 4.2 Wireframe

```text
+----------------------------------------------------+
|  時刻歴応答解析設定                                  |
+----------------------------------------------------+
|  質量ケース       [ m-1  ▼]                          |
|  地震波           [ gm-001  ▼]  [管理...]           |
|  方向             ( ) X  ( ) Y  ( ) Z                |
|                                                    |
|  時間刻み dt     [ 0.05     ] s                     |
|  解析時間長       [ 0.5      ] s                     |
|  Newmark β        [ 0.25     ] (固定)                |
|  Newmark γ        [ 0.5      ] (固定)                |
|                                                    |
|  Rayleigh 減衰                                    |
|    α            [ 0.0       ]                       |
|    β            [ 0.0       ]                       |
|                                                    |
|  [ 解析実行 ]    [ 結果をクリア ]                    |
+----------------------------------------------------+
|  状態: 成功 / 失敗 (analysisSummary.status)        |
|  message: ... (analysisSummary.message if any)     |
+----------------------------------------------------+
```

### 4.3 Component Candidates

These are component names to introduce. None of them are created in
TH-5d. They are listed for traceability and naming consistency.

- `TimeHistorySettingsPanel` (the panel above)
- `TimeHistoryGroundMotionPicker` (the `[管理...]` trigger)
- `TimeHistoryRunButton` (the `[解析実行]` button)
- `TimeHistoryStatusBanner` (the status row)

### 4.4 API Consumption

The panel itself does not call the API. The existing `runAnalysis`
mechanism (currently used for static / eigen / response spectrum) is
extended with a `case: "timeHistory"` discriminator that POSTs to
`/api/analysis/time-history` with the current project payload. The
handler returns the frozen envelope; the panel updates the
`analysisSummary` row in place.

## 5. Ground Motion Manager

The Ground Motion Manager is a modal dialog that lists, edits, and
creates `groundMotions` entries on the project. The MVP supports
exactly one record per project; the table is read-only for the
second row onward (the table can list multiple records for forward
compatibility, but the analysis run requires `len == 1`).

### 5.1 List Columns

| Column       | Source                       |
| ------------ | ---------------------------- |
| ID           | `id`                         |
| Name         | `name`                       |
| Direction    | `direction` (X / Y / Z)      |
| Unit         | `unit` (m/s² / gal)          |
| dt           | `timeStep` (s)               |
| Sample Count | `samples.length`             |

### 5.2 Wireframe

```text
+--------------------------------------------------+
|  地震波管理                              [閉じる] |
+--------------------------------------------------+
|  ID      | 名称     | 方向 | 単位  | dt    | N  |
|  gm-001  | Sin      |  X   | m/s²  | 0.05  | 11 |
|  gm-002  | Kobe    |  Y   | gal   | 0.01  | 30 |
|                                                  |
|  [ + 新規 ]   [ CSV取込 ] (将来)  [ PEER取込 ] (将来) |
+--------------------------------------------------+
```

### 5.3 Component Candidates

- `GroundMotionManagerDialog` (the modal)
- `GroundMotionTable` (the rows)
- `GroundMotionEditor` (the per-row edit form, opened on row click)

### 5.4 Future Features (Out of Scope for TH-5d)

- CSV Import: parse a 2-column CSV (time, value) into a
  `groundMotions[].samples` array. The MVP does not include this.
- PEER Import: parse PEER NGA records. The MVP does not include
  this.

## 6. Result Viewer

The Result Viewer reads `result.timeHistoryResult` and renders the
per-node histories. The MVP covers **Response History** only.

### 6.1 Wireframe

```text
+------------------------------------------------------------+
|  時刻歴応答  | 状態: 成功   |  解析ID: th-mvp             |
+------------------------------------------------------------+
|  対象ノード  [ N2  ▼ ]   自由度  [ ux ▼ ]                |
|                                                            |
|  系列  ( ) 変位  ( ) 速度  ( ) 加速度    (重ね描き可)       |
|                                                            |
|  +------------------------------------------------------+  |
|  |                                                      |  |
|  |             time vs response (chart area)            |  |
|  |                                                      |  |
|  +------------------------------------------------------+  |
|                                                            |
|  サンプル数: 11   dt: 0.05 s   解析時間: 0.5 s            |
+------------------------------------------------------------+
```

### 6.2 Selection

- **Node**: combo box listing every node id that appears in
  `timeHistoryResult.displacements` (or `.velocities` /
  `.accelerations`). When the project changes, the list rebuilds.
- **DOF**: combo box listing the available DOFs. For the MVP the
  Newmark output is stored per active translational component, so
  the list is effectively `ux` / `uy` / `uz` for the selected node
  (a `<nodeId>.<dofName>` form may appear when the mapper stores
  multiple components on the same node).

### 6.3 Chart

- The chart is a 2D line plot of
  `timeHistoryResult.time[i]` vs the selected
  `displacements[nodeId][i]` (or velocity / acceleration).
- The chart uses the existing project's chart infrastructure
  (TBD at implementation time; the choice between Recharts, d3, or
  a thin custom SVG renderer is left to the implementation pass).
- Multiple series can be overlaid (displacement + velocity +
  acceleration with a second Y axis if needed). The MVP wires
  single-series display; multi-series is allowed but not required.

### 6.4 Component Candidates

- `TimeHistoryResultViewer` (the panel above)
- `TimeHistoryNodeSelector`
- `TimeHistoryDofSelector`
- `TimeHistorySeriesPicker`
- `TimeHistoryChart`

## 7. Envelope Viewer (Future)

The Envelope Viewer summarises the time history into per-node
extremes. The MVP does not implement it; the design reserves the
following shape for the future implementation pass.

| Metric             | Definition                                  |
| ------------------ | ------------------------------------------- |
| Max Displacement   | `max(|displacements[nodeId]|)`              |
| Max Velocity       | `max(|velocities[nodeId]|)`                 |
| Max Acceleration   | `max(|accelerations[nodeId]|)`              |

Wireframe (future):

```text
+--------------------------------------------------+
|  時刻歴エンベロープ                              |
+--------------------------------------------------+
|  ノード  |  最大変位  |  最大速度  |  最大加速度  |
|  N1     |   0.000    |   0.000    |   0.000      |
|  N2     |   1.4e-7   |   5.7e-6   |   2.3e-3     |
+--------------------------------------------------+
```

## 8. Export (Future)

Two export paths are reserved for a future task:

- **CSV**: a multi-section CSV that includes the meta block, the
  time axis, and one column per (node, series) pair. The MVP does
  not implement it.
- **PDF**: a one-page report with the meta block and a thumbnail
  chart. The MVP does not implement it.

## 9. Viewer Integration (Future)

The Result Viewer is integrated with the existing 3D viewer so the
user can:

- highlight the selected node in the 3D scene,
- drive the 3D deformed shape by a time slider (out of scope),
- play the response as an animation (out of scope).

These items are intentionally excluded from TH-5d. They are listed
here so the future implementation can reuse the same component
candidates from Section 6.4.

## 10. i18n Key Candidates (frontend/src/i18n/ja.ts)

A new top-level group `timeHistory` is added to the existing
`ja` dictionary in `frontend/src/i18n/ja.ts`. The keys below are
the candidate set; the implementation pass will add them verbatim
once the UI components are introduced. None of the keys are added
in TH-5d.

```ts
timeHistory: {
  // Toolbar / tab entry
  tab: "時刻歴",
  runTitle: "線形時刻歴応答解析を実行します。",
  runButton: "時刻歴",

  // Settings panel
  settingsHeading: "時刻歴応答解析設定",
  fields: {
    massCase: "質量ケース",
    groundMotion: "地震波",
    manageGroundMotions: "管理...",
    direction: "方向",
    directionX: "X",
    directionY: "Y",
    directionZ: "Z",
    timeStep: "時間刻み dt",
    duration: "解析時間長",
    newmarkBeta: "Newmark β",
    newmarkGamma: "Newmark γ",
    rayleighAlpha: "Rayleigh α",
    rayleighBeta: "Rayleigh β",
    newmarkBetaFixedNote: "固定",
    runButton: "解析実行",
    clearButton: "結果をクリア",
  },
  units: {
    seconds: "s",
    meterPerSecondSquared: "m/s²",
    gal: "gal",
  },

  // Status banner
  status: {
    success: "成功",
    failed: "失敗",
    running: "実行中",
    notRun: "未実行",
  },

  // Ground motion manager
  groundMotionManager: {
    heading: "地震波管理",
    close: "閉じる",
    addNew: "+ 新規",
    importCsv: "CSV取込",
    importPeer: "PEER取込",
    columns: {
      id: "ID",
      name: "名称",
      direction: "方向",
      unit: "単位",
      timeStep: "dt",
      sampleCount: "サンプル数",
    },
    futureFeatureNote: "将来対応",
  },

  // Result viewer
  resultViewer: {
    heading: "時刻歴応答",
    nodeLabel: "対象ノード",
    dofLabel: "自由度",
    seriesLabel: "系列",
    seriesDisplacement: "変位",
    seriesVelocity: "速度",
    seriesAcceleration: "加速度",
    sampleCount: "サンプル数",
    summary: {
      analysisId: "解析ID",
      timeStep: "dt",
      duration: "解析時間",
      sampleCount: "サンプル数",
      method: "手法",
    },
    chartAriaLabel: "時刻歴応答グラフ",
  },
},
```

The `tab`, `runTitle`, and `runButton` keys reuse the same wording
pattern as the existing `responseSpectrum` /
`runResponseTitle` / `runResponseButton` keys in `ja.ts`.

## 11. Component Split (Implementation Reference)

The React implementation is **out of scope** for TH-5d. The
following split is the proposed decomposition so each piece can be
implemented and tested independently in a future task.

| Component                        | Responsibility                                   | File path (proposed)                                                       |
| -------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------- |
| `TimeHistorySettingsPanel`       | Renders the Settings Panel and dispatches edits. | `frontend/src/timeHistory/TimeHistorySettingsPanel.tsx`                    |
| `TimeHistoryGroundMotionPicker`  | Combobox + `[管理...]` trigger.                  | `frontend/src/timeHistory/TimeHistoryGroundMotionPicker.tsx`               |
| `GroundMotionManagerDialog`      | The modal dialog.                                | `frontend/src/timeHistory/groundMotion/GroundMotionManagerDialog.tsx`      |
| `GroundMotionTable`              | The list rows.                                   | `frontend/src/timeHistory/groundMotion/GroundMotionTable.tsx`              |
| `GroundMotionEditor`             | The per-row edit form.                           | `frontend/src/timeHistory/groundMotion/GroundMotionEditor.tsx`             |
| `TimeHistoryResultViewer`        | The right half of the Time History tab.          | `frontend/src/timeHistory/result/TimeHistoryResultViewer.tsx`              |
| `TimeHistoryNodeSelector`        | Node combo box.                                  | `frontend/src/timeHistory/result/TimeHistoryNodeSelector.tsx`              |
| `TimeHistoryDofSelector`         | DOF combo box.                                   | `frontend/src/timeHistory/result/TimeHistoryDofSelector.tsx`               |
| `TimeHistorySeriesPicker`        | Series radio group.                              | `frontend/src/timeHistory/result/TimeHistorySeriesPicker.tsx`              |
| `TimeHistoryChart`               | The 2D line chart.                               | `frontend/src/timeHistory/result/TimeHistoryChart.tsx`                     |
| `TimeHistoryStatusBanner`        | Reads `analysisSummary.status`.                  | `frontend/src/timeHistory/TimeHistoryStatusBanner.tsx`                     |
| `timeHistorySlice` (state)       | Redux / Zustand slice for the run + ground motions. | `frontend/src/timeHistory/state/timeHistorySlice.ts`                   |
| `useTimeHistoryAnalysis` (hook)  | Wraps the POST to `/api/analysis/time-history`.  | `frontend/src/timeHistory/state/useTimeHistoryAnalysis.ts`                 |

The state slice owns the in-flight request, the latest
`TimeHistoryAnalysisEnvelope`, and the list of `groundMotions` that
the dialog edits. The hook is the only place that talks to the
backend; the components are pure renderers.

## 12. Out of Scope

- React implementation
- CSS / theme
- Chart library choice
- API wiring
- CSV / PDF export
- 3D viewer animation
- 3D viewer time slider
- Envelope viewer
- Performance optimisation
- Nonlinear time history analysis

These items are intentionally excluded from TH-5d. They are
documented above only as future work so the design is consistent.

## 13. Related Documents

- [time-history-api-contract.md](time-history-api-contract.md)
- [time-history-schema.md](time-history-schema.md)
- [time-history-analysis.md](time-history-analysis.md)
- [time-history-implementation-plan.md](time-history-implementation-plan.md)
- [result-schema.md](result-schema.md)
- [result-visualization.md](result-visualization.md)