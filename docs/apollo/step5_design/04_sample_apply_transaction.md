# 04 — Sample Apply Transaction

## DEC-S5-0001 (DECIDED_DRAFT)
Apply transaction = **fill complete preset inputs + optionally run generation pipeline in one user action**.

Recommended UX:
1. Select sample → show disclaimer
2. Primary CTA: 「サンプルを適用して構造を生成」(apply + generate)
3. Secondary: 「入力のみ適用」(apply inputs, generatedAt=null) for power users

## DEC-S5-0002 (DECIDED_DRAFT)
Re-apply when draft dirty → **confirm modal** listing overwrite domains; Cancel preserves user edits.

## Transaction steps (apply+generate)
1. Write complete preset into canonical draft (incl. app/haunch/pavement/marking/laterals)
2. Stamp SAMPLE_PRESET metadata + disclaimer ack
3. Run existing generate BSDD → solids → qty → load → analysis hookup path
4. Mark workflow readiness; retain UNVERIFIED labels
5. Emit STALE if any later edit

## Forbidden
Silent overwrite without confirm when dirty; claiming formal design values.
