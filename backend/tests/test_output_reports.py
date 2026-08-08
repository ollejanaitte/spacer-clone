# -*- coding: utf-8 -*-
"""Output - report / DXF tests (STEP-2 S2-UX13)."""
from __future__ import annotations

import pytest

from backend.rule_engine.output import (
    DxfDocument,
    DxfLine,
    DxfPoint,
    DxfText,
    build_report_set,
    render_dxf,
    table_to_csv,
    table_to_html,
)
from backend.rule_engine.output.tables import Table, Row


def _table():
    return Table("測点座標表", ["測点", "X"], [
        Row(columns=["0.000", "0.000"], raw={"station": 0.0}),
    ])


class TestCsvHtml:
    def test_table_to_csv(self):
        csv_text = table_to_csv(_table())
        assert "測点,X" in csv_text
        assert "0.000,0.000" in csv_text

    def test_table_to_html(self):
        html_text = table_to_html(_table())
        assert "<table>" in html_text
        assert "<caption>測点座標表</caption>" in html_text
        assert "<th>測点</th>" in html_text

    def test_report_set(self):
        report = build_report_set("r", [_table()])
        bundle = report.to_csv_bundle()
        assert "測点座標表" in bundle
        assert "<table>" in report.to_html()


class TestDxf:
    def test_render_minimal(self):
        doc = DxfDocument(
            points=[DxfPoint(1.0, 2.0)],
            lines=[DxfLine(0.0, 0.0, 10.0, 0.0)],
            texts=[DxfText("BP", 0.0, 0.0)],
        )
        dxf = render_dxf(doc)
        assert dxf.startswith("0\nSECTION\n  2\nHEADER\n")
        assert "$ACADVER\n  1\nAC1009" in dxf
        assert "ENTITIES" in dxf
        assert "LINE" in dxf
        assert "POINT" in dxf
        assert "TEXT" in dxf
        assert dxf.rstrip().endswith("0\nEOF")

    def test_empty_doc(self):
        dxf = render_dxf(DxfDocument())
        assert "ENTITIES" in dxf
        assert dxf.rstrip().endswith("0\nEOF")
