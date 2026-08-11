import { describe, expect, it } from "vitest";
import { createInitialModuleData } from "../contract";
import {
  getModuleStatus,
  markModuleCompleted,
  markModuleDirty,
  markModuleValidated,
  resetModuleState,
  updateModuleState,
} from "../state";

const NOW = "2026-08-11T00:00:00.000Z";

describe("Module State / Status (Phase 1-03)", () => {
  it("marks a module dirty and moves it to working", () => {
    const initial = createInitialModuleData();
    const dirty = markModuleDirty(initial, NOW);
    expect(dirty.state.dirty).toBe(true);
    expect(dirty.state.status).toBe("working");
    expect(dirty.state.lastModified).toBe(NOW);
  });

  it("validates without errors -> completed, clears dirty", () => {
    const initial = createInitialModuleData();
    const dirty = markModuleDirty(initial, NOW);
    const validated = markModuleValidated(dirty, "completed", [], NOW);
    expect(validated.state.status).toBe("completed");
    expect(validated.state.dirty).toBe(false);
    expect(validated.state.lastValidated).toBe(NOW);
    expect(validated.state.validationErrors).toEqual([]);
    expect(validated.validation.status).toBe("completed");
  });

  it("validates with errors -> invalid status and stores issues", () => {
    const initial = createInitialModuleData();
    const issues = [{ path: "road.data.length", message: "must be positive" }];
    const validated = markModuleValidated(initial, "completed", issues, NOW);
    expect(validated.state.status).toBe("invalid");
    expect(validated.state.dirty).toBe(false);
    expect(validated.state.validationErrors).toEqual(issues);
    expect(validated.validation.issues).toEqual(issues);
    expect(getModuleStatus(validated)).toBe("invalid");
  });

  it("marks a module completed explicitly", () => {
    const initial = createInitialModuleData();
    const completed = markModuleCompleted(initial, NOW);
    expect(completed.state.status).toBe("completed");
    expect(completed.state.dirty).toBe(false);
    expect(completed.state.lastModified).toBe(NOW);
  });

  it("updates status without changing dirty unless requested", () => {
    const initial = createInitialModuleData();
    const updated = updateModuleState(initial, { status: "needsUpdate" }, NOW);
    expect(updated.state.status).toBe("needsUpdate");
    expect(updated.state.dirty).toBe(false);
    expect(updated.state.lastModified).toBe(NOW);
  });

  it("resets a module back to not-started", () => {
    const initial = createInitialModuleData();
    const working = markModuleDirty(initial, NOW);
    const reset = resetModuleState(working);
    expect(reset.state.status).toBe("notStarted");
    expect(reset.state.dirty).toBe(false);
    expect(reset.state.lastModified).toBeNull();
    expect(reset.data).toEqual({});
    expect(reset.validation.issues).toEqual([]);
  });
});
