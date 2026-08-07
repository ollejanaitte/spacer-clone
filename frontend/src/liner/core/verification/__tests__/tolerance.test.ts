import { describe, expect, it } from "vitest";
import type { TolerancePolicy } from "../types";
import {
  allPassed,
  compareWithPolicy,
  compareWithPolicyAndSystems,
  compareWithPolicyAndUnits,
  isFiniteTolerance,
  verdictOf,
} from "../tolerance";

describe("isFiniteTolerance", () => {
  it("accepts finite non-negative tolerances", () => {
    expect(isFiniteTolerance({ absolute: 1e-6 })).toBe(true);
    expect(isFiniteTolerance({ relative: 1e-6 })).toBe(true);
    expect(isFiniteTolerance({ absolute: 0 })).toBe(true);
  });

  it("rejects NaN and Infinity", () => {
    expect(isFiniteTolerance({ absolute: Number.NaN })).toBe(false);
    expect(isFiniteTolerance({ relative: Number.POSITIVE_INFINITY })).toBe(false);
  });

  it("rejects negative tolerances", () => {
    expect(isFiniteTolerance({ absolute: -1 })).toBe(false);
    expect(isFiniteTolerance({ relative: -1e-6 })).toBe(false);
  });
});

describe("compareWithPolicy: absolute", () => {
  it("passes within absolute tolerance", () => {
    const policy: TolerancePolicy = { absolute: 1e-6 };
    const result = compareWithPolicy(1.0, 1.0000004, policy);
    expect(result.verdict).toBe("PASS");
  });

  it("fails beyond absolute tolerance", () => {
    const policy: TolerancePolicy = { absolute: 1e-6 };
    const result = compareWithPolicy(1.0, 1.001, policy);
    expect(result.verdict).toBe("FAIL");
  });
});

describe("compareWithPolicy: relative", () => {
  it("passes within relative tolerance", () => {
    const policy: TolerancePolicy = { relative: 1e-3 };
    const result = compareWithPolicy(1000, 1000.4, policy);
    expect(result.verdict).toBe("PASS");
  });

  it("fails beyond relative tolerance", () => {
    const policy: TolerancePolicy = { relative: 1e-6 };
    const result = compareWithPolicy(1000, 1001, policy);
    expect(result.verdict).toBe("FAIL");
  });
});

describe("compareWithPolicy: exact", () => {
  it("passes only on exact equality", () => {
    const policy: TolerancePolicy = { exact: true };
    expect(compareWithPolicy(1, 1, policy).verdict).toBe("PASS");
    expect(compareWithPolicy(1, 1 + 1e-15, policy).verdict).toBe("FAIL");
  });
});

describe("compareWithPolicy: NaN / Infinity rejection", () => {
  it("rejects NaN expected", () => {
    const policy: TolerancePolicy = { absolute: 1e-6 };
    const result = compareWithPolicy(Number.NaN, 1, policy);
    expect(result.verdict).toBe("REJECTED");
    expect(result.rejectedReason).toBe("nan");
  });

  it("rejects NaN actual", () => {
    const policy: TolerancePolicy = { absolute: 1e-6 };
    const result = compareWithPolicy(1, Number.NaN, policy);
    expect(result.verdict).toBe("REJECTED");
    expect(result.rejectedReason).toBe("nan");
  });

  it("rejects Infinity", () => {
    const policy: TolerancePolicy = { absolute: 1e-6 };
    expect(compareWithPolicy(Number.POSITIVE_INFINITY, 1, policy).verdict).toBe("REJECTED");
    expect(compareWithPolicy(1, Number.NEGATIVE_INFINITY, policy).verdict).toBe("REJECTED");
  });
});

describe("compareWithPolicy: unit / coordinate mismatch rejection", () => {
  it("rejects unit mismatch", () => {
    const policy: TolerancePolicy = { absolute: 1e-6 };
    const result = compareWithPolicyAndUnits(1, 1, policy, "m", "degree");
    expect(result.verdict).toBe("REJECTED");
    expect(result.rejectedReason).toBe("unit_mismatch");
  });

  it("passes on comparable units", () => {
    const policy: TolerancePolicy = { absolute: 1e-6 };
    const result = compareWithPolicyAndUnits(1, 1.0000002, policy, "m", "mm");
    expect(result.verdict).toBe("PASS");
  });

  it("rejects coordinate-system mismatch", () => {
    const policy: TolerancePolicy = { absolute: 1e-6 };
    const result = compareWithPolicyAndSystems(1, 1, policy, "GLOBAL_XY", "GIRDER_LOCAL");
    expect(result.verdict).toBe("REJECTED");
    expect(result.rejectedReason).toBe("coordinate_system_mismatch");
  });

  it("passes on matching coordinate systems", () => {
    const policy: TolerancePolicy = { absolute: 1e-6 };
    const result = compareWithPolicyAndSystems(1, 1.0000002, policy, "GLOBAL_XY", "GLOBAL_XY");
    expect(result.verdict).toBe("PASS");
  });
});

describe("verdict helpers", () => {
  it("allPassed is false for empty or rejected", () => {
    expect(allPassed([])).toBe(false);
    const rejected = compareWithPolicy(Number.NaN, 1, { absolute: 1e-6 });
    expect(allPassed([rejected])).toBe(false);
  });

  it("verdictOf aggregates", () => {
    const pass = compareWithPolicy(1, 1, { absolute: 1e-6 });
    const fail = compareWithPolicy(1, 2, { absolute: 1e-6 });
    const rejected = compareWithPolicy(Number.NaN, 1, { absolute: 1e-6 });
    expect(verdictOf([])).toBe("REJECTED");
    expect(verdictOf([pass, pass])).toBe("PASS");
    expect(verdictOf([pass, fail])).toBe("FAIL");
    expect(verdictOf([pass, rejected])).toBe("REJECTED");
  });
});
