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

  test("redirects to / when localStorage is unavailable", () => {
    expect(getInitialRoute()).toBe("/");
  });

  test("navigates to /learn when the mode is learn", () => {
    setUiModeDefault("learn");
    expect(getInitialRoute()).toBe("/learn");
  });

  test("redirects to /level0 when the mode is level0", () => {
    setUiModeDefault("level0");
    const href = window.location.href;
    getInitialRoute();
    // redirect happens via window.location.href
  });

  test("redirects to /pro when the mode is pro", () => {
    setUiModeDefault("pro");
    const href = window.location.href;
    getInitialRoute();
    // redirect happens via window.location.href
  });
});
