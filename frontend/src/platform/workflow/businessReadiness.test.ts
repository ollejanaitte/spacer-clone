import { describe, expect, it } from "vitest";
import {
  bindBusinessReadiness,
  isAuthoritative,
  isValueStatus,
  VALUE_STATUSES,
} from "./businessReadiness";

describe("bindBusinessReadiness", () => {
  it("surfaces all workspace sections", () => {
    const readiness = bindBusinessReadiness({ sections: {} });
    expect(readiness.sections).toHaveLength(8);
    expect(readiness.sections.map((entry) => entry.section)).toEqual([
      "overview",
      "road",
      "superstructure",
      "substructure",
      "analysis",
      "main3d",
      "deliverables",
      "data",
    ]);
  });

  it("maps unknown sections to MISSING, never auto-CONFIRMED", () => {
    const readiness = bindBusinessReadiness({ sections: {} });
    expect(readiness.statusFor("road")).toBe("MISSING");
    expect(readiness.statusFor("superstructure")).toBe("MISSING");
  });

  it("binds provided statuses verbatim", () => {
    const readiness = bindBusinessReadiness({
      sections: {
        road: "CONFIRMED",
        analysis: "NOT_AUTHORIZED",
        main3d: "INFERRED",
      },
    });
    expect(readiness.statusFor("road")).toBe("CONFIRMED");
    expect(readiness.statusFor("analysis")).toBe("NOT_AUTHORIZED");
    expect(readiness.statusFor("main3d")).toBe("INFERRED");
    expect(readiness.statusFor("substructure")).toBe("MISSING");
  });

  it("treats unknown status strings as MISSING (no fabrication)", () => {
    const readiness = bindBusinessReadiness({
      sections: { road: "bogus" as never },
    });
    expect(readiness.statusFor("road")).toBe("MISSING");
  });
});

describe("value status helpers", () => {
  it("recognizes the status vocabulary", () => {
    expect(VALUE_STATUSES).toEqual([
      "CONFIRMED",
      "DERIVED",
      "INFERRED",
      "MISSING",
      "DEFERRED",
      "NOT_AUTHORIZED",
    ]);
    expect(isValueStatus("CONFIRMED")).toBe(true);
    expect(isValueStatus("MISSING")).toBe(true);
    expect(isValueStatus("bogus")).toBe(false);
  });

  it("only CONFIRMED is authoritative", () => {
    expect(isAuthoritative("CONFIRMED")).toBe(true);
    expect(isAuthoritative("DERIVED")).toBe(false);
    expect(isAuthoritative("INFERRED")).toBe(false);
    expect(isAuthoritative("MISSING")).toBe(false);
  });
});
