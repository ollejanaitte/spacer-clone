import { describe, expect, it } from "vitest";
import {
  runBasicChecks,
  withDesignCheckResults,
  CHECK_SECTION_PROPERTIES,
  CHECK_GIRDER_BENDING,
  CHECK_GIRDER_SHEAR,
  CHECK_GIRDER_DEFLECTION,
  CHECK_CROSSBEAM,
  CHECK_BEARING,
} from "../superstructureBasicChecks";
import { REFERENCE_DESIGN_CONDITIONS } from "../superstructureDesignConditions";
import type { GirderSectionModel } from "../superstructureTypes";

const SECTION: GirderSectionModel = {
  depthM: 2.0,
  webThicknessM: 0.012,
  topFlange: { widthM: 0.5, thicknessM: 0.03 },
  bottomFlange: { widthM: 0.6, thicknessM: 0.04 },
  areaM2: null,
  unitWeightPerM: null,
};

describe("Superstructure basic checks (WP-G)", () => {
  it("records SECTION-PROPERTIES as OK when section is declared", () => {
    const checks = runBasicChecks({
      girderSection: SECTION,
      girderLengthM: 40,
      maxBendingMomentKNm: 5000,
      maxShearKN: 800,
      maxDeflectionM: 0.05,
      crossBeamBendingKNm: null,
      maxReactionKN: null,
    });
    expect(checks.find((c) => c.checkId === CHECK_SECTION_PROPERTIES)?.status).toBe("OK");
  });

  it("marks section-dependent checks NOT_AVAILABLE when section is MISSING (never auto-pass)", () => {
    const checks = runBasicChecks({
      girderSection: { depthM: null, webThicknessM: null, topFlange: null, bottomFlange: null, areaM2: null, unitWeightPerM: null },
      girderLengthM: 40,
      maxBendingMomentKNm: 5000,
      maxShearKN: 800,
      maxDeflectionM: 0.05,
      crossBeamBendingKNm: null,
      maxReactionKN: null,
    });
    expect(checks.find((c) => c.checkId === CHECK_SECTION_PROPERTIES)?.status).toBe("NOT_AVAILABLE");
    expect(checks.find((c) => c.checkId === CHECK_GIRDER_BENDING)?.status).toBe("NOT_AVAILABLE");
  });

  it("evaluates girder bending OK/NG against reference allowable", () => {
    const checks = runBasicChecks({
      girderSection: SECTION,
      girderLengthM: 40,
      maxBendingMomentKNm: 5000,
      maxShearKN: 800,
      maxDeflectionM: 0.05,
      crossBeamBendingKNm: null,
      maxReactionKN: null,
    });
    expect(checks.find((c) => c.checkId === CHECK_GIRDER_BENDING)?.status).toBe("OK");
    const ngChecks = runBasicChecks({
      girderSection: SECTION,
      girderLengthM: 40,
      maxBendingMomentKNm: 100000,
      maxShearKN: 800,
      maxDeflectionM: 0.05,
      crossBeamBendingKNm: null,
      maxReactionKN: null,
    });
    expect(ngChecks.find((c) => c.checkId === CHECK_GIRDER_BENDING)?.status).toBe("NG");
  });

  it("marks bending NOT_AVAILABLE when moment is missing", () => {
    const checks = runBasicChecks({
      girderSection: SECTION,
      girderLengthM: 40,
      maxBendingMomentKNm: null,
      maxShearKN: null,
      maxDeflectionM: null,
      crossBeamBendingKNm: null,
      maxReactionKN: null,
    });
    expect(checks.find((c) => c.checkId === CHECK_GIRDER_BENDING)?.status).toBe("NOT_AVAILABLE");
    expect(checks.find((c) => c.checkId === CHECK_GIRDER_SHEAR)?.status).toBe("NOT_AVAILABLE");
    expect(checks.find((c) => c.checkId === CHECK_GIRDER_DEFLECTION)?.status).toBe("NOT_AVAILABLE");
  });

  it("evaluates shear and deflection", () => {
    const checks = runBasicChecks({
      girderSection: SECTION,
      girderLengthM: 40,
      maxBendingMomentKNm: 5000,
      maxShearKN: 800,
      maxDeflectionM: 0.05,
      crossBeamBendingKNm: null,
      maxReactionKN: null,
    });
    expect(checks.find((c) => c.checkId === CHECK_GIRDER_SHEAR)?.status).toBe("OK");
    expect(checks.find((c) => c.checkId === CHECK_GIRDER_DEFLECTION)?.status).toBe("OK");
  });

  it("marks cross beam NOT_AVAILABLE when its moment is missing (section DEFER)", () => {
    const checks = runBasicChecks({
      girderSection: SECTION,
      girderLengthM: 40,
      maxBendingMomentKNm: 5000,
      maxShearKN: 800,
      maxDeflectionM: 0.05,
      crossBeamBendingKNm: null,
      maxReactionKN: null,
    });
    expect(checks.find((c) => c.checkId === CHECK_CROSSBEAM)?.status).toBe("NOT_AVAILABLE");
  });

  it("marks bearing NOT_AVAILABLE until allowable is adopted", () => {
    expect(REFERENCE_DESIGN_CONDITIONS.bearingAllowableReactionKN).toBeNull();
    const checks = runBasicChecks({
      girderSection: SECTION,
      girderLengthM: 40,
      maxBendingMomentKNm: 5000,
      maxShearKN: 800,
      maxDeflectionM: 0.05,
      crossBeamBendingKNm: null,
      maxReactionKN: 100,
    });
    expect(checks.find((c) => c.checkId === CHECK_BEARING)?.status).toBe("NOT_AVAILABLE");
  });

  it("withDesignCheckResults keeps designStatus NOT_AUTHORIZED (auto-promotion forbidden)", () => {
    const doc = {
      designResults: { designStatus: "NOT_AUTHORIZED", checks: [], reactionResultsReference: { reactionDigest: null } },
      timestamps: { updatedAt: "2026-08-12T00:00:00.000Z", derivedAt: null },
    };
    const checks = runBasicChecks({
      girderSection: SECTION,
      girderLengthM: 40,
      maxBendingMomentKNm: 5000,
      maxShearKN: 800,
      maxDeflectionM: 0.05,
      crossBeamBendingKNm: null,
      maxReactionKN: null,
    });
    const updated = withDesignCheckResults(doc, checks);
    expect(updated.designResults.designStatus).toBe("NOT_AUTHORIZED");
    expect(updated.designResults.checks).toHaveLength(6);
  });
});
