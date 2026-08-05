# Windows Retest Checklist

The fix is verified at unit/component level. Human retest on Windows is required
to confirm the fix works in the real environment, especially with Microsoft IME.

## Prerequisites

- Target main SHA: `2bbd3163b54da4f6fcfb9b71abcce99672655bcb` (or later)
- Windows build: ________
- Electron version: ________
- Node.js version: ________

## Steps

1. Start Apollo (browser dev: `npm run dev`; Electron: follow repo's electron command).
2. Open Guided Detail Drawer.
3. Focus the field `apollo-bridge-input-spanLength`.
4. Type `123.45`.
5. Press Enter.
6. Confirm the field still has focus (activeElement).
7. Continue typing `6` → value should become `123.456` (or similar edit).
8. Verify value retained.
9. Verify dirty state updated.
10. Press Escape / close button → confirm focus returns to the trigger button.
11. Repeat open/close 3 times.
12. Optionally, test with Microsoft IME (full-width/kanji) on a text field.

## Expected

- After Enter commit, focus stays on the input field.
- Continued typing works.
- After actual close, focus returns to the trigger.
- No console errors.

## Evidence

- Screenshot / video: ________
- activeElement before Enter: ________
- activeElement after Enter: ________
- value before Enter: ________
- value after Enter: ________
- PASS / FAIL: ________

## Status

WINDOWS_POST_FIX_VERDICT: PENDING_HUMAN_WINDOWS_RETEST