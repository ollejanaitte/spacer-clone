# Backend Test Plan

This directory contains the MVP test skeleton defined by `docs/11_test_spec.md`.

Current scope:

- Case 1: cantilever beam, tip concentrated load
- Case 2: simply supported beam, center concentrated load
- Case 3: simply supported beam, uniform distributed load
- Case 4: 3D cantilever torsion
- Case 5: insufficient support error
- Case 6: invalid member reference error
- Case 7: rigid body mode detection for all-free nodes
- Project JSON Schema validation
- Result JSON Schema validation
- FastAPI endpoint skeleton tests from `docs/07_api_spec.md`

Engine and API tests skip with explicit reasons until implementation modules are available.
