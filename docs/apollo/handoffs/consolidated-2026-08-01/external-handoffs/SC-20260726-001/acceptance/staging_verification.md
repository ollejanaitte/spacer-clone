# Staging Verification

- ZIP_OPEN_TEST: **PASSED**
- SHA256SUMS_MATCH: **FAILED:2**
- MANIFEST_MATCH: **PASSED**
- REQUIRED_FILES: **PASSED**
- EVIDENCE_LINKAGE: **PASSED**
- ABSOLUTE_PATH_LEAK: **NONE**
- TEMPORARY_FILE_LEAK: **NONE**
- SOURCE_PDF_LEAK: **NONE**
- APOLLO_CODE_LEAK: **NONE**

Manifest rows: 139
Disk files: 137
SHA sums: 137 ok=135 fail=2
Excluded: []
Unique evidence refs: 97 index_rows=102
Issues: ["SHA_FAIL:[('MANIFEST.csv', 'MISMATCH'), ('SHA256SUMS.txt', 'MISMATCH')]"]
Abs leak files sample: []
