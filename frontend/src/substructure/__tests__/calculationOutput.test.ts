// Phase C1 (M3-05) 計算書出力 テスト
import { describe, it, expect } from "vitest";
import {
  buildCalculationSheet,
  buildCalculationCsv,
  buildCalculationJson,
  summarizeStatuses,
  checkStatusLabel,
} from "../design/calculationOutput";
import { runDesign } from "../design/designEngine";
import { generateCombo } from "../planning/samples/sampleGenerator";

describe("buildCalculationSheet", () => {
  it("builds a traceable sheet with input/reaction/quantity/check rows", () => {
    const support = generateCombo("combo-standard")[1];
    const result = runDesign({ support, projectId: "test" });
    const sheet = buildCalculationSheet(result);
    const categories = new Set(sheet.rows.map((r) => r.category));
    expect(categories.has("入力")).toBe(true);
    expect(categories.has("概算数量(幾何)")).toBe(true);
    expect(categories.has("照査")).toBe(true);
    expect(sheet.rows.some((r) => r.item === "totalConcreteVolume")).toBe(true);
  });

  it("records HOLD reason and evidence for checks", () => {
    const support = generateCombo("combo-standard")[1];
    const result = runDesign({ support });
    const sheet = buildCalculationSheet(result);
    const holdRows = sheet.rows.filter((r) => r.value === "HOLD");
    expect(holdRows.length).toBeGreaterThan(0);
    expect(holdRows[0].note.length).toBeGreaterThan(0);
  });
});

describe("buildCalculationCsv", () => {
  it("produces CSV with header and rows for all supports", () => {
    const results = generateCombo("combo-standard").map((s) => runDesign({ support: s }));
    const csv = buildCalculationCsv(results);
    expect(csv).toContain("supportId,category,item,value,unit,note");
    expect(csv.split("\n").length).toBeGreaterThan(10);
    expect(csv).toContain("HOLD");
  });
});

describe("buildCalculationJson", () => {
  it("serializes results with trace", () => {
    const support = generateCombo("combo-standard")[1];
    const result = runDesign({ support });
    const json = buildCalculationJson([result]);
    const parsed = JSON.parse(json);
    expect(parsed[0].supportId).toBe("P1");
    expect(parsed[0].status).toBe("hold_not_available");
  });
});

describe("summarizeStatuses / checkStatusLabel", () => {
  it("counts statuses (all HOLD in framework mode)", () => {
    const results = generateCombo("combo-standard").map((s) => runDesign({ support: s }));
    const summary = summarizeStatuses(results);
    expect(summary.total).toBe(4);
    expect(summary.hold).toBe(4);
    expect(summary.ok).toBe(0);
    expect(summary.ng).toBe(0);
  });

  it("labels checks OK/NG/HOLD", () => {
    const support = generateCombo("combo-standard")[1];
    const result = runDesign({ support });
    expect(checkStatusLabel(result.checks[0])).toBe("HOLD");
  });
});
