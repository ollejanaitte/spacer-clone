# F2-A Test Plan

## Unit Tests (GuidedDetailDrawer)

| Test | Description |
|------|-------------|
| T-01 | Opens when target is set |
| T-02 | Closes on Escape key |
| T-03 | Closes on close button click |
| T-04 | Closes on backdrop click |
| T-05 | Focus trap: Tab cycles within drawer |
| T-06 | Focus trap: Shift+Tab cycles in reverse |
| T-07 | Focus returned to trigger on close |
| T-08 | Body scroll locked when open |
| T-09 | Body scroll restored when closed |
| T-10 | Portal container cleaned up after close |
| T-11 | Empty state or hidden when no target |
| T-12 | No visible overlay/portal after close |
| T-13 | Title includes Guided slide info + panel label |

## Component Tests (GuidedModeShell + ApolloPhase1Shell)

| Test | Description |
|------|-------------|
| T-14 | Clicking detail escape sets drawer target |
| T-15 | Drawer renders correct panel component for target |
| T-16 | Drawer open → guided slide unchanged |
| T-17 | Drawer close → guided slide unchanged |
| T-18 | Editing in drawer → project state updates |
| T-19 | Drawer open/close does not change history |
| T-20 | Undo after drawer edit works |
| T-21 | Saving while drawer open works |
| T-22 | Reload while drawer open shows guard dialog |
| T-23 | Inline panel unmounted while drawer open (no double-mount) |

## E2E Tests

| Test | Description |
|------|-------------|
| E-01 | G01→橋梁入力パネル drawer opens |
| E-03 | G03→舗装・区画線 drawer opens |
| E-07 | G07→ハンチ drawer opens |
| E-08 | G08→橋面付属物 drawer opens |
| E-11 | G11→荷重確認 drawer opens |
| E-13 | G13→数量 drawer opens |
| E-14 | G14→解析 drawer opens |
| E-15 | G15→出力 drawer opens |
| E-16 | Edit field in drawer, verify 3D updates |
| E-17 | Save while drawer open |
| E-18 | Close drawer, verify same G slide |
| E-19 | Next without save |
| E-20 | Escape closes drawer |
| E-21 | Fullscreen: drawer renders correctly |
| E-22 | Mobile: drawer is full-width sheet |
| E-23 | No white overlay after drawer close |
| E-24 | No duplicate panel IDs in DOM