import { describe, expect, it } from "vitest";
import { shouldPromptCloseGuardFromUrl } from "./closeGuard";

describe("shouldPromptCloseGuardFromUrl", () => {
  it("returns false for all urls after /pro App Shell removal (Phase H-05)", () => {
    expect(shouldPromptCloseGuardFromUrl("http://127.0.0.1:5173/app")).toBe(false);
    expect(shouldPromptCloseGuardFromUrl("http://127.0.0.1:5173/pro/apollo")).toBe(false);
    expect(shouldPromptCloseGuardFromUrl("http://127.0.0.1:5173/")).toBe(false);
    expect(shouldPromptCloseGuardFromUrl("not-a-url")).toBe(false);
  });
});