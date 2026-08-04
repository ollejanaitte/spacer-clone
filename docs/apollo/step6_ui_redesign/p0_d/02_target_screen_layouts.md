# 02 — Target Screen Layouts

**BASE_MAIN_SHA:** `7023cb61e7e2f7189e45b46dcb7edb0395320767`

## Desktop (≥1200px)

### Guided

```
+------------------------------------------------------------------+
| Header: Mode | File+Dirty | Help | Return | Auth(compact)        |
+------------------------------------------------------------------+
| ProgressNavigator: [章] G01 · G02 · … · G15 (current emphasized)  |
+------------------------------+-----------------------------------+
| InspectorPane                | ViewerPane (primary, min ~420px)  |
| - slide title / decideWhat   | - Viewer3D                        |
| - primary fields / panel     | - topology summary                |
| - detail escape              | - STL controls (existing)         |
+------------------------------+-----------------------------------+
| StickyActionBar: 戻る | 保存して次へ | (保存) | Gxx (n/15)        |
+------------------------------------------------------------------+
```

### Workflow

```
+------------------------------------------------------------------+
| Header (same)                                                    |
+------------------------------------------------------------------+
| ProgressSummary counts + recommended                             |
+----------------------+-------------------------------------------+
| Navigator (15 rows)  | Detail: status, criterion, CTA, diags     |
+----------------------+-------------------------------------------+
```

### List

```
Header + Unit2 editors in inspector | Viewer (if nodes)
```

## Tablet (800–1199px)

- Header wraps; mode group stays first.
- Guided: Progress → Inspector → Viewer (stacked); sticky footer.
- Workflow: Navigator above Detail (stacked).

## Mobile (≤799px)

- Header actions wrap / menu density as needed without losing Open/Save/Return.
- Guided: `ApolloMobileWorkspaceTabs` —「入力」|「3D」; sticky footer always.
- Workflow: Navigator list; tapping opens Detail full width with back-to-list.

## Explicit non-layouts

- Do not show WF-01..15 full cards under Guided.
- Do not place detached promo badges on Viewer.
- Do not lead with expanded L3 technical blocks.
