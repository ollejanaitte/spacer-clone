# 14 — Haunch / Appurtenance Sample Integration

## Gap (Step 5-1)
Sample left presence NOT_PROVIDED → no solids after generate.

## Spec
Complete sample sets:
- Haunch: PROVIDED RECT per girder (catalog CAT-S5-HAUNCH-*)
- Appurtenances: CURB_LEFT/RIGHT + WALL_RAILING_LEFT/RIGHT PROVIDED; MEDIAN/OPTIONAL_BARRIER EXPLICIT_NONE
- Unit weights USER_PROVIDED_UNVERIFIED

## Path
Unchanged C1/C2 kernel — only sample + validation completeness change. Avoid double generation (RISK-S5-009).
