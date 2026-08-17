import { describe, expect, it } from "vitest";
import { DESIGN_PLATFORM_ENTRY_PATH } from "./designPlatformEntry";

describe("designPlatformEntry", () => {
  it("exposes the canonical /app business entry as the professional entry (G-5 single app)", () => {
    expect(DESIGN_PLATFORM_ENTRY_PATH).toBe("/app/business");
  });
});
