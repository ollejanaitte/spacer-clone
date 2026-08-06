import { describe, expect, it } from "vitest";
import type { ProjectModel } from "../../types";
import { createDefaultProject } from "../../data/defaultProject";
import {
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
} from "../bridgeStructure";
import { fillContinuousBridgeStructureInput, fillSimpleSingleBridgeStructureInput } from "../testing/bridgeStructureFixtures";
import { EMITTED_CHAPTER_IDS, FORBIDDEN_CHAPTER_IDS, type CanonicalReportChapter, type ContinuousReportModel } from "../report/reportModelTypes";
import { buildContinuousReportModel, continuousReportModelToJson } from "../report/reportModelContinuous";
import { assertReportModelValid, validateReportModel } from "../report/reportModelValidator";

function generate(project: ProjectModel): ProjectModel {
  const draft = getBridgeStructureInputDraft(project);
  const result = generateBridgeStructureFromInput(project, draft);
  if (!result.ok) throw new Error(result.diagnostics.join("; "));
  return result.project;
}

function cleanContinuous(): ContinuousReportModel {
  return buildContinuousReportModel(generate(fillContinuousBridgeStructureInput(createDefaultProject())));
}

function clone(model: ContinuousReportModel): ContinuousReportModel {
  return JSON.parse(continuousReportModelToJson(model)) as unknown as ContinuousReportModel;
}

function mutate(model: ContinuousReportModel, fn: (m: ContinuousReportModel) => void): ContinuousReportModel {
  const copy = clone(model);
  fn(copy);
  return copy;
}

