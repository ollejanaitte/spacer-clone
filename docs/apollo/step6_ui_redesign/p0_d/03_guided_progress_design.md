# 03 — Guided Progress Design

**BASE_MAIN_SHA:** `7023cb61e7e2f7189e45b46dcb7edb0395320767`  
**UR:** UR-05, UR-06

## Goal

Replace the competing **6-step stepbar + G01–G15 button strip** with one visual progress navigator, without changing G meanings or adjacency (`slides.ts` / `chrome.ts` SoR).

## Proposed model

| Layer | Role |
|-------|------|
| Chapter context | Optional label derived from shell routing (開始 / ガイド入力 / 一覧確認 / 入力チェック) — not a second SoR |
| G track | Primary: 15 positions with current, visited/available styling; jump buttons keep `apollo-guided-jump-G##` |
| Status text | `chrome.progressLabel` + `Gxx (n/15)` |

## Visual behavior

1. Current G emphasized (`aria-current="step"` retained).
2. Non-current G remain keyboard reachable.
3. Compact on mobile (scrollable track or condensed dots **with** text alternative for current theme).
4. Must not be color-only: include ID or theme for current.

## Sticky footer

| Control | testid (preserve) | Behavior |
|---------|-------------------|----------|
| 戻る | `apollo-guided-back` | `adjacentGuidedSlide(..., "back")` |
| 保存して次へ | `apollo-guided-save-next` | `onSave` then next |
| 保存 | `apollo-guided-save` | when cannot go next |
| Current id | `apollo-guided-current-id` | keep |

CSS: `position: sticky; bottom: 0` (or fixed within shell) + content padding.

## Out of scope for this design

- Changing `GUIDED_SLIDE_DEFINITIONS` order/themes/wfAnchor
- Auto-completing G15 package (remains pending message)
- Replacing Workflow progress (expert surface)

## Verdict target

`GUIDED_PROGRESS_DESIGN_VERDICT: PASS` when UI-2 implements navigator + sticky footer with tests green.
