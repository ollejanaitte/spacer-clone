import { describe, expect, it } from "vitest";
import type { TimeHistoryResult } from "../types";
import {
  buildPeakResponseRows,
  buildXyzDisplacementSeries,
  findSeriesMaximum,
  formatPeakResponseCsv,
  parseTimeHistoryDisplacementKey,
  xyzDisplacementKey,
} from "./displacementSeries";

function result(
  displacements: Record<string, number[]>,
  direction = "X",
  time = [0, 1],
): TimeHistoryResult {
  return {
    meta: {
      analysisId: "test",
      status: "success",
      method: "newmark-beta",
      timeStep: 1,
      duration: Math.max(0, time.length - 1),
      sampleCount: time.length,
      groundMotions: [{ direction }],
    },
    time,
    displacements,
    velocities: {},
    accelerations: {},
  };
}

describe("parseTimeHistoryDisplacementKey", () => {
  it("recognizes explicit ux, uy, and uz keys", () => {
    expect(parseTimeHistoryDisplacementKey("N2_ux")).toEqual({ nodeId: "N2", component: "ux", format: "component" });
    expect(parseTimeHistoryDisplacementKey("N2_uy")).toEqual({ nodeId: "N2", component: "uy", format: "component" });
    expect(parseTimeHistoryDisplacementKey("N2_uz")).toEqual({ nodeId: "N2", component: "uz", format: "component" });
  });

  it("maps a shorthand key to the active direction", () => {
    expect(parseTimeHistoryDisplacementKey("N2", "uy")).toEqual({
      nodeId: "N2",
      component: "uy",
      format: "shorthand",
    });
  });

  it("rejects empty, rotational, and directionless shorthand keys", () => {
    expect(parseTimeHistoryDisplacementKey("")).toBeNull();
    expect(parseTimeHistoryDisplacementKey("_ux")).toBeNull();
    expect(parseTimeHistoryDisplacementKey("N2_rx", "ux")).toBeNull();
    expect(parseTimeHistoryDisplacementKey("N2")).toBeNull();
  });
});

