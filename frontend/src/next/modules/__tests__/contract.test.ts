import { describe, expect, it } from "vitest";
import {
  createInitialModuleData,
  isModuleStatus,
  isValidModuleKey,
  MODULE_STATUSES,
  MODULE_STATUS_LABELS,
} from "../contract";

describe("Module Contract (Phase 1-01)", () => {
  it("exposes the 5 module statuses with Japanese labels", () => {
    expect(MODULE_STATUSES).toEqual([
      "notStarted",
      "working",
      "invalid",
      "needsUpdate",
      "completed",
    ]);
    expect(MODULE_STATUS_LABELS.notStarted).toBe("未着手");
    expect(MODULE_STATUS_LABELS.working).toBe("作業中");
    expect(MODULE_STATUS_LABELS.invalid).toBe("入力エラー");
    expect(MODULE_STATUS_LABELS.needsUpdate).toBe("更新必要");
    expect(MODULE_STATUS_LABELS.completed).toBe("完了");
  });

  it("isModuleStatus guards runtime values", () => {
    expect(isModuleStatus("working")).toBe(true);
    expect(isModuleStatus("completed")).toBe(true);
    expect(isModuleStatus("unknown")).toBe(false);
    expect(isModuleStatus(42)).toBe(false);
  });

  it("isValidModuleKey accepts the 8 project module keys", () => {
    expect(isValidModuleKey("road")).toBe(true);
    expect(isValidModuleKey("terrain")).toBe(true);
    expect(isValidModuleKey("bridgeLayout")).toBe(true);
    expect(isValidModuleKey("substructure")).toBe(true);
    expect(isValidModuleKey("superstructure")).toBe(true);
    expect(isValidModuleKey("analysis")).toBe(true);
    expect(isValidModuleKey("cim")).toBe(true);
    expect(isValidModuleKey("deliverables")).toBe(true);
    expect(isValidModuleKey("bogus")).toBe(false);
  });

  it("createInitialModuleData returns an empty, not-started module", () => {
    const initial = createInitialModuleData();
    expect(initial.state.status).toBe("notStarted");
    expect(initial.state.dirty).toBe(false);
    expect(initial.state.lastModified).toBeNull();
    expect(initial.state.lastValidated).toBeNull();
    expect(initial.state.validationErrors).toEqual([]);
    expect(initial.data).toEqual({});
    expect(initial.validation.status).toBe("notStarted");
    expect(initial.validation.issues).toEqual([]);
  });
});
