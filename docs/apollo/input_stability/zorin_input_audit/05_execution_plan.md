# AUI-R1: Execution Plan

## Phase 1: Browser (Playwright Chromium)

1. Launch Vite dev server (mode apollo) on :5173
2. Launch backend on :8000
3. Open Playwright Chromium to http://127.0.0.1:5173
4. Navigate Apollo start screen → load sample → "basics" step
5. Verify all inline controls on BridgeStructureInputPanel
6. Verify Drawer: open each detail drawer, operate controls
7. Verify editor panes: nodes, members, supports, materials
8. Verify save/reload round-trip
9. Verify focus/keyboard navigation
10. Verify validation screen
11. Screenshot each screen after operation

## Phase 2: Electron (Playwright _electron)

1. Compile Electron (tsc)
2. Launch backend on :8000
3. Launch Vite dev server on :5173
4. Launch Electron via Playwright _electron
5. Same operation sequence as Phase 1
6. Record console messages and pageerrors

## Phase 3: Focus & Keyboard

- Tab order through all controls
- Shift+Tab reverse order
- Enter commit on numeric inputs
- Escape on drawer
- Ctrl+Z/Y undo/redo
- Keyboard shortcuts in editor

## Phase 4: Save/Reload

- Fill project name, some numeric fields
- Save project
- Reload project
- Verify values restored
- Verify drawer state after reload

## Phase 5: Real IME (if possible)

- Switch to mozc-jp
- Type hiragana → kanji conversion in text inputs
- Composition in numeric inputs
- Candidate selection
- Enter confirm
- Escape cancel

## Success Criteria

- Each reachable control tested with valid and invalid input
- Each test repeated 3 times
- Errors recorded with reproduction steps
- Screenshots for each failure
- Console log for each error