describe("buildXyzDisplacementSeries", () => {
  it("computes 3-4-0 as 5 at the same time sample", () => {
    const [series] = buildXyzDisplacementSeries(result({
      N2_ux: [0, 3],
      N2_uy: [0, 4],
      N2_uz: [0, 0],
    }));

    expect(series.status).toBe("available");
    expect(series.key).toBe(xyzDisplacementKey("N2"));
    expect(series.values).toEqual([0, 5]);
  });

  it("computes every time sample before finding the maximum", () => {
    const [series] = buildXyzDisplacementSeries(result({
      N2_ux: [3, 0],
      N2_uy: [0, 4],
      N2_uz: [0, 0],
    }));
    const maximum = findSeriesMaximum(series.values, [0, 1]);

    expect(series.values).toEqual([3, 4]);
    expect(maximum).toEqual({ value: 4, time: 1, index: 1 });
  });

  it("treats missing axes as zero for an explicit single-direction result", () => {
    const [series] = buildXyzDisplacementSeries(result({ N2_ux: [-2, 3] }, "X"));

    expect(series.status).toBe("available");
    expect(series.source).toBe("single-direction");
    expect(series.values).toEqual([2, 3]);
  });

  it("treats a shorthand result as the active direction", () => {
    const [series] = buildXyzDisplacementSeries(result({ N2: [-2, 3] }, "Y"));

    expect(series.status).toBe("available");
    expect(series.values).toEqual([2, 3]);
  });

  it("does not zero-fill a partial multi-component result", () => {
    const [series] = buildXyzDisplacementSeries(result({
      N2_ux: [1, 2],
      N2_uy: [3, 4],
    }));

    expect(series.status).toBe("unavailable");
    expect(series.reason).toBe("missing-components");
    expect(series.values).toEqual([]);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects non-finite component value %s",
    (invalid) => {
      const [series] = buildXyzDisplacementSeries(result({
        N2_ux: [0, invalid],
        N2_uy: [0, 4],
        N2_uz: [0, 0],
      }));

      expect(series.status).toBe("unavailable");
      expect(series.reason).toBe("invalid-values");
    },
  );

  it("rejects component arrays whose lengths do not match the time axis", () => {
    const [series] = buildXyzDisplacementSeries(result({
      N2_ux: [0, 3],
      N2_uy: [0],
      N2_uz: [0, 4],
    }));

    expect(series.status).toBe("unavailable");
    expect(series.reason).toBe("length-mismatch");
  });
});

describe("buildPeakResponseRows", () => {
  it("extracts max, min, absolute max, and their occurrence times for X/Y/Z", () => {
    const rows = buildPeakResponseRows(result({
      N2_ux: [1, -4, 3],
      N2_uy: [-2, 5, 1],
      N2_uz: [0, -6, 2],
    }, "X", [0, 0.5, 1]));

    expect(rows.find((row) => row.component === "X")).toMatchObject({
      maxValue: 3,
      maxTime: 1,
      minValue: -4,
      minTime: 0.5,
      absMaxValue: 4,
      absMaxTime: 0.5,
    });
    expect(rows.find((row) => row.component === "Y")).toMatchObject({
      maxValue: 5,
      maxTime: 0.5,
      minValue: -2,
      minTime: 0,
      absMaxValue: 5,
      absMaxTime: 0.5,
    });
    expect(rows.find((row) => row.component === "Z")).toMatchObject({
      maxValue: 2,
      maxTime: 1,
      minValue: -6,
      minTime: 0.5,
      absMaxValue: 6,
      absMaxTime: 0.5,
    });
  });

  it("computes the XYZ maximum from same-time vector magnitudes and leaves minimum blank", () => {
    const xyz = buildPeakResponseRows(result({
      N2_ux: [3, 0],
      N2_uy: [0, 4],
      N2_uz: [0, 0],
    }, "X", [2, 3])).find((row) => row.component === "XYZ");

    expect(xyz).toMatchObject({
      maxValue: 4,
      maxTime: 3,
      minValue: null,
      minTime: null,
      absMaxValue: 4,
      absMaxTime: 3,
    });
  });

  it("uses the first occurrence when equal extrema appear more than once", () => {
    const x = buildPeakResponseRows(result({
      N2_ux: [4, -4, 4],
    }, "X", [1, 2, 3])).find((row) => row.component === "X");

    expect(x).toMatchObject({
      maxTime: 1,
      minTime: 2,
      absMaxTime: 1,
    });
  });

  it.each([
    { displacements: { N2_ux: [] }, time: [0] },
    { displacements: { N2_ux: [0, 1] }, time: [0] },
    { displacements: { N2_ux: [0, Number.NaN] }, time: [0, 1] },
    { displacements: { N2_ux: [0, Number.POSITIVE_INFINITY] }, time: [0, 1] },
  ])("excludes invalid or empty component series: %o", ({ displacements, time }) => {
    expect(buildPeakResponseRows(result(displacements, "X", time))).toEqual([]);
  });

  it("keeps valid component rows but omits an unavailable partial XYZ row", () => {
    const rows = buildPeakResponseRows(result({
      N2_ux: [1, 2],
      N2_uy: [3, 4],
    }));

    expect(rows.map((row) => row.component)).toEqual(["X", "Y"]);
  });

  it("orders node ids naturally and components as X, Y, Z, XYZ", () => {
    const rows = buildPeakResponseRows(result({
      N10_ux: [0, 1],
      N2_ux: [0, 1],
      N2_uy: [0, 2],
      N2_uz: [0, 3],
    }));

    expect(rows.map((row) => `${row.nodeId}:${row.component}`)).toEqual([
      "N2:X",
      "N2:Y",
      "N2:Z",
      "N2:XYZ",
      "N10:X",
    ]);
  });
});

describe("formatPeakResponseCsv", () => {
  it("writes the documented English columns and blank XYZ minimum fields", () => {
    const rows = buildPeakResponseRows(result({
      N2_ux: [0, 3],
      N2_uy: [0, 4],
      N2_uz: [0, 0],
    }));
    const csv = formatPeakResponseCsv(rows);

    expect(csv.split("\r\n")[0]).toBe(
      "nodeId,component,maxValue,maxTime,minValue,minTime,absMaxValue,absMaxTime,unit",
    );
    expect(csv).toContain("N2,XYZ,5,1,,,5,1,m");
    expect(csv).not.toContain("NaN");
    expect(csv).not.toContain("Infinity");
  });
});
