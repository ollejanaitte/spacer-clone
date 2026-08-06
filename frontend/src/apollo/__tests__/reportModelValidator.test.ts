import { describe, expect, it } from "vitest";
import type { ProjectModel } from "../../types";
import { createDefaultProject } from "../../data/defaultProject";
import {
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
} from "../bridgeStructure";
import { fillContinuousBridgeStructureInput, fillSimpleSingleBridgeStructureInput } from "../testing/bridgeStructureFixtures";
import {
  buildContinuousReportModel,
  continuousReportModelToJson,
} from "../report/reportModelContinuous";
import { assertReportModelValid, validateReportModel } from "../report/reportModelValidator";
import type {
  CanonicalReportChapter,
  CanonicalReportRow,
  ContinuousReportModel,
} from "../report/reportModelTypes";

function generate(project: ProjectModel): ProjectModel {
  const draft = getBridgeStructureInputDraft(project);
  const result = generateBridgeStructureFromInput(project, draft);
  if (!result.ok) throw new Error(result.diagnostics.join("; "));
  return result.project;
}

function cleanContinuous(): ContinuousReportModel {
  return buildContinuousReportModel(generate(fillContinuousBridgeStructureInput(createDefaultProject())));
}

function cleanSimple(): ContinuousReportModel {
  return buildContinuousReportModel(generate(fillSimpleSingleBridgeStructureInput(createDefaultProject())));
}

function clone(model: ContinuousReportModel): ContinuousReportModel {
  return JSON.parse(continuousReportModelToJson(model)) as unknown as ContinuousReportModel;
}

function mutate(model: ContinuousReportModel, fn: (m: ContinuousReportModel) => void): ContinuousReportModel {
  const copy = clone(model);
  fn(copy);
  return copy;
}

const row = (over: Partial<CanonicalReportRow> = {}): CanonicalReportRow =>
  ({
    value: "v",
    display: "v",
    unit: "m",
    status: "AVAILABLE",
    source: "draft.x",
    authorizationStatus: "NOT_AUTHORIZED",
    stale: false,
    missingReason: null,
    legacyStatus: "current",
    ...over,
  }) as CanonicalReportRow;

