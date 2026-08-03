# Artifact Manifest Spec

Bundle: `apollo-development-deliverables_<projectId>_r<revision8>.zip`

Required entries include:
- 00_README.txt
- 01_manifest.json
- 02_input/project.json
- 03/04 results JSON/CSV
- 05/06 quantities JSON/CSV
- 07 report HTML
- 08 drawings multi-sheet HTML
- 09/10/11 per-sheet SVG/DXF/HTML
- 12 S-01 standard section
- drawing_set.json
- member_schedule.csv/json
- SHA256SUMS.txt
- audit_manifest.json

Guards: same inputRevision/inputChecksum; reject STALE or mismatch.
