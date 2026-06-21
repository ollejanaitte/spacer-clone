import { describe, test, expect } from "vitest";
import { createLevel0Store, ALLOWED_TRANSITIONS } from "../state/level0Store";

describe("level0Store", () => {
  test("初期状態は home", () => {
    const s = createLevel0Store();
    expect(s.getState().step).toBe("home");
  });

  test("home -> picker は許可", () => {
    const s = createLevel0Store();
    expect(() => s.goto("picker")).not.toThrow();
    expect(s.getState().step).toBe("picker");
  });

  test("home -> running は禁止", () => {
    const s = createLevel0Store();
    expect(() => s.goto("running")).toThrow();
  });

  test("picker -> running は許可", () => {
    const s = createLevel0Store();
    s.goto("picker");
    expect(() => s.goto("running")).not.toThrow();
    expect(s.getState().step).toBe("running");
  });

  test("running -> animation は許可", () => {
    const s = createLevel0Store();
    s.goto("picker");
    s.goto("running");
    expect(() => s.goto("animation")).not.toThrow();
    expect(s.getState().step).toBe("animation");
  });

  test("running -> error は許可", () => {
    const s = createLevel0Store();
    s.goto("picker");
    s.goto("running");
    expect(() => s.goto("error")).not.toThrow();
    expect(s.getState().step).toBe("error");
  });

  test("animation -> result は許可", () => {
    const s = createLevel0Store();
    s.goto("picker");
    s.goto("running");
    s.goto("animation");
    expect(() => s.goto("result")).not.toThrow();
    expect(s.getState().step).toBe("result");
  });

  test("result -> home は許可", () => {
    const s = createLevel0Store();
    s.goto("picker");
    s.goto("running");
    s.goto("animation");
    s.goto("result");
    expect(() => s.goto("home")).not.toThrow();
    expect(s.getState().step).toBe("home");
  });

  test("ALLOWED_TRANSITIONS: 全ステップが定義されている", () => {
    const steps: Array<keyof typeof ALLOWED_TRANSITIONS> = ["home", "picker", "running", "animation", "result", "error"];
    for (const step of steps) {
      expect(ALLOWED_TRANSITIONS[step]).toBeDefined();
    }
  });

  test("setProject: プロジェクトを設定できる", () => {
    const s = createLevel0Store();
    const project = { project: { id: "test" } } as any;
    s.setProject(project);
    expect(s.getState().project?.project.id).toBe("test");
  });

  test("setPreset: プリセットを設定できる", () => {
    const s = createLevel0Store();
    s.setPreset("medium");
    expect(s.getState().preset).toBe("medium");
  });

  test("reset: 初期状態に戻る", () => {
    const s = createLevel0Store();
    s.goto("picker");
    s.setPreset("strong");
    s.reset();
    expect(s.getState().step).toBe("home");
    expect(s.getState().preset).toBeNull();
  });
});
