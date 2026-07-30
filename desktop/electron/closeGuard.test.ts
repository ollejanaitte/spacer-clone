import { describe, expect, it } from "vitest";
import { shouldPromptCloseGuardFromUrl } from "./closeGuard";

describe("shouldPromptCloseGuardFromUrl", () => {
  it("accepts Apollo route in dev url", () => {
    expect(shouldPromptCloseGuardFromUrl("http://127.0.0.1:5173/pro/apollo")).toBe(true);
    expect(shouldPromptCloseGuardFromUrl("http://127.0.0.1:5173/pro/apollo/editor")).toBe(true);
  });

  it("accepts Apollo route in file url", () => {
    expect(shouldPromptCloseGuardFromUrl("file:///pro/apollo")).toBe(true);
    expect(shouldPromptCloseGuardFromUrl("file:///pro/apollo/editor")).toBe(true);
  });

  it("rejects non-Apollo routes and invalid urls", () => {
    expect(shouldPromptCloseGuardFromUrl("http://127.0.0.1:5173/pro")).toBe(false);
    expect(shouldPromptCloseGuardFromUrl("http://127.0.0.1:5173/")).toBe(false);
    expect(shouldPromptCloseGuardFromUrl("not-a-url")).toBe(false);
  });
});
