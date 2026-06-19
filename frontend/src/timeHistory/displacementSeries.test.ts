import { describe, expect, it } from "vitest";
import type { TimeHistoryResult } from "../types";
import {
  buildXyzDisplacementSeries,
  findSeriesMaximum,
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
