import { describe, expect, it } from "vitest";
import {
  areUnitsComparable,
  convertLength,
  dxfUnitsToR1Unit,
  r1UnitToDxfUnits,
} from "../units";

describe("convertLength", () => {
  it("converts m to mm", () => {
    expect(convertLength(1, "m", "mm")).toBe(1000);
  });

  it("converts mm to m", () => {
    expect(convertLength(1000, "mm", "m")).toBe(1);
  });

  it("identity conversion", () => {
    expect(convertLength(5, "m", "m")).toBe(5);
  });

  it("throws on unsupported conversion", () => {
    expect(() => convertLength(1, "m", "mm")).not.toThrow();
    expect(() => convertLength(1, "mm", "m")).not.toThrow();
  });
});

describe("dxf unit mapping", () => {
  it("maps dxf units to R1 units", () => {
    expect(dxfUnitsToR1Unit("meters")).toBe("m");
    expect(dxfUnitsToR1Unit("millimeters")).toBe("mm");
    expect(dxfUnitsToR1Unit("unitless")).toBe("dxf_unit");
  });

  it("maps R1 units to dxf units", () => {
    expect(r1UnitToDxfUnits("m")).toBe("meters");
    expect(r1UnitToDxfUnits("mm")).toBe("millimeters");
    expect(r1UnitToDxfUnits("dxf_unit")).toBe("unitless");
    expect(r1UnitToDxfUnits("degree")).toBeNull();
  });
});

describe("areUnitsComparable", () => {
  it("length units are comparable", () => {
    expect(areUnitsComparable("m", "mm")).toBe(true);
    expect(areUnitsComparable("mm", "m")).toBe(true);
  });

  it("angle units are comparable", () => {
    expect(areUnitsComparable("degree", "radian")).toBe(true);
  });

  it("ratio units are comparable", () => {
    expect(areUnitsComparable("percent", "permille")).toBe(true);
  });

  it("mismatched groups are not comparable", () => {
    expect(areUnitsComparable("m", "degree")).toBe(false);
    expect(areUnitsComparable("percent", "radian")).toBe(false);
  });

  it("other units only comparable to themselves", () => {
    expect(areUnitsComparable("station", "station")).toBe(true);
    expect(areUnitsComparable("station", "m")).toBe(false);
  });
});
