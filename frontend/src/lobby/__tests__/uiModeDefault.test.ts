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

  test("初期値はnull", () => {
    expect(getUiModeDefault()).toBeNull();
  });

  test("learnを保存・読込", () => {
    setUiModeDefault("learn");
    expect(getUiModeDefault()).toBe("learn");
  });

  test("level0を保存・読込", () => {
    setUiModeDefault("level0");
    expect(getUiModeDefault()).toBe("level0");
  });

  test("proを保存・読込", () => {
    setUiModeDefault("pro");
    expect(getUiModeDefault()).toBe("pro");
  });

  test("nullで削除", () => {
    setUiModeDefault("learn");
    setUiModeDefault(null);
    expect(getUiModeDefault()).toBeNull();
  });

  test("不正値はnullを返す", () => {
    window.localStorage.setItem("spacer_clone_ui_mode_default", "invalid");
    expect(getUiModeDefault()).toBeNull();
  });
});
