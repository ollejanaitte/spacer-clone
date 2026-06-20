import { describe, expect, it } from "vitest";
import {
  computeForceColorRange,
  forceValueToColor,
  memberForceColor,
  FORCE_COLOR_COMPONENTS,
  FORCE_COLOR_COMPONENT_LABELS,
  FORCE_COLOR_VALUE_TYPE_LABELS,
  DEFAULT_FORCE_COLOR_MODE,
} from "./memberForceColorMap";

describe("memberForceColorMap", () => {
  describe("computeForceColorRange", () => {
    it("returns min/max from values map", () => {
      const values = new Map([
        ["M1", 10],
        ["M2", -5],
        ["M3", 20],
      ]);
      const range = computeForceColorRange(values);
      expect(range.min).toBe(-5);
      expect(range.max).toBe(20);
    });

    it("returns 0,0 for empty map", () => {
      const range = computeForceColorRange(new Map());
      expect(range.min).toBe(0);
      expect(range.max).toBe(0);
    });

    it("handles single value", () => {
      const range = computeForceColorRange(new Map([["M1", 42]]));
      expect(range.min).toBe(42);
      expect(range.max).toBe(42);
    });
  });

  describe("forceValueToColor", () => {
    it("returns blue for t=0", () => {
      const color = forceValueToColor(0);
      expect(color).toBe("#1a56db");
    });

    it("returns red for t=1", () => {
      const color = forceValueToColor(1);
      expect(color).toBe("#dc2626");
    });

    it("clamps below 0 to blue", () => {
      const color = forceValueToColor(-0.5);
      expect(color).toBe("#1a56db");
    });

    it("clamps above 1 to red", () => {
      const color = forceValueToColor(1.5);
      expect(color).toBe("#dc2626");
    });

    it("returns a valid hex color", () => {
      const color = forceValueToColor(0.5);
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe("memberForceColor", () => {
    it("maps value to color based on range", () => {
      const range = { min: 0, max: 100 };
      const color = memberForceColor(50, range);
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    });

    it("returns mid-range color for midpoint", () => {
      const range = { min: 0, max: 100 };
      const color = memberForceColor(50, range);
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    });

    it("returns constant color when range is zero", () => {
      const range = { min: 5, max: 5 };
      const color = memberForceColor(5, range);
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe("constants", () => {
    it("has all 6 force components", () => {
      expect(FORCE_COLOR_COMPONENTS).toEqual(["N", "Vy", "Vz", "My", "Mz", "Mt"]);
    });

    it("has labels for all components", () => {
      for (const comp of FORCE_COLOR_COMPONENTS) {
        expect(FORCE_COLOR_COMPONENT_LABELS[comp]).toBeTruthy();
      }
    });

    it("has labels for all value types", () => {
      expect(FORCE_COLOR_VALUE_TYPE_LABELS.max).toBeTruthy();
      expect(FORCE_COLOR_VALUE_TYPE_LABELS.min).toBeTruthy();
      expect(FORCE_COLOR_VALUE_TYPE_LABELS.absMax).toBeTruthy();
    });

    it("has correct default force color mode", () => {
      expect(DEFAULT_FORCE_COLOR_MODE.enabled).toBe(false);
      expect(DEFAULT_FORCE_COLOR_MODE.component).toBe("N");
      expect(DEFAULT_FORCE_COLOR_MODE.valueType).toBe("absMax");
    });
  });
});
