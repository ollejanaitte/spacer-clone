import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../data/defaultProject";
import { migrateTimeHistorySettings } from "./settingsMigration";

describe("TH-10 time history settings migration", () => {
  it("migrates a legacy X assignment to schema version 2", () => {
    const project = createDefaultProject();
    project.groundMotions = [{
      id: "gm-001", name: "legacy", direction: "X", timeStep: 0.01, duration: 0.02, unit: "m/s2", samples: [0, 1, 0],
    }];
    project.analysisSettings.timeHistory = {
      enabled: true, method: "newmark-beta", timeStep: 0.01, duration: 0.02, beta: 0.25, gamma: 0.5,
      direction: "X", groundMotionId: "gm-001",
    };
    const migrated = migrateTimeHistorySettings(project).analysisSettings.timeHistory;
    expect(migrated?.schemaVersion).toBe(2);
    expect(migrated?.groundMotions).toEqual({
      x: { enabled: true, groundMotionId: "gm-001" },
      y: { enabled: false, groundMotionId: null },
      z: { enabled: false, groundMotionId: null },
    });
  });

  it("preserves an existing v2 assignment", () => {
    const project = createDefaultProject();
    project.analysisSettings.timeHistory = {
      schemaVersion: 2, enabled: true, method: "newmark-beta", timeStep: 0.01, duration: 1, beta: 0.25, gamma: 0.5,
      groundMotions: {
        x: { enabled: true, groundMotionId: "x" },
        y: { enabled: true, groundMotionId: "y" },
        z: { enabled: false, groundMotionId: null },
      },
    };
    expect(migrateTimeHistorySettings(project)).toBe(project);
  });
});
