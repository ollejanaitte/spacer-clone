import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import {
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
  withBridgeStructureField,
} from "../bridgeStructure";
import { fillSimpleSingleBridgeStructureInput } from "../testing/bridgeStructureFixtures";
import {
  assertIntegratedExportAllowed,
  buildIntegratedOutputs,
} from "../output/outputIntegration";

function generated() {
  let project = fillSimpleSingleBridgeStructureInput(createDefaultProject());
  project = withBridgeStructureField(project, "steelUnitWeight", 77);
  const g = generateBridgeStructureFromInput(project, getBridgeStructureInputDraft(project));
  if (!g.ok) throw new Error(g.diagnostics.join("; "));
  return g.project;
}

describe("outputIntegration", () => {
  it("aligns checksums across quantity/report/drawing", () => {
    const outputs = buildIntegratedOutputs(generated());
    expect(outputs.consistency.inputChecksumAligned).toBe(true);
    expect(outputs.consistency.overall).toBe("PASS");
    expect(outputs.statuses.formalReport).toBe("NOT_AUTHORIZED");
    expect(outputs.warnings.join(" ")).toMatch(/NOT_GRANTED/);
    assertIntegratedExportAllowed(outputs);
  });

  it("rejects STALE export after edit", () => {
    const stale = withBridgeStructureField(generated(), "girderCount", 5);
    const outputs = buildIntegratedOutputs(stale);
    expect(outputs.stale).toBe(true);
    expect(outputs.statuses.quantity).toBe("STALE");
    expect(() => assertIntegratedExportAllowed(outputs)).toThrow(/STALE/);
  });
});
