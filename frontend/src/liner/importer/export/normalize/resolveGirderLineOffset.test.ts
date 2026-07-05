import { describe, expect, it } from "vitest";
import { resolveGirderLineOffset } from "./resolveGirderLineOffset";
import type { Bridge, GirderLineMaster } from "../../types";

function createBridge(
  lines: GirderLineMaster[],
  sectionPoints: Array<{ lineId: string; cumulativeWidth: number | null }>,
): Bridge {
  return {
    id: "bridge-offset-test",
    name: "Offset test bridge",
    bridgeType: "continuous",
    girderLineSets: [
      {
        id: "gls-1",
        name: "Main",
        referenceMode: "pdf-row-master",
        appliesToSpanIds: ["span-1"],
        lines,
      },
    ],
    spans: [],
    sections: [
      {
        id: "section-1",
        bridgeId: "bridge-offset-test",
        spanId: "span-1",
        pdfPage: 1,
        azimuth: {
          value: null,
          flags: {},
          sourceRef: { pdfPage: 1, enteredAt: "2026-07-05T00:00:00+09:00" },
        },
        stationingRef: {
          stationValue: 0,
          cumulativeDistance: 0,
          sourceRef: { pdfPage: 1, enteredAt: "2026-07-05T00:00:00+09:00" },
        },
        points: sectionPoints.map((entry, index) => ({
          id: `point-${index}`,
          girderLineId: entry.lineId,
          lineLabel: lines.find((line) => line.id === entry.lineId)?.label ?? "",
          x: { value: 0, notation: "0", unit: "m", flags: {}, sourceRef: { pdfPage: 1, enteredAt: "2026-07-05T00:00:00+09:00" } },
          y: { value: 0, notation: "0", unit: "m", flags: {}, sourceRef: { pdfPage: 1, enteredAt: "2026-07-05T00:00:00+09:00" } },
          designElevation: { value: 0, notation: "0", unit: "m", flags: {}, sourceRef: { pdfPage: 1, enteredAt: "2026-07-05T00:00:00+09:00" } },
          crossSlope: { value: 0, notation: "0", unit: "%", flags: {}, sourceRef: { pdfPage: 1, enteredAt: "2026-07-05T00:00:00+09:00" } },
          unitDistance: { value: null, notation: "*", unit: "m", flags: {}, sourceRef: { pdfPage: 1, enteredAt: "2026-07-05T00:00:00+09:00" } },
          cumulativeDistance: { value: 0, notation: "0", unit: "m", flags: {}, sourceRef: { pdfPage: 1, enteredAt: "2026-07-05T00:00:00+09:00" } },
          unitWidth: { value: null, notation: "*", unit: "m", flags: {}, sourceRef: { pdfPage: 1, enteredAt: "2026-07-05T00:00:00+09:00" } },
          cumulativeWidth: {
            value: entry.cumulativeWidth,
            notation: entry.cumulativeWidth?.toString() ?? "*",
            unit: "m",
            flags: {},
            sourceRef: { pdfPage: 1, enteredAt: "2026-07-05T00:00:00+09:00" },
          },
          intersectionAngle: { value: null, flags: {}, sourceRef: { pdfPage: 1, enteredAt: "2026-07-05T00:00:00+09:00" } },
          station: { value: null, label: null, notation: null, flags: {}, sourceRef: { pdfPage: 1, enteredAt: "2026-07-05T00:00:00+09:00" } },
          flags: {},
          sourceRef: { pdfPage: 1, enteredAt: "2026-07-05T00:00:00+09:00" },
        })),
        sourceRef: { pdfPage: 1, enteredAt: "2026-07-05T00:00:00+09:00" },
      },
    ],
  };
}

describe("resolveGirderLineOffset", () => {
  it("returns 0 for HCL regardless of nominalOffset", () => {
    const line: GirderLineMaster = {
      id: "hcl",
      label: "HCL",
      role: "center",
      displayOrder: 0,
      nominalOffset: 99,
    };
    const bridge = createBridge([line], []);
    expect(resolveGirderLineOffset(line, bridge, 0)).toBe(0);
  });

  it("prefers nominalOffset over section cumulativeWidth", () => {
    const line: GirderLineMaster = {
      id: "hl1",
      label: "HL1",
      role: "edge",
      displayOrder: 0,
      nominalOffset: 7.5707,
    };
    const bridge = createBridge([line], [{ lineId: "hl1", cumulativeWidth: 1.5 }]);
    expect(resolveGirderLineOffset(line, bridge, 0)).toBeCloseTo(7.5707, 4);
  });

  it("uses section cumulativeWidth when nominalOffset is absent", () => {
    const line: GirderLineMaster = {
      id: "hl1",
      label: "HL1",
      role: "edge",
      displayOrder: 0,
    };
    const bridge = createBridge([line], [{ lineId: "hl1", cumulativeWidth: 7.5707 }]);
    expect(resolveGirderLineOffset(line, bridge, 0)).toBeCloseTo(7.5707, 4);
  });

  it("falls back to lineIndex when no other source exists", () => {
    const line: GirderLineMaster = {
      id: "hl1",
      label: "HL1",
      role: "edge",
      displayOrder: 3,
    };
    const bridge = createBridge([line], [{ lineId: "hl1", cumulativeWidth: null }]);
    expect(resolveGirderLineOffset(line, bridge, 3)).toBe(3);
  });
});
