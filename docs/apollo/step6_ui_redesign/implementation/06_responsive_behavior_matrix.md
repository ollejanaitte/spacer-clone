# Responsive Behavior Matrix

## Breakpoints

| Category | Width | Layout |
|----------|-------|--------|
| Desktop | ≥1024px | Full 2-pane (input + viewer), multi-column header |
| Tablet | 600–1023px | Single column stack (input top, viewer bottom), header wraps |
| Mobile | <600px | Tabbed (input / 3D tabs), stacked footer buttons |

## Per-Component Behavior

| Component | Desktop | Tablet | Mobile |
|-----------|---------|--------|--------|
| Header | 4 groups horizontal, full width | 2 rows (mode+file / nav+help+auth) | 2 rows, compact mode/file group |
| Mode toggle | Tabs or buttons | Same | Same (never hidden) |
| File ops + save badge | Inline | Inline | Badge compact label only |
| Auth badge | Compact with expand | Compact with expand | Compact with expand (icon only) |
| Save/Open | Full labels | Full labels | Short labels or icons |
| Back to Menu | Text label | Text label | Icon only (aria-label) |
| Help | Icon + "操作ガイド" | Icon + "操作ガイド" | Icon only (aria-label) |
| Guided progress bar | 6-phase bar + step strip | 6-phase bar (short labels) | Phase numbers only, step strip expandable |
| Sticky footer | Side-by-side buttons | Side-by-side buttons | Full-width stacked buttons |
| Input pane | 30–40% width, left | Full width, top | Tab "入力" |
| 3D Viewer | 60–70% width, right | Full width, bottom | Tab "3D確認" |
| Viewer chrome | Node count + view controls | Node count (compact) | Node count (compact) |
| Workflow master | Side panel (200-250px) + detail | Top list (compact) + bottom detail | Full-screen list → detail drill-down |
| Workflow detail | Full remaining space | Full remaining space | Full screen (back button to list) |

## Prohibited

- Horizontal scroll on any viewport (test at 320px, 375px, 768px, 1024px, 1440px)
- Content hidden without accessible alternative
- touch targets < 44px on mobile
- Color-only status indicators on any viewport