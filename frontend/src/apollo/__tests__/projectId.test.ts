import { describe, expect, it } from "vitest";
import { buildDuplicateProjectName } from "../duplicateNaming";
import { generateApolloProjectId, isAsciiSafeApolloProjectId } from "../projectId";

describe("projectId", () => {
  it("generates ASCII-safe ids", () => {
    const id = generateApolloProjectId(1_700_000_000_000);
    expect(isAsciiSafeApolloProjectId(id)).toBe(true);
    expect(id.startsWith("apollo-prj-")).toBe(true);
  });

  it("does not derive ids from project names", () => {
    const first = generateApolloProjectId(1_700_000_000_000);
    const second = generateApolloProjectId(1_700_000_000_000);
    expect(first).not.toBe(second);
    expect(first).not.toContain("橋梁");
  });
});

describe("duplicateNaming", () => {
  it("uses deterministic lowest-unused suffixes", () => {
    const existing = ["Alpha", "Alpha-copy", "Alpha-copy-2"];
    expect(buildDuplicateProjectName("Alpha", existing)).toBe("Alpha-copy-3");
    expect(buildDuplicateProjectName("Alpha", ["Alpha"])).toBe("Alpha-copy");
    expect(buildDuplicateProjectName("Alpha", ["Alpha", "Alpha-copy"])).toBe("Alpha-copy-2");
  });
});
