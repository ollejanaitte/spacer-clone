# JP3-C mobile / a11y report

## Mobile (390×844)

- Save / primary chrome reachable via scroll
- Header actions wrap (`styles.css` `@media max-width:800px`)
- Buttons allow normal wrapping (`white-space: normal`)
- Verdict: PASS

## Accessibility smoke

- Technical details toggles default `aria-expanded=false`
- Undo receives keyboard focus
- Status not color-only (workflow badges keep symbol + Japanese label)
- Authorization banners expose 正式認可なし / 設計・施工への使用禁止 in text
- Verdict: PASS

## Console

See `console-report.txt` (hydration nested-p fixed in reapply summary).
