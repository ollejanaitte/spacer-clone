# Guided Progress and Footer Design — UI-2

## Guided Progress Bar

### Structure

Two-level progress display:

1. **High-level phase bar** (6 major phases)
   - Phase labels (short): 計画 / 入力 / 解析 / 照査 / 出力 / 完了
   - Each phase shows completion ratio (e.g., "2/3")
   - Current phase highlighted
   - Clickable to jump to phase start

2. **Detailed step strip** (G01–G15, filtered to current phase)
   - Shows only steps belonging to the current high-level phase
   - Each step shows: number + short label + status icon
   - Status icons: ✓ (complete), ◉ (current), ○ (pending), ⚠ (error), ⊘ (blocked)
   - All 15 steps accessible via arrow navigation or "全工程を表示" expand

### G01–G15 Step Display

Not 15 equal buttons. The detailed strip:
- Default: shows 3–5 steps (current phase)
- "全工程を表示" button expands to all 15 steps in compact list
- Each step aspect ratio is content-sized, not 1:1 button grid

### Visual States

| State | Icon | Shape | Color | Text |
|-------|------|-------|-------|------|
| Complete | ✓ | Filled circle | Green | Step label + "完了" |
| Current | ◉ | Pulsing ring | Blue | Step label + "実行中" |
| Pending | ○ | Hollow circle | Gray | Step label |
| Error | ⚠ | Triangle | Red | Step label + error count |
| Blocked | ⊘ | Circle with dash | Amber | Step label + "保留" |

Color alone is never the only differentiator.

## Sticky Footer

### Structure

```
[ ← 戻る ]  [ 💾 保存して次へ ]
```

- position: sticky, bottom: 0
- Full viewport width
- Background: white or light gray (not overlapping content)
- Shows on Guided and Workflow screens
- Mobile: same elements, full-width buttons stacked vertically on narrow viewport

### Behavior

| Action | Behavior |
|--------|----------|
| Back | Navigate to previous Gxx step or previous workflow phase |
| Save and Next | Save current state, navigate to next step |
| Final step (G15 / WF-15) | "保存して次へ" changes to "保存して完了" |
| Validation error | Error message appears inline above sticky footer; "保存して次へ" disabled or shows warning |

### Validation Error Display

- Error banner: yellow/amber background, icon, message text
- Appears above the sticky footer (between content and footer)
- Does not push footer off-screen (sticky keeps footer at bottom)
- Dismissable after fix

### Implementation

- New: `frontend/src/apollo/guided/GuidedProgressBar.tsx`
- New: `frontend/src/apollo/guided/GuidedProgressPhase.tsx`
- New: `frontend/src/apollo/guided/GuidedStepBadge.tsx`
- New: `frontend/src/apollo/components/StickyFooter.tsx`
- New: `frontend/src/apollo/components/ValidationErrorBanner.tsx`
- Update: `frontend/src/apollo/GuidedModeShell.tsx` — integrate progress bar + sticky footer
- Update: `frontend/src/styles.css` — guided-progress-*, sticky-footer rules
- Guided internal data paths: UNCHANGED