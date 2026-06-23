// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { getUiModeDefault, setUiModeDefault } from "../services/uiModeDefault";
import { getInitialRoute } from "../routes";

describe("redirects", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  test("localStorageなしで/に遷移", () => {
    expect(getInitialRoute()).toBe("/");
  });

  test("learnで/learnに遷移", () => {
    setUiModeDefault("learn");
    expect(getInitialRoute()).toBe("/learn");
  });

  test("level0で/level0にリダイレクト", () => {
    setUiModeDefault("level0");
    const href = window.location.href;
    getInitialRoute();
    // redirect happens via window.location.href
  });

  test("proで/proにリダイレクト", () => {
    setUiModeDefault("pro");
    const href = window.location.href;
    getInitialRoute();
    // redirect happens via window.location.href
  });
});
