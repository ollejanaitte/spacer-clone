import { describe, expect, it } from "vitest";

import type {
  EnvelopeExtremum,
  EnvelopePair,
  GroundMotion,
  GroundMotionDirection,
  GroundMotionUnit,
  TimeHistoryAnalysisSettings,
  TimeHistoryDamping,
  TimeHistoryDampingType,
  TimeHistoryMethod,
  TimeHistoryResult,
  TimeHistoryResultMeta,
} from "./timeHistory";

// A minimal envelope shape used only for the cast inside one test.
type EnvelopeMap = {
  displacements: Record<string, EnvelopePair>;
};

describe("TimeHistoryDampingType", () => {
  it("accepts the four reserved enum values", () => {
    const values: TimeHistoryDampingType[] = [
      "rayleigh",
      "modal",
      "constant",
      "userMatrix",
    ];
    expect(values).toHaveLength(4);
  });
});

describe("GroundMotion direction and unit enums", () => {
  it("restricts direction to X, Y, or Z", () => {
    const directions: GroundMotionDirection[] = ["X", "Y", "Z"];
    expect(directions).toEqual(["X", "Y", "Z"]);
  });

  it("restricts unit to m/s2 or gal", () => {
    const units: GroundMotionUnit[] = ["m/s2", "gal"];
    expect(units).toEqual(["m/s2", "gal"]);
  });
});

describe("TimeHistoryAnalysisSettings shape", () => {
  it("builds an MVP settings object with the required fields", () => {
    const settings: TimeHistoryAnalysisSettings = {
      method: "newmark-beta",
      timeStep: 0.01,
      duration: 30.0,
      beta: 0.25,
      gamma: 0.5,
    };
    expect(settings.method).toBe("newmark-beta");
    expect(settings.timeStep).toBe(0.01);
    expect(settings.duration).toBe(30.0);
    expect(settings.beta).toBe(0.25);
    expect(settings.gamma).toBe(0.5);
  });

  it("exposes a TimeHistoryMethod union that only allows newmark-beta in the MVP", () => {
    const method: TimeHistoryMethod = "newmark-beta";
    expect(method).toBe("newmark-beta");
  });

  it("accepts an optional Rayleigh damping block", () => {
    const damping: TimeHistoryDamping = {
      type: "rayleigh",
      mode1Frequency: 1.5,
      mode2Frequency: 8.0,
      targetDampingRatio1: 0.05,
      targetDampingRatio2: 0.05,
    };
    const settings: TimeHistoryAnalysisSettings = {
      method: "newmark-beta",
      timeStep: 0.01,
      duration: 30.0,
      beta: 0.25,
      gamma: 0.5,
      damping,
    };
    expect(settings.damping?.type).toBe("rayleigh");
  });
});

describe("GroundMotion shape", () => {
  it("represents a complete record with X direction and SI unit", () => {
    const record: GroundMotion = {
      id: "gm-001",
      name: "El Centro 1940 NS",
      direction: "X",
      timeStep: 0.01,
      duration: 30.0,
      unit: "m/s2",
      samples: [0.0, 0.012, 0.018, -0.003],
    };
    expect(record.direction).toBe("X");
    expect(record.unit).toBe("m/s2");
    expect(record.samples).toHaveLength(4);
  });

  it("represents a record with the gal unit", () => {
    const record: GroundMotion = {
      id: "gm-001",
      name: "Gal unit record",
      direction: "Y",
      timeStep: 0.02,
      duration: 10.0,
      unit: "gal",
      samples: [0.0, 1.0, 2.0],
    };
    expect(record.unit).toBe("gal");
  });
});

describe("Envelope shapes", () => {
  it("stores a max and a min with value and time", () => {
    const extremum: EnvelopeExtremum = { value: 0.012, time: 4.32 };
    const pair: EnvelopePair = {
      max: extremum,
      min: { value: -0.011, time: 7.85 },
    };
    expect(pair.max.value).toBe(0.012);
    expect(pair.max.time).toBe(4.32);
    expect(pair.min.value).toBe(-0.011);
    expect(pair.min.time).toBe(7.85);
  });
});

describe("TimeHistoryResultMeta shape", () => {
  it("builds a meta block with the documented required fields", () => {
    const meta: TimeHistoryResultMeta = {
      analysisId: "th-2026-06-16T10:00:00Z",
      status: "success",
      method: "newmark-beta",
      timeStep: 0.01,
      duration: 30.0,
      beta: 0.25,
      gamma: 0.5,
      damping: { type: "rayleigh", alpha: 0.6283, beta: 0.00159 },
      groundMotions: [{ id: "gm-001", direction: "X" }],
      sampleCount: 3001,
    };
    expect(meta.status).toBe("success");
    expect(meta.sampleCount).toBe(3001);
    expect(meta.groundMotions).toHaveLength(1);
  });
});

describe("TimeHistoryResult shape", () => {
  it("builds a complete result block from the schema worked example", () => {
    const result: TimeHistoryResult = {
      meta: {
        analysisId: "th-test-001",
        status: "success",
        method: "newmark-beta",
        timeStep: 0.01,
        duration: 30.0,
        beta: 0.25,
        gamma: 0.5,
        damping: { type: "rayleigh" },
        groundMotions: [{ id: "gm-001", direction: "X" }],
        sampleCount: 3001,
      },
      time: [0.0, 0.01, 0.02],
      displacements: { n1: [0.0, 1e-6, 2e-6] },
      memberForces: {
        m1: {
          N: [0.0, 1.0, 2.0],
          Vy: [0.0, 0.5, 1.0],
          Mz: [0.0, 0.05, 0.1],
        },
      },
      reactions: { s1: [0.0, 1.5, 3.0] },
      envelopes: {
        displacements: {
          n1: {
            max: { value: 0.012, time: 4.32 },
            min: { value: -0.011, time: 7.85 },
          },
        },
      },
    };
    expect(result.time).toHaveLength(3);
    expect(result.displacements?.n1).toHaveLength(3);
    expect(result.memberForces?.m1.N).toEqual([0.0, 1.0, 2.0]);
    // The envelopes block is typed as a generic record in the MVP
    // schema model; cast through the documented envelope shape.
    const envelopes = result.envelopes as EnvelopeMap | undefined;
    expect(envelopes?.displacements.n1.max.value).toBe(0.012);
  });
});