# -*- coding: utf-8 -*-
"""Project Replay pytest integration (STEP-2 S2-UX16)."""
from __future__ import annotations

import pytest

from backend.tests.replay_runner import run_all_replays, run_replay


class TestReplayFixtures:
    def test_gm01_hcl(self):
        result = run_replay("gm01_hcl")
        assert result.verdict == "PASS", result.summary()
        assert result.comparisons

    def test_gm02_nishichita(self):
        result = run_replay("gm02_nishichita")
        # 実資料 (X1-5 FACT) に基づく照査。X/Yは未取得のため DEFERRED。
        assert result.verdict in ("PASS", "KNOWN"), result.summary()

    def test_all_replays_no_fail(self):
        results = run_all_replays()
        assert "gm01_hcl" in results
        assert "gm02_nishichita" in results
        for gm_id, result in results.items():
            assert result.verdict != "FAIL", f"{gm_id}: {result.summary()}"
