# Analysis reference cases (Step 4-C5)

| Case | Description | Expected |
|------|-------------|----------|
| PARTIAL-UDL-CENTER | L=40, w=2 on [10,30] | R=20/20, total=40 |
| OUT-OF-SPAN | end>L | fail-closed null (no silent expand) |
| HOOKUP-READY | curb+haunch with γ | residual < 1e-6 |
| HOOKUP-BLOCKED | missing γ | status BLOCKED |
| GOLD-AN-001/002 | existing FE probe | unchanged regression |
