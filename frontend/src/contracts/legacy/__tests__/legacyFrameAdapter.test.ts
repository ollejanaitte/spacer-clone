import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateBridgeFrameAnalysisDocument } from "../../bridgeFrameAnalysisDocument";
import { hasValidationErrors } from "../../validation";
import {
  adaptLegacyFrameInput,
  classifyLegacyInput,
  deriveStableUuid,
} from "../index";

const FIXED_CLOCK = {
  now: () => "2026-07-16T03:00:00.000Z",
};

function loadExampleProject(): Record<string, unknown> {
  const path = resolve(process.cwd(), "../examples/simple_beam_verification.json");
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Expected object project JSON.");
  }
  return {
    ...(parsed as Record<string, unknown>),
    schemaVersion: 1,
  };
}

describe("legacy frame adapter", () => {
  it("classifies ProjectModel documents", () => {
    const project = loadExampleProject();
    const classification = classifyLegacyInput(project);
    expect(classification.formatId).toBe("project-model");
    expect(classification.sourceVersion).toBe("1");
  });

  it("adapts ProjectModel to a valid BridgeFrameAnalysisDocument", () => {
    const project = loadExampleProject();
    const result = adaptLegacyFrameInput(project, { clock: FIXED_CLOCK });
    if (!result.ok) {
      expect.fail(`adapter failed: ${JSON.stringify(result.error)} diagnostics=${JSON.stringify(result.diagnostics)}`);
    }
    expect(result.document.documentKind).toBe("bridge-frame-analysis");
    expect(result.document.schemaVersion).toBe("0.1.0");
    expect(result.document.structuralModel.nodes.length).toBe(2);
    expect(result.document.structuralModel.members.length).toBeGreaterThan(0);
    expect(result.document.extensions?.["spacer.legacy/project-model-mechanics"]).toBeDefined();
    expect(result.document.unitContext.moment).toBe("kN·m");
    expect(result.document.unitContext.modulus).toBe("kPa");
    expect(hasValidationErrors(validateBridgeFrameAnalysisDocument(result.document))).toBe(
      false,
    );
  });

  it("is deterministic for identical inputs", () => {
    const project = loadExampleProject();
    const first = adaptLegacyFrameInput(project, { clock: FIXED_CLOCK });
    const second = adaptLegacyFrameInput(project, { clock: FIXED_CLOCK });
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) {
      return;
    }
    expect(first.document).toEqual(second.document);
  });

  it("does not mutate the input object", () => {
    const project = loadExampleProject();
    const before = structuredClone(project);
    const result = adaptLegacyFrameInput(project, { clock: FIXED_CLOCK });
    expect(result.ok).toBe(true);
    expect(project).toEqual(before);
  });

  it("rejects missing top-level schemaVersion", () => {
    const project = loadExampleProject();
    delete project.schemaVersion;
    const result = adaptLegacyFrameInput(project);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("missing-version");
  });

  it("rejects unsupported schemaVersion", () => {
    const project = { ...loadExampleProject(), schemaVersion: 99 };
    const result = adaptLegacyFrameInput(project);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("unsupported-version");
  });

  it("rejects mixed liner ownership", () => {
    const project = {
      ...loadExampleProject(),
      liner: {
        schemaVersion: "0.1.0",
        sourceRevision: "x",
        linerModelId: "y",
        coordinatePolicyId: "z",
        intermediateSchemaVersion: "0.2.0",
      },
    };
    const result = adaptLegacyFrameInput(project);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("mixed-ownership");
  });

  it("rejects ambiguous units", () => {
    const project = loadExampleProject();
    const units = project.units as Record<string, unknown>;
    const result = adaptLegacyFrameInput({
      ...project,
      units: { ...units, moment: "mystery-unit" },
    });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("ambiguous-unit");
  });

  it("rejects unresolved member references", () => {
    const project = loadExampleProject();
    const members = structuredClone(project.members) as Array<Record<string, unknown>>;
    members[0] = { ...members[0]!, nodeJ: "MISSING" };
    const result = adaptLegacyFrameInput({ ...project, members });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("unresolved-reference");
  });

  it("rejects zero-length members", () => {
    const project = loadExampleProject();
    const members = structuredClone(project.members) as Array<Record<string, unknown>>;
    members[0] = { ...members[0]!, nodeJ: members[0]!.nodeI };
    const result = adaptLegacyFrameInput({ ...project, members });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("invalid-shape");
  });

  it("preserves stable node ids deterministically", () => {
    const project = loadExampleProject();
    const result = adaptLegacyFrameInput(project, { clock: FIXED_CLOCK });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const nodes = project.nodes as Array<{ id: string }>;
    expect(result.document.structuralModel.nodes[0]?.entityId).toBe(
      deriveStableUuid("legacy.frame.node", nodes[0]!.id),
    );
  });
});
