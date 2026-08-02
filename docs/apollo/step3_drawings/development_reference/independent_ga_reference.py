#!/usr/bin/env python3
"""Independent GOLD-GA-001 general arrangement reference. No production imports."""
from __future__ import annotations
import hashlib
import json
from decimal import Decimal, getcontext
from pathlib import Path

getcontext().prec = 80
ROOT = Path(__file__).resolve().parent

# Fixed JSON inputs — SIMPLE_SINGLE_SPAN_SAMPLE_INPUT (Step 1/2 sample)
INPUTS = {
    "spanLength": "30.0",
    "bridgeLength": "30.0",
    "width": "10.5",
    "girderCount": "4",
    "girderSpacing": "3.0",
    "girderDepth": "2.0",
    "deckThickness": "0.22",
    "crossBeamSpacing": "5.0",
    "stiffenerSpacing": "2.5",
    "swayBracingInterval": "1",
    "topFlangeWidth": "0.45",
    "topFlangeThickness": "0.025",
    "bottomFlangeWidth": "0.55",
    "bottomFlangeThickness": "0.03",
    "webThickness": "0.012",
}

L = Decimal(INPUTS["bridgeLength"])
W = Decimal(INPUTS["width"])
N = int(INPUTS["girderCount"])
S = Decimal(INPUTS["girderSpacing"])
CB = Decimal(INPUTS["crossBeamSpacing"])
ST = Decimal(INPUTS["stiffenerSpacing"])
SW_INT = int(INPUTS["swayBracingInterval"])
H = Decimal(INPUTS["girderDepth"])
TD = Decimal(INPUTS["deckThickness"])

overhang = (W - (N - 1) * S) / Decimal(2)
first = -((N - 1) * S) / Decimal(2)
centers = [first + i * S for i in range(N)]
cb_count = int(L // CB) + 1
cb_stations = [min(i * CB, L) for i in range(cb_count)]
st_count = int(L // ST) + 1
st_stations = [min(i * ST, L) for i in range(st_count)]
sway = [cb_stations[i] for i in range(1, cb_count - 1) if i % SW_INT == 0]
supports = [Decimal("0"), L]

payload = {
    "caseId": "GOLD-GA-001",
    "label": "UNVERIFIED_DEVELOPMENT_ONLY",
    "numericDesignAuthorization": "NOT_GRANTED",
    "designOrConstructionUse": "PROHIBITED",
    "inputs": INPUTS,
    "coordinateSystem": {
        "x": "BRIDGE_AXIS_START_TO_END",
        "y": "TRANSVERSE_LEFT_TO_RIGHT",
        "z": "UPWARD",
        "plan": "X-Y",
        "elevation": "X-Z",
        "section": "Y-Z",
        "datum": "LOCAL DATUM — ABSOLUTE ELEVATION NOT PROVIDED",
    },
    "results": {
        "overhang": format(overhang, "f"),
        "girderCentersY": [format(c, "f") for c in centers],
        "planDeckBounds": {
            "minX": "0",
            "maxX": format(L, "f"),
            "minY": format(-W / 2, "f"),
            "maxY": format(W / 2, "f"),
        },
        "supportStations": [format(s, "f") for s in supports],
        "crossBeamStations": [format(s, "f") for s in cb_stations],
        "stiffenerStations": [format(s, "f") for s in st_stations],
        "swayStations": [format(s, "f") for s in sway],
        "elevationBounds": {
            "minX": "0",
            "maxX": format(L, "f"),
            "minZ": "0",
            "maxZ": format(H + TD, "f"),
        },
        "dimensions": {
            "spanLength": INPUTS["spanLength"],
            "bridgeLength": INPUTS["bridgeLength"],
            "width": INPUTS["width"],
            "girderSpacing": INPUTS["girderSpacing"],
            "overhang": format(overhang, "f"),
            "girderDepth": INPUTS["girderDepth"],
            "deckThickness": INPUTS["deckThickness"],
        },
        "entityCountHints": {
            "girders": N,
            "crossBeams": cb_count,
            "supports": 2,
            "swayStations": len(sway),
            "stiffenerStationsPerGirder": st_count,
        },
        "stableIdPattern": {
            "girders": "G1..Gn",
            "crossBeams": "C1..Cm",
            "supports": "SUP-1..SUP-2",
            "sway": "SW-1..",
        },
        "sheetViewCount": 3,
        "viewTypes": ["GENERAL_PLAN", "GENERAL_ELEVATION", "STANDARD_SECTION"],
        "tolerances": {"absolute": "1e-9", "relative": "0"},
    },
}

text = json.dumps(payload, indent=2, ensure_ascii=False) + "\n"
(ROOT / "ga_reference_results.json").write_text(text, encoding="utf-8")
(ROOT / "ga_reference_inputs.json").write_text(
    json.dumps({"caseId": "GOLD-GA-001", "inputs": INPUTS}, indent=2) + "\n",
    encoding="utf-8",
)
digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
(ROOT / "SHA256SUMS.txt").write_text(f"{digest}  ga_reference_results.json\n", encoding="utf-8")
print(json.dumps({"sha256": digest, "caseId": "GOLD-GA-001"}, indent=2))
