# ZorinOS Input Audit Evidence Index

## Browser Evidence (evidence_browser/)

Total: 38 screenshots + 1 console log

- 001_initial.png - Apollo initial start screen
- 002_no_onboarding.png - After dismissing onboarding
- 003_sample_selection.png - Sample bridge selection
- 004_after_sample_load.png - After loading 200m continuous sample
- 005_basics.png - Basics screen with all panels
- 010_project_name.png - Project name filled: "テスト橋梁A"
- 011_description.png - Description filled
- 020_bridge_system.png - Bridge system select to CONTINUOUS
- 030_all_numeric.png - All numeric fields filled
- 040_chk_upper.png - Upper lateral checkbox toggled
- 040_chk_lower.png - Lower lateral checkbox toggled
- 050_cross_frame.png - Cross-frame attachment inputs
- 060_undo.png - After undo click
- 070_save.png - After save click
- 071_reload.png - After reload click
- 080_drawer_open.png - Detail drawer opened
- 081_drawer_escape.png - Drawer closed via Escape
- console_log.txt - Console message log

## Electron Evidence (evidence_electron/)

Total: 10 screenshots

- E001_initial.png - Electron initial screen
- E002_no_onboarding.png - After onboarding dismiss
- E003_sample_selection.png - Sample selection
- E004_after_sample_load.png - After sample load
- E005_basics.png - Basics screen
- E010_text_inputs.png - Text inputs filled
- E020_numeric.png - Numeric fields filled
- E030_cross_frame.png - Cross-frame inputs
- E060_save.png - After save
- E070_validation.png - Validation screen

## CSV Results

- 07_browser_results.csv - 39 browser test results
- 08_electron_results.csv - NOT_AVAILABLE (timeout during write)
- 11_focus_keyboard_results.csv - 2 focus/keyboard results
- 13_error_register.csv - Empty (no defects found in completed tests)