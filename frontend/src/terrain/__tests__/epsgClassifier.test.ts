import { describe, expect, it } from "vitest";
import {
  EPSG_CLASSIFIER_VERSION,
  classifyCrs,
  classifyEpsg,
  isPlaneRectangular,
} from "../coordinate/epsgClassifier";

describe("T-EPSG-01 EPSG classifier", () => {
  it("classifier version is frozen", () => {
    expect(EPSG_CLASSIFIER_VERSION).toBe("1");
  });

  it("classifies geographic CRS (4326/6668/4269/4612)", () => {
    for (const epsg of [4326, 6668, 4269, 4612]) {
      expect(classifyCrs(epsg)).toBe("geographic");
      expect(classifyEpsg(epsg).horizontalUnits).toBe("degree");
    }
  });

  it("classifies plane rectangular CRS (6669-6687) as projected with meter units", () => {
    for (const epsg of [6669, 6674, 6677, 6687]) {
      expect(isPlaneRectangular(epsg)).toBe(true);
      expect(classifyCrs(epsg)).toBe("projected");
      const c = classifyEpsg(epsg);
      expect(c.horizontalUnits).toBe("m");
      expect(c.projection).toBe("projected");
    }
  });

  it("boundary check: 6668 geographic, 6669 projected, 6687 projected, 6688 unknown", () => {
    expect(classifyCrs(6668)).toBe("geographic");
    expect(classifyCrs(6669)).toBe("projected");
    expect(classifyCrs(6687)).toBe("projected");
    expect(() => classifyCrs(6688)).toThrow(/CRS-UNKNOWN-EPSG/);
    expect(() => classifyCrs(30161)).toThrow(/CRS-UNKNOWN-EPSG/);
  });

  it("unknown EPSG throws CRS-UNKNOWN-EPSG", () => {
    expect(() => classifyCrs(9999)).toThrow(/CRS-UNKNOWN-EPSG/);
    expect(() => classifyEpsg(9999)).toThrow(/CRS-UNKNOWN-EPSG/);
  });
});