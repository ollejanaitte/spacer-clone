/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { createEmptyImporterProject } from "../factory";
import type { LinerBridge, GirderLineSet } from "../types";
import {
  cloneGirderLineSetWithNewIds,
  findCopySourceBridge,
  inferRoleFromLabel,
  linesFromCsvText,
  moveLine,
  normalizeDisplayOrder,
  parseCsvLineLabels,
} from "./lineMasterHooks";

function sampleSet(): GirderLineSet {
  return {
    id: "gls-1",
    name: "CL",
    referenceMode: "pdf-row-master",
    appliesToSpanIds: ["span-1"],
    lines: [
      { id: "line-1", label: "CL", role: "center", displayOrder: 0 },
      { id: "line-2", label: "G1", role: "girder", displayOrder: 1 },
    ],
  };
}

describe("lineMaster CSV parser", () => {
  it("parses one label per line", () => {
    expect(parseCsvLineLabels("CL\nG1\nG2\nHL1")).toEqual(["CL", "G1", "G2", "HL1"]);
  });

  it("supports comma and tab separated values", () => {
    expect(parseCsvLineLabels("CL,G1\tG2")).toEqual(["CL", "G1", "G2"]);
  });

  it("infers roles from labels", () => {
    expect(inferRoleFromLabel("CL")).toBe("center");
    expect(inferRoleFromLabel("HCL")).toBe("center");
    expect(inferRoleFromLabel("G1")).toBe("girder");
    expect(inferRoleFromLabel("G12")).toBe("girder");
    expect(inferRoleFromLabel("HL1")).toBe("edge");
    expect(inferRoleFromLabel("FOO")).toBe("custom");
  });

  it("creates girder lines from csv text", () => {
    const lines = linesFromCsvText("CL\nG1\nHL1");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatchObject({ label: "CL", role: "center", displayOrder: 0 });
    expect(lines[1]).toMatchObject({ label: "G1", role: "girder", displayOrder: 1 });
    expect(lines[2]).toMatchObject({ label: "HL1", role: "edge", displayOrder: 2 });
  });
});

describe("lineMaster reorder", () => {
  it("moves lines up and down", () => {
    const lines = sampleSet().lines;
    const movedDown = moveLine(lines, "line-1", "down");
    expect(normalizeDisplayOrder(movedDown).map((line) => line.label)).toEqual(["G1", "CL"]);

    const movedUp = moveLine(movedDown, "line-1", "up");
    expect(normalizeDisplayOrder(movedUp).map((line) => line.label)).toEqual(["CL", "G1"]);
  });
});

describe("lineMaster bridge copy", () => {
  it("clones girder line set with new ids", () => {
    const source = sampleSet();
    const cloned = cloneGirderLineSetWithNewIds(source);

    expect(cloned.name).toBe(source.name);
    expect(cloned.referenceMode).toBe(source.referenceMode);
    expect(cloned.appliesToSpanIds).toEqual(source.appliesToSpanIds);
    expect(cloned.id).not.toBe(source.id);
    expect(cloned.lines).toHaveLength(2);
    expect(cloned.lines[0]?.id).not.toBe("line-1");
    expect(cloned.lines[0]?.label).toBe("CL");
  });

  it("finds previous bridge with girder line sets", () => {
    const bridgeA: LinerBridge = {
      id: "bridge-a",
      name: "橋A",
      girderLineSets: [sampleSet()],
      spans: [],
      sections: [],
    };
    const bridgeB: LinerBridge = {
      id: "bridge-b",
      name: "橋B",
      girderLineSets: [],
      spans: [],
      sections: [],
    };

    const project = {
      ...createEmptyImporterProject(),
      bridges: [bridgeA, bridgeB],
    };

    expect(findCopySourceBridge(project, "bridge-b")).toEqual(bridgeA);
    expect(findCopySourceBridge(project, "bridge-a")).toBeNull();
  });
});