describe("validateReportModel: continuous report (Phase 4-D)", () => {
  it("validates a clean CONTINUOUS model — valid === true, no errors", () => {
    const model = cleanContinuous();
    const result = validateReportModel(model);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
    expect(() => assertReportModelValid(model)).not.toThrow();
  });

  it("emits exactly the canonical CP-* chapter set (regression for VR-03/VR-09)", () => {
    const model = cleanContinuous();
    const ids = model.chapters.map((c) => c.id);
    expect(ids).toEqual(EMITTED_CHAPTER_IDS);
    expect(ids.some((id) => id.startsWith("CH-"))).toBe(false);
    for (const forbidden of FORBIDDEN_CHAPTER_IDS) expect(ids).not.toContain(forbidden);
  });

  it("validates a SIMPLE_SINGLE model — CP-13 has computed section, not NOT_AVAILABLE", () => {
    const model = buildContinuousReportModel(
      generate(fillSimpleSingleBridgeStructureInput(createDefaultProject())),
    );
    const result = validateReportModel(model);
    expect(result.valid).toBe(true);
    const cp13 = model.chapters.find((c) => c.id === "CP-13")!.summary[0]!;
    expect(cp13.value).not.toBe("NOT_AVAILABLE");
  });

  it("VR-01: missing metadata -> error", () => {
    const bad = mutate(cleanContinuous(), (m) => {
      (m as { reportId: string }).reportId = undefined as unknown as string;
      (m as { inputChecksum: string }).inputChecksum = undefined as unknown as string;
    });
    const r = validateReportModel(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.some((x) => x.startsWith("VR-01"))).toBe(true);
  });

  it("VR-02: duplicate chapter -> error", () => {
    const bad = mutate(cleanContinuous(), (m) => {
      const cp01 = m.chapters.find((c) => c.id === "CP-01")!;
      (m.chapters as CanonicalReportChapter[]).push(cp01);
    });
    const r = validateReportModel(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.some((x) => x.startsWith("VR-02"))).toBe(true);
  });

  it("VR-03: unknown + CH-* chapter -> error", () => {
    const bad = mutate(cleanContinuous(), (m) => {
      const ghost: CanonicalReportChapter = {
        id: "CH-COVER" as never,
        summary: [],
      };
      const orphan = { id: "CP-99", summary: [] } as unknown as CanonicalReportChapter;
      (m.chapters as CanonicalReportChapter[]).push(ghost, orphan);
    });
    const r = validateReportModel(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.some((x) => x.startsWith("VR-03"))).toBe(true);
  });

  it("VR-04: unknown status -> error", () => {
    const bad = mutate(cleanContinuous(), (m) => {
      const cp05 = (m.chapters.find((c) => c.id === "CP-05") as unknown as { summary: Array<{ status: string }> }).summary[0];
      cp05.status = "GARBAGE_STATUS";
    });
    const r = validateReportModel(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.some((x) => x.startsWith("VR-04"))).toBe(true);
  });

  it("VR-05: unknown authorizationStatus -> error", () => {
    const bad = mutate(cleanContinuous(), (m) => {
      const cp05 = (m.chapters.find((c) => c.id === "CP-05") as unknown as { summary: Array<{ authorizationStatus: string }> }).summary[0];
      cp05.authorizationStatus = "GARBAGE_AUTH";
    });
    const r = validateReportModel(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.some((x) => x.startsWith("VR-05"))).toBe(true);
  });

  it("VR-06: PROHIBITED value -> error", () => {
    const bad = mutate(cleanContinuous(), (m) => {
      const cp05 = (m.chapters.find((c) => c.id === "CP-05") as unknown as { summary: Array<{ value: string }> }).summary[0];
      cp05.value = "PROHIBITED";
    });
    const r = validateReportModel(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.some((x) => x.startsWith("VR-06"))).toBe(true);
  });

  it("VR-08: CONTINUOUS CP-13 must be NOT_AVAILABLE -> error otherwise", () => {
    const bad = mutate(cleanContinuous(), (m) => {
      const cp13 = m.chapters.find((c) => c.id === "CP-13") as unknown as { summary: Array<{ value: string; missingReason: string | null }> };
      cp13.summary[0].value = "1.2000";
      cp13.summary[0].missingReason = null;
    });
    const r = validateReportModel(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.some((x) => x.startsWith("VR-08"))).toBe(true);
  });

  it("VR-09: forbidden chapter CP-08 -> error", () => {
    const bad = mutate(cleanContinuous(), (m) => {
      const cp08: CanonicalReportChapter = { id: "CP-08" as never, summary: [] };
      (m.chapters as CanonicalReportChapter[]).push(cp08);
    });
    const r = validateReportModel(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.some((x) => x.startsWith("VR-09"))).toBe(true);
  });

  it("VR-13: invalid generatedAt -> error", () => {
    const bad = mutate(cleanContinuous(), (m) => {
      (m as { generatedAt: string }).generatedAt = "not-a-timestamp";
    });
    const r = validateReportModel(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.some((x) => x.startsWith("VR-13"))).toBe(true);
  });

  it("VR-15: formalOkNgEmitted true -> error", () => {
    const bad = mutate(cleanContinuous(), (m) => {
      (m.audit as unknown as { formalOkNgEmitted: boolean }).formalOkNgEmitted = true;
    });
    const r = validateReportModel(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.some((x) => x.startsWith("VR-15"))).toBe(true);
  });

  it("VR-16: authorizationStatus not NOT_GRANTED -> error", () => {
    const bad = mutate(cleanContinuous(), (m) => {
      (m as unknown as { authorizationStatus: string }).authorizationStatus = "NOT_AUTHORIZED";
    });
    const r = validateReportModel(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.some((x) => x.startsWith("VR-16"))).toBe(true);
  });

  it("VR-17: designOrConstructionUse not PROHIBITED -> error", () => {
    const bad = mutate(cleanContinuous(), (m) => {
      (m as unknown as { designOrConstructionUse: string }).designOrConstructionUse = "DEVELOPMENT";
    });
    const r = validateReportModel(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.some((x) => x.startsWith("VR-17"))).toBe(true);
  });

  it("assertReportModelValid throws on a tampered model (fail-closed)", () => {
    const bad = mutate(cleanContinuous(), (m) => {
      (m as { reportId: string }).reportId = "bogus";
    });
    expect(() => assertReportModelValid(bad)).toThrow(/ReportModel validation failed/);
  });
});
