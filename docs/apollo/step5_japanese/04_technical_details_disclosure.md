# 04 — Technical details disclosure (JP1-C)

## Pattern

Use a single disclosure control per panel/section:

- Trigger L1:「技術情報を表示」 / 「技術情報を隠す」
- Default: **collapsed**
- Contents: English enum, diagnosticCode, field path, checksum, revision, DEC/ER ids

## Example

```
L1: 先に必要な工程が完了していません。
L2: 橋梁基本条件を入力してから、この工程へ進んでください。
L3 (collapsed):
  status=BLOCKED
  diagnosticCode=WF_PREREQUISITE_INCOMPLETE
```

## Rules

1. Do not lead the screen with L3
2. Do not remove diagnostic codes
3. Guided Mode「開発者診断」existing fold pattern is the reference
4. Mobile: disclosure must be keyboard/touch reachable; no hover-only
5. Screenshots/E2E: exclude collapsed L3 from user-visible English scan unless expanded
