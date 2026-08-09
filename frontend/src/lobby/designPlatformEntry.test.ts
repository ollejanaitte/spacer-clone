import { describe, expect, it } from "vitest";
import { DESIGN_PLATFORM_ENTRY_PATH } from "./designPlatformEntry";

describe("designPlatformEntry", () => {
  it("exposes the Design Platform Home path as the professional entry", () => {
    expect(DESIGN_PLATFORM_ENTRY_PATH).toBe("/pro/platform");
  });
});
