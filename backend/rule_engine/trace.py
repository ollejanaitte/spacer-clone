# -*- coding: utf-8 -*-
"""Trace Recorder - records execution traces."""

import time
from typing import Any, Dict
from .models import TraceRecord


class TraceRecorder:
    """Records trace information for rule evaluation."""

    def __init__(self):
        self._traces: list = []

    def record(self, rule_id: str, source_evidence_ids: str,
               input_snapshot: Dict[str, Any],
               formula_id: str = "", output_snapshot: Dict[str, Any] = None,
               validation_result: str = "", downstream_consumer: str = "",
               rule_version: str = "1.0") -> TraceRecord:
        rec = TraceRecord(
            rule_id=rule_id, source_evidence_ids=source_evidence_ids,
            input_snapshot=input_snapshot, formula_id=formula_id,
            output_snapshot=output_snapshot or {},
            validation_result=validation_result,
            downstream_consumer=downstream_consumer,
            rule_version=rule_version,
        )
        self._traces.append(rec)
        return rec

    def get_traces(self) -> list:
        return self._traces.copy()

    def clear(self):
        self._traces.clear()