import { describe, expect, it } from "vitest";
import {
  createInitialModules,
  getModuleDefinition,
  getModuleDefinitions,
  getModuleIds,
  hasModuleDefinition,
} from "../registry";
import { PROJECT_MODULE_KEYS } from "../../project/schema";

describe("Module Registry (Phase 1-02)", () => {
  it("registers all 8 module definitions", () => {
    const definitions = getModuleDefinitions();
    expect(definitions).toHaveLength(8);
    const ids = definitions.map((d) => d.moduleId);
    expect(ids).toEqual([...PROJECT_MODULE_KEYS]);
  });

  it("exposes module ids matching the Project Data Core module keys", () => {
    expect(getModuleIds()).toEqual([...PROJECT_MODULE_KEYS]);
  });

  it("provides road module definition with metadata", () => {
    const road = getModuleDefinition("road");
    expect(road?.moduleId).toBe("road");
    expect(road?.moduleType).toBe("road");
    expect(road?.displayName).toBe("道路");
    expect(road?.moduleVersion).toBeDefined();
    expect(road?.dataVersion).toBeDefined();
    expect(road?.defaultStatus).toBe("notStarted");
  });

  it("returns undefined for unknown module", () => {
    expect(getModuleDefinition("bogus" as never)).toBeUndefined();
    expect(hasModuleDefinition("road")).toBe(true);
    expect(hasModuleDefinition("bogus" as never)).toBe(false);
  });

  it("creates initial module data for all 8 modules", () => {
    const initial = createInitialModules();
    for (const key of PROJECT_MODULE_KEYS) {
      expect(initial[key]).toBeDefined();
      expect(initial[key].state.status).toBe("notStarted");
      expect(initial[key].data).toEqual({});
    }
    expect(Object.keys(initial)).toHaveLength(8);
  });
});
