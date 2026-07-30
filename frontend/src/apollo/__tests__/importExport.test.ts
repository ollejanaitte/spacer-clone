import { describe, expect, it } from "vitest";
import { createApollo200mContinuousBridgeSample } from "../sampleProjects";
import {
  decodeApolloImportText,
  exportApolloProjectToText,
  importApolloProjectFromText,
} from "../importExport";
import { getApolloPhase1Unit2Draft } from "../unit2Draft";

describe("importExport", () => {
  it("strips UTF-8 BOM and preserves Japanese string fidelity on round-trip", () => {
    const project = createApollo200mContinuousBridgeSample();
    if (project.apolloPhase1Unit2) {
      project.apolloPhase1Unit2.metadata.name = "Ａ１橋梁";
      project.apolloPhase1Unit2.nodes[0]!.label = "主桁Ｇ１";
    }

    const exported = exportApolloProjectToText(project);
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;

    const bomPrefixed = `\uFEFF${exported.content}`;
    const imported = importApolloProjectFromText(bomPrefixed);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;

    const draft = getApolloPhase1Unit2Draft(imported.project);
    expect(draft.metadata.name).toBe("Ａ１橋梁");
    expect(draft.nodes[0]!.label).toBe("主桁Ｇ１");
  });

  it("rejects UTF-16 encoded bytes fail-closed", () => {
    const utf16 = new Uint8Array([0xff, 0xfe, 0x7b, 0x00, 0x7d, 0x00]);
    const decoded = decodeApolloImportText(utf16);
    expect(decoded.ok).toBe(false);
    if (!decoded.ok) {
      expect(decoded.diagnostics.join(" ")).toContain("UTF-16");
    }
  });

  it("rejects missing Apollo sidecar without mutating the active draft", () => {
    const project = createApollo200mContinuousBridgeSample();
    const exported = exportApolloProjectToText(project);
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;

    const parsed = JSON.parse(exported.content) as Record<string, unknown>;
    delete parsed.apolloPhase1Unit2;
    const result = importApolloProjectFromText(JSON.stringify(parsed));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics.join(" ")).toContain("apolloPhase1Unit2");
    }
  });

  it("rejects duplicate ids and broken references fail-closed", () => {
    const project = createApollo200mContinuousBridgeSample();
    const exported = exportApolloProjectToText(project);
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;

    const duplicate = JSON.parse(exported.content) as Record<string, unknown>;
    const sidecar = duplicate.apolloPhase1Unit2 as Record<string, unknown>;
    const nodes = sidecar.nodes as Array<Record<string, unknown>>;
    nodes.push({ ...nodes[0] });
    const duplicateResult = importApolloProjectFromText(JSON.stringify(duplicate));
    expect(duplicateResult.ok).toBe(false);

    const broken = JSON.parse(exported.content) as Record<string, unknown>;
    const brokenSidecar = broken.apolloPhase1Unit2 as Record<string, unknown>;
    const members = brokenSidecar.members as Array<Record<string, unknown>>;
    members[0] = { ...members[0], materialRefId: "MISSING-MATERIAL" };
    const brokenResult = importApolloProjectFromText(JSON.stringify(broken));
    expect(brokenResult.ok).toBe(false);
    if (!brokenResult.ok) {
      expect(brokenResult.diagnostics.join(" ")).toMatch(/material|reference/i);
    }
  });

  it("rejects unknown Apollo sidecar fields fail-closed", () => {
    const project = createApollo200mContinuousBridgeSample();
    const exported = exportApolloProjectToText(project);
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;

    const parsed = JSON.parse(exported.content) as Record<string, unknown>;
    const sidecar = parsed.apolloPhase1Unit2 as Record<string, unknown>;
    sidecar.unsupportedField = "blocked";
    const result = importApolloProjectFromText(JSON.stringify(parsed));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics.join(" ")).toContain("unsupported field");
    }
  });
});
