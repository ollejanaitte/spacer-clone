import { describe, expect, it } from "vitest";
import type { CrossSectionTemplateDraft } from "../../schema/types";
import {
  appendOffsetLine,
  canMoveOffsetLineDown,
  canMoveOffsetLineUp,
  canRemoveOffsetLine,
  hasDuplicateOffsets,
  insertOffsetLine,
  isCenterlineOffsetLine,
  moveOffsetLine,
  removeOffsetLineAt,
} from "../offsetLineOrdering";

function templateOf(
  offsets: Array<{ id: string; offset: number }>,
): CrossSectionTemplateDraft {
  return {
    id: "CS-1",
    name: "template",
    offsetLines: offsets.map((entry) => ({
      id: entry.id,
      offset: entry.offset,
      elevation: 0,
      role: "custom" as const,
    })),
  };
}

describe("offsetLineOrdering", () => {
  it("inserts before, after, and at end while preserving existing ids", () => {
    const base = templateOf([
      { id: "OL-L", offset: -3 },
      { id: "OL-C", offset: 0 },
      { id: "OL-R", offset: 3 },
    ]);

    const before = insertOffsetLine(base, 1, "before", { offset: -1 });
    expect(before.offsetLines).toHaveLength(4);
    expect(before.offsetLines[1]?.offset).toBe(-1);
    expect(before.offsetLines.map((line) => line.id)).toContain("OL-L");
    expect(before.offsetLines.map((line) => line.id)).toContain("OL-C");
    expect(before.offsetLines.map((line) => line.id)).toContain("OL-R");
    expect(before.offsetLines.filter((line) => line.id === "OL-C")).toHaveLength(1);

    const after = insertOffsetLine(base, 1, "after", { offset: 1 });
    expect(after.offsetLines.map((line) => line.offset)).toEqual([-3, 0, 1, 3]);
    expect(after.offsetLines.some((line) => line.id === "OL-C")).toBe(true);

    const appended = appendOffsetLine(base, { offset: 5 });
    expect(appended.offsetLines.at(-1)?.offset).toBe(5);
    expect(appended.offsetLines.map((line) => line.id).slice(0, 3)).toEqual([
      "OL-L",
      "OL-C",
      "OL-R",
    ]);
  });

  it("moves rows up/down without renumbering ids and skips centerline", () => {
    const base = templateOf([
      { id: "OL-A", offset: -4 },
      { id: "OL-B", offset: -2 },
      { id: "OL-C", offset: 0 },
      { id: "OL-D", offset: 2 },
    ]);

    expect(canMoveOffsetLineUp(base, 0)).toBe(false);
    expect(canMoveOffsetLineDown(base, 3)).toBe(false);
    expect(canMoveOffsetLineUp(base, 2)).toBe(false);
    expect(canMoveOffsetLineDown(base, 2)).toBe(false);
    expect(canRemoveOffsetLine(base, 2)).toBe(false);
    expect(isCenterlineOffsetLine(base.offsetLines[2]!)).toBe(true);

    const upAcrossCenter = moveOffsetLine(base, 3, "up");
    expect(upAcrossCenter.offsetLines.map((line) => line.id)).toEqual([
      "OL-A",
      "OL-D",
      "OL-C",
      "OL-B",
    ]);
    expect(upAcrossCenter.offsetLines.find((line) => line.id === "OL-D")?.offset).toBe(2);

    const down = moveOffsetLine(base, 0, "down");
    expect(down.offsetLines.map((line) => line.id)).toEqual([
      "OL-B",
      "OL-A",
      "OL-C",
      "OL-D",
    ]);
  });

  it("refuses centerline deletion and allows duplicate offsets with detection", () => {
    const base = templateOf([
      { id: "OL-L", offset: -1 },
      { id: "OL-C", offset: 0 },
      { id: "OL-R", offset: 1 },
    ]);
    const removedCenter = removeOffsetLineAt(base, 1);
    expect(removedCenter.offsetLines).toHaveLength(3);

    const removedEdge = removeOffsetLineAt(base, 0);
    expect(removedEdge.offsetLines.map((line) => line.id)).toEqual(["OL-C", "OL-R"]);

    const duplicates = templateOf([
      { id: "OL-1", offset: 2 },
      { id: "OL-2", offset: 2 },
    ]);
    expect(hasDuplicateOffsets(duplicates.offsetLines)).toBe(true);
    expect(hasDuplicateOffsets(base.offsetLines)).toBe(false);
  });
});
