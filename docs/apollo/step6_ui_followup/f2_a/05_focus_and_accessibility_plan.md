# F2-A Focus and Accessibility Plan

## Dialog Semantics
- `role="dialog"`, `aria-modal="true"`
- `aria-labelledby` → drawer title (step + edit target)
- `aria-describedby` → optional description

## Focus Management
- On open: focus the first focusable element in the drawer (or the target panel's first input)
- On close: return focus to the "詳細編集を開く" button that opened the drawer
- Focus trap: Tab/Shift+Tab cycles within the drawer (reuse pattern from SampleReapplyConfirmDialog)

## Keyboard
- Escape: close drawer (no data reset)
- Tab: cyclic trap
- Backdrop click: close drawer (spec: close on backdrop click, matching existing modal policy)

## Body Scroll Lock
- Lock body scroll while drawer open (reuse GuardDialogPortal's scroll lock pattern)
- Restore on close

## Reduced Motion
- Drawer slide animation disabled or shortened when `prefers-reduced-motion: reduce`

## Focus Return
- Record the trigger element (`document.activeElement`) before opening
- On close, restore focus to it

## Validation Focus
- If validation errors exist in the drawer, "該当問題へ移動" focuses the relevant input (reuse existing validation navigation where the panel supports it)