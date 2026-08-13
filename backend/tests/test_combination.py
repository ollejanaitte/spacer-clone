#!/usr/bin/env python3
"""Phase 7-02 WP-H: COMBO-1 synthesis tests."""

from backend.engine.combination import synthesize_combination_rows, synthesize_combo1_result


def test_synthesize_combination_rows_sums_by_entity():
    rows = [
        {"loadCaseId": "DL-STRUCTURAL", "nodeId": "N1", "fz": 10.0},
        {"loadCaseId": "DL-DECK", "nodeId": "N1", "fz": 20.0},
    ]
    combined = synthesize_combination_rows(rows, {"DL-STRUCTURAL": 1.0, "DL-DECK": 1.0}, "COMBO-1")
    assert len(combined) == 1
    assert combined[0]["loadCaseId"] == "COMBO-1"
    assert combined[0]["fz"] == 30.0


def test_synthesize_combination_rows_applies_factors():
    rows = [
        {"loadCaseId": "DL-STRUCTURAL", "nodeId": "N1", "fz": 10.0},
        {"loadCaseId": "DL-DECK", "nodeId": "N1", "fz": 20.0},
    ]
    combined = synthesize_combination_rows(rows, {"DL-STRUCTURAL": 0.5, "DL-DECK": 1.5}, "COMBO-1")
    assert combined[0]["fz"] == 35.0


def test_synthesize_combo1_result_builds_envelope():
    raw = {
        "displacements": [
            {"loadCaseId": "DL-STRUCTURAL", "nodeId": "N1", "uz": -1.0},
            {"loadCaseId": "DL-DECK", "nodeId": "N1", "uz": -2.0},
        ],
        "reactions": [
            {"loadCaseId": "DL-STRUCTURAL", "nodeId": "N1", "fz": 10.0},
            {"loadCaseId": "DL-DECK", "nodeId": "N1", "fz": 20.0},
        ],
        "memberEndForces": [
            {"loadCaseId": "DL-STRUCTURAL", "memberId": "M1", "i": {"fx": 1.0}, "j": {"fx": -1.0}},
            {"loadCaseId": "DL-DECK", "memberId": "M1", "i": {"fx": 2.0}, "j": {"fx": -2.0}},
        ],
    }
    combo = synthesize_combo1_result(raw, {"DL-STRUCTURAL": 1.0, "DL-DECK": 1.0})
    assert combo["loadCaseId"] == "COMBO-1"
    assert combo["displacements"][0]["uz"] == -3.0
    assert combo["reactions"][0]["fz"] == 30.0
    assert combo["memberEndForces"][0]["i"]["fx"] == 3.0


def test_combo1_is_deterministic():
    raw = {
        "displacements": [
            {"loadCaseId": "DL-STRUCTURAL", "nodeId": "N1", "uz": -1.0},
            {"loadCaseId": "DL-DECK", "nodeId": "N1", "uz": -2.0},
        ],
        "reactions": [],
        "memberEndForces": [],
    }
    a = synthesize_combo1_result(raw, {"DL-STRUCTURAL": 1.0, "DL-DECK": 1.0})
    b = synthesize_combo1_result(raw, {"DL-STRUCTURAL": 1.0, "DL-DECK": 1.0})
    assert a == b
