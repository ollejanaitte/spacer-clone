import { describe, expect, it } from "vitest";
import type {
  FrameAnalysisResultResource,
  FrameAnalysisResultKind,
} from "../contracts";
import { evaluateIf3PrintCatalog } from "./if3PrintCatalog";

function resourceWithKinds(
  resultKinds: readonly FrameAnalysisResultKind[],
): FrameAnalysisResultResource {
  const payload = Object.fromEntries(
    resultKinds.map((kind) => [
      kind,
      {
        schemaVersion: "0.1.0",
        rows: [],
      },
    ]),
  ) as FrameAnalysisResultResource["payload"];

  return {
    resultKinds,
    payload,
  } as FrameAnalysisResultResource;
}

describe("if3PrintCatalog", () => {
  it("marks the complete linear-static PRINT catalog ready", () => {
    const catalog = evaluateIf3PrintCatalog(
      resourceWithKinds([
        "nodeDisplacement",
        "supportReaction",
        "memberForce",
      ]),
    );

    expect(catalog.ready).toBe(true);
    expect(catalog.diagnostics).toEqual([]);
    expect(catalog.entries.map(({ resultKind, status }) => ({ resultKind, status }))).toEqual([
      { resultKind: "nodeDisplacement", status: "SUPPORTED" },
      { resultKind: "supportReaction", status: "SUPPORTED" },
      { resultKind: "memberForce", status: "SUPPORTED" },
    ]);
  });

  it("diagnoses missing required payload members", () => {
    const catalog = evaluateIf3PrintCatalog(
      resourceWithKinds(["nodeDisplacement"]),
    );

    expect(catalog.ready).toBe(false);
    expect(
      catalog.entries.find((entry) => entry.resultKind === "supportReaction")
        ?.status,
    ).toBe("MISSING");
    expect(catalog.diagnostics.map((item) => item.code)).toContain(
      "PRINT_CATALOG_REQUIRED_RESULT_MISSING",
    );
  });

  it("diagnoses declared unsupported result kinds", () => {
    const catalog = evaluateIf3PrintCatalog(
      resourceWithKinds([
        "nodeDisplacement",
        "supportReaction",
        "memberForce",
        "modal",
      ]),
    );

    expect(catalog.ready).toBe(false);
    expect(
      catalog.entries.find((entry) => entry.resultKind === "modal")?.status,
    ).toBe("UNSUPPORTED");
    expect(catalog.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "PRINT_CATALOG_RESULT_KIND_UNSUPPORTED",
        resultKind: "modal",
      }),
    );
  });
});
