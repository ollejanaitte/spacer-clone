import { describe, expect, it } from "vitest";
import { buildAnalysisCsvExports } from "../analysisCsv";
import { REAL_IF3_RESULT_RAW } from "../../analysis/__tests__/realIf3Fixture";
import type { FrameAnalysisResultResource } from "../../../../contracts/frameAnalysisResultResource";

const IF3 = REAL_IF3_RESULT_RAW as unknown as FrameAnalysisResultResource;

describe("AN-05 analysis CSV export (P0-04)", () => {
  it("builds displacements / reactions / member forces CSV from authoritative IF3", () => {
    const files = buildAnalysisCsvExports(IF3);
    expect(files.length).toBe(3);
    const names = files.map((f) => f.fileName);
    expect(names).toContain("displacements.csv");
    expect(names).toContain("reactions.csv");
    expect(names).toContain("member_section_forces.csv");

    const disp = files.find((f) => f.fileName === "displacements.csv")!;
    expect(disp.content.startsWith("case_id,node_id,ux,uy,uz\n")).toBe(true);
    expect(disp.content.split("\n").length).toBeGreaterThan(2);

    const react = files.find((f) => f.fileName === "reactions.csv")!;
    expect(react.content.startsWith("case_id,node_id,fx,fy,fz\n")).toBe(true);

    const mem = files.find((f) => f.fileName === "member_section_forces.csv")!;
    expect(mem.content.startsWith("case_id,member_id,end,fx,fy,fz,mx,my,mz\n")).toBe(true);
    // i and j end rows present
    expect(mem.content).toContain("i,");
    expect(mem.content).toContain("j,");
  });

  it("escapes fields with commas/quotes per RFC4180", () => {
    const files = buildAnalysisCsvExports(IF3);
    for (const file of files) {
      for (const line of file.content.split("\n").slice(1)) {
        if (line.trim().length === 0) continue;
        const depth = (line.match(/"/g) ?? []).length;
        expect(depth % 2).toBe(0);
      }
    }
  });
});
