// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { getUiModeDefault, setUiModeDefault } from "../services/uiModeDefault";

describe("uiModeDefault", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  test("defaults to null", () => {
    expect(getUiModeDefault()).toBeNull();
  });

  test("saves and reads the learn mode", () => {
    setUiModeDefault("learn");
    expect(getUiModeDefault()).toBe("learn");
  });

  test("saves and reads the level0 mode", () => {
    setUiModeDefault("level0");
    expect(getUiModeDefault()).toBe("level0");
  });

  test("saves and reads the pro mode", () => {
    setUiModeDefault("pro");
    expect(getUiModeDefault()).toBe("pro");
  });

  test("removes the entry when set to null", () => {
    setUiModeDefault("learn");
    setUiModeDefault(null);
    expect(getUiModeDefault()).toBeNull();
  });

  test("returns null for invalid values", () => {
    window.localStorage.setItem("spacer_clone_ui_mode_default", "invalid");
    expect(getUiModeDefault()).toBeNull();
  });
});