describe("validateReportModel (VR-01..VR-26, frozen 12_report_model_validation_rules.md)", () => {
  it("clean CONTINUOUS model is valid (VR-01..26 pass)", () => {
    const model = cleanContinuous();
    const r = validateReportModel(model);
    expect(r.errors).toEqual([]);
    expect(r.valid).toBe(true);
    expect(() => assertReportModelValid(model)).not.toThrow();
  });

  it("clean SIMPLE_SINGLE model is valid (VR-12 not applied to SIMPLE)", () => {
    const r = validateReportModel(cleanSimple());
    expect(r.errors).toEqual([]);
    expect(r.valid).toBe(true);
  });

  it("VR-01: missing required metadata -> error", () => {
    const bad = mutate(cleanContinuous(), (m) => {
      (m as unknown as { reportId: string }).reportId = "";
      (m as unknown as { inputChecksum: string }).inputChecksum = "";
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

  it("VR-03: non-canonical chapter id -> error", () => {
    const bad = mutate(cleanContinuous(), (m) => {
      (m.chapters as CanonicalReportChapter[]).push({ id: "XX-01" as never, summary: [] });
    });
    const r = validateReportModel(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.some((x) => x.startsWith("VR-03"))).toBe(true);
  });

  it("VR-04: CH-* chapter id -> error", () => {
    const bad = mutate(cleanContinuous(), (m) => {
      (m.chapters as CanonicalReportChapter[]).push({ id: "CH-COVER" as never, summary: [] });
    });
    const r = validateReportModel(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.some((x) => x.startsWith("VR-04"))).toBe(true);
  });

  it("VR-05: unknown status / authorizationStatus -> error", () => {
    const bad = mutate(cleanContinuous(), (m) => {
      const cp05 = m.chapters.find((c) => c.id === "CP-05")!;
      const target = cp05.summary[0] as unknown as { status: string; authorizationStatus: string };
      target.status = "GARBAGE";
      target.authorizationStatus = "GARBAGE";
    });
    const r = validateReportModel(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.filter((x) => x.startsWith("VR-05")).length).toBe(2);
  });

  it("VR-06: numeric value missing unit -> error", () => {
    const bad = mutate(cleanContinuous(), (m) => {
      const cp05 = m.chapters.find((c) => c.id === "CP-05")!;
      const bridgeLen = cp05.summary.find((r) => r.source === "draft.bridgeLength")!;
      (bridgeLen as unknown as { unit: string }).unit = "";
    });
    const r = validateReportModel(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.some((x) => x.startsWith("VR-06"))).toBe(true);
  });

  it("VR-07: row missing source -> error", () => {
    const bad = mutate(cleanContinuous(), (m) => {
      const cp05 = m.chapters.find((c) => c.id === "CP-05")!;
      const bridgeLen = cp05.summary.find((r) => r.source === "draft.bridgeLength")!;
      (bridgeLen as unknown as { source: string }).source = "";
    });
    const r = validateReportModel(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.some((x) => x.startsWith("VR-07"))).toBe(true);
  });

  it("VR-08: numeric value AVAILABLE with adopted authorization -> error", () => {
    const bad = mutate(cleanContinuous(), (m) => {
      const cp05 = m.chapters.find((c) => c.id === "CP-05")!;
      const bridgeLen = cp05.summary.find((r) => r.source === "draft.bridgeLength")!;
      (bridgeLen as unknown as { authorizationStatus: string }).authorizationStatus = "ADOPTED";
    });
    const r = validateReportModel(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.some((x) => x.startsWith("VR-08"))).toBe(true);
  });

  it("VR-09: PROHIBITED value -> error", () => {
    const bad = mutate(cleanContinuous(), (m) => {
      const cp05 = m.chapters.find((c) => c.id === "CP-05")!;
      (cp05.summary[0] as unknown as { value: string; missingReason: string | null }).value = "PROHIBITED";
      (cp05.summary[0] as unknown as { missingReason: string | null }).missingReason = "PROHIBITED";
    });
    const r = validateReportModel(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.some((x) => x.startsWith("VR-09"))).toBe(true);
  });

  it("VR-10: forbidden chapter (CP-08) emitting a data value -> error", () => {
    const bad = mutate(cleanContinuous(), (m) => {
      (m.chapters as CanonicalReportChapter[]).push({
        id: "CP-08" as never,
        summary: [
          row({ value: "should-not-be-emitted", unit: "m", status: "AVAILABLE", source: "src", authorizationStatus: "NOT_AUTHORIZED", stale: false, missingReason: null, legacyStatus: "current" }),
        ],
      });
    });
    const r = validateReportModel(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.some((x) => x.startsWith("VR-10"))).toBe(true);
  });

  it("VR-12: CONTINUOUS CP-13 must be NOT_AVAILABLE -> error otherwise", () => {
    const bad = mutate(cleanContinuous(), (m) => {
      const cp13 = m.chapters.find((c) => c.id === "CP-13")!;
      (cp13.summary[0] as unknown as { value: string; missingReason: string | null }).value = "1.5000";
      (cp13.summary[0] as unknown as { missingReason: string | null }).missingReason = null;
    });
    const r = validateReportModel(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.some((x) => x.startsWith("VR-12"))).toBe(true);
  });

  it("VR-13: missing schemaVersion on non-legacy report -> error", () => {
    const bad = mutate(cleanContinuous(), (m) => {
      (m as unknown as { metadata: { schemaVersion: string } }).metadata.schemaVersion = "";
      (m as unknown as { legacy: { legacy: boolean } }).legacy.legacy = false;
    });
    const r = validateReportModel(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.some((x) => x.startsWith("VR-13"))).toBe(true);
  });

  it("VR-14: legacyStatus inconsistent with legacy flag -> error", () => {
    const bad = mutate(cleanContinuous(), (m) => {
      (m as unknown as { legacy: { legacy: boolean; legacyStatus: string } }).legacy.legacy = true;
      (m as unknown as { legacy: { legacy: boolean; legacyStatus: string } }).legacy.legacyStatus = "current";
    });
    const r = validateReportModel(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.some((x) => x.startsWith("VR-14"))).toBe(true);
  });

  it("VR-15: summary/detail status mismatch for shared source -> error", () => {
    const bad = mutate(cleanContinuous(), (m) => {
      const cp07 = m.chapters.find((c) => c.id === "CP-07")!;
      if (cp07.detail && cp07.detail.length) {
        (cp07.detail[0] as unknown as { source: string; status: string }).source = "draft.spans.length";
        (cp07.detail[0] as unknown as { status: string }).status = "STALE";
      }
    });
    const r = validateReportModel(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.some((x) => x.startsWith("VR-15"))).toBe(true);
  });

  it("VR-16: evidence/metadata checksum mismatch -> error", () => {
    const bad = mutate(cleanContinuous(), (m) => {
      (m as unknown as { evidence: { resultChecksum: string } }).evidence.resultChecksum = "deadbeef";
    });
    const r = validateReportModel(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.some((x) => x.startsWith("VR-16"))).toBe(true);
  });

  it("VR-17: schemaVersion not in audit.schemaVersions -> error", () => {
    const bad = mutate(cleanContinuous(), (m) => {
      (m as unknown as { audit: { schemaVersions: readonly string[] } }).audit.schemaVersions = [] as readonly string[];
    });
    const r = validateReportModel(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.some((x) => x.startsWith("VR-17"))).toBe(true);
  });

  it("VR-18: invalid / future generatedAt -> error", () => {
    const bad = mutate(cleanContinuous(), (m) => {
      (m as unknown as { generatedAt: string }).generatedAt = "not-a-timestamp";
    });
    const r = validateReportModel(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.some((x) => x.startsWith("VR-18"))).toBe(true);
  });

  it("VR-19: malformed commitSha -> warning (not error) in browser", () => {
    const bad = mutate(cleanContinuous(), (m) => {
      (m as unknown as { evidence: { appCommitSha: string } }).evidence.appCommitSha = "not-a-sha";
    });
    const r = validateReportModel(bad);
    expect(r.valid).toBe(true);
    expect(r.warnings.some((x) => x.startsWith("VR-19"))).toBe(true);
  });

  it("VR-20: empty report -> error", () => {
    const bad = mutate(cleanContinuous(), (m) => {
      (m as unknown as { chapters: CanonicalReportChapter[] }).chapters = [];
    });
    const r = validateReportModel(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.some((x) => x.startsWith("VR-20"))).toBe(true);
  });

  it("VR-23: designOrConstructionUse != PROHIBITED -> error", () => {
    const bad = mutate(cleanContinuous(), (m) => {
      (m as unknown as { designOrConstructionUse: string }).designOrConstructionUse = "DEVELOPMENT";
    });
    const r = validateReportModel(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.some((x) => x.startsWith("VR-23"))).toBe(true);
  });

  it("VR-24: authorizationStatus != NOT_GRANTED -> error", () => {
    const bad = mutate(cleanContinuous(), (m) => {
      (m as unknown as { authorizationStatus: string }).authorizationStatus = "NOT_AUTHORIZED";
    });
    const r = validateReportModel(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.some((x) => x.startsWith("VR-24"))).toBe(true);
  });

  it("VR-25: developmentLabel != UNVERIFIED_DEVELOPMENT_ONLY -> error", () => {
    const bad = mutate(cleanContinuous(), (m) => {
      (m as unknown as { developmentLabel: string }).developmentLabel = "FORMAL";
    });
    const r = validateReportModel(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.some((x) => x.startsWith("VR-25"))).toBe(true);
  });

  it("VR-26: formalOkNgEmitted != false -> error", () => {
    const bad = mutate(cleanContinuous(), (m) => {
      (m as unknown as { audit: { formalOkNgEmitted: boolean } }).audit.formalOkNgEmitted = true;
    });
    const r = validateReportModel(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.some((x) => x.startsWith("VR-26"))).toBe(true);
  });
});
