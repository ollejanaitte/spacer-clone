# AUI-R1: ZorinOS Apollo Input Audit — Scope

## Objective

Inventory all reachable input controls in Apollo on ZorinOS (browser + Electron),
for the purpose of executing actual input operations and recording defects.

## In Scope

- Apollo Phase 1 (non-numeric input mode) on ZorinOS 17.3
- Browser: Chromium via Playwright on localhost:5173 (Vite dev mode apollo)
- Electron: Playwright _electron with desktop/electron/dist/main.js
- All screens reachable via guided mode and list mode
- All input types: text, numeric, select, radio, checkbox, drawer
- Focus, keyboard navigation, IME composition, save/reload round-trip
- Undo/redo where applicable

## Out of Scope

- Windows or macOS environments (NOT_TESTED_IN_THIS_SCOPE)
- Numeric execution / analysis engine
- 3D viewer interaction (read-only display)
- Authorization / licensing
- Backend API validation
- Production build differences
- Mobile/responsive layout
- Accessibility (a11y) beyond focus/keyboard
- CSS styling or visual design

## Deliverables

Docs-only PR (AUI-R1): screen inventory, control inventory, operation matrix, execution plan
Docs-only PR (AUI-R2): execution results, error register, evidence, closeout