import { describe, expect, it } from "vitest";
import {
  DESIGN_PLATFORM_BUSINESS_LIST_PATH,
  DESIGN_PLATFORM_HOME_PATH,
  isBusinessListPath,
  isDesignPlatformHome,
  isDesignPlatformRoute,
} from "./routes";

describe("platform routes", () => {
  it("identifies the Design Platform Home route", () => {
    expect(DESIGN_PLATFORM_HOME_PATH).toBe("/pro/platform");
    expect(isDesignPlatformHome("/pro/platform")).toBe(true);
    expect(isDesignPlatformHome("/pro/platform/businesses")).toBe(false);
  });

  it("identifies the business list route", () => {
    expect(DESIGN_PLATFORM_BUSINESS_LIST_PATH).toBe("/pro/platform/businesses");
    expect(isBusinessListPath("/pro/platform/businesses")).toBe(true);
    expect(isBusinessListPath("/pro/platform")).toBe(false);
  });

  it("identifies any Design Platform route", () => {
    expect(isDesignPlatformRoute("/pro/platform")).toBe(true);
    expect(isDesignPlatformRoute("/pro/platform/businesses")).toBe(true);
    expect(isDesignPlatformRoute("/pro/platform/businesses/abc")).toBe(true);
    expect(isDesignPlatformRoute("/pro")).toBe(false);
    expect(isDesignPlatformRoute("/pro/liner")).toBe(false);
  });
});
