import { describe, expect, it } from "vitest";
import { createSampleImporterProject } from "../../../liner/importer/__tests__/fixtures/sampleProject";
import { validateRoadDesignDocument } from "../../roadDesignDocument";
import { hasValidationErrors } from "../../validation";
import {
  adaptLegacyRoadInput,
  classifyLegacyInput,
  deriveStableUuid,
} from "../index";

const FIXED_CLOCK = {
  now: () => "2026-07-16T03:00:00.000Z",
};

describe("legacy road adapter", () => {
  it("classifies JIP LINER importer projects", () => {
    const sample = createSampleImporterProject();
    const classification = classifyLegacyInput(sample);
    expect(classification.formatId).toBe("jip-liner-importer");
    expect(classification.sourceVersion).toBe("0.1.0");
  });

  it("adapts importer project to a valid RoadDesignDocument", () => {
    const sample = createSampleImporterProject();
    const result = adaptLegacyRoadInput(sample, { clock: FIXED_CLOCK });
    if (!result.ok) {
      expect.fail(`adapter failed: ${JSON.stringify(result.error)} diagnostics=${JSON.stringify(result.diagnostics)}`);
    }
    expect(result.document.documentKind).toBe("road-design");
    expect(result.document.schemaVersion).toBe("0.1.0");
    expect(result.document.bridges.length).toBe(1);
    expect(result.document.coordinateContexts[0]?.confidenceStatus).toBe("unknown");
    expect(result.document.profiles[0]?.label).toContain("vertical");
    expect(result.document.crossSections[0]?.label).toContain("CrossSlope @");
    expect(result.document.extensions?.["spacer.legacy/jip-liner-importer-geometry"]).toBeDefined();
    expect(hasValidationErrors(validateRoadDesignDocument(result.document))).toBe(false);
  });

  it("is deterministic for identical inputs", () => {
    const sample = createSampleImporterProject();
    const first = adaptLegacyRoadInput(sample, { clock: FIXED_CLOCK });
    const second = adaptLegacyRoadInput(sample, { clock: FIXED_CLOCK });
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) {
      return;
    }
    expect(first.document).toEqual(second.document);
    expect(first.idMappings).toEqual(second.idMappings);
  });

  it("does not mutate the input object", () => {
    const sample = createSampleImporterProject();
    const before = structuredClone(sample);
    const result = adaptLegacyRoadInput(sample, { clock: FIXED_CLOCK });
    expect(result.ok).toBe(true);
    expect(sample).toEqual(before);
  });

  it("rejects missing importer schema version", () => {
    const sample = createSampleImporterProject() as unknown as {
      liner: { importerSchemaVersion?: string };
    };
    delete sample.liner.importerSchemaVersion;
    const result = adaptLegacyRoadInput(sample);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("missing-version");
  });

  it("rejects unsupported importer schema version", () => {
    const sample = createSampleImporterProject();
    const mutated = {
      ...sample,
      liner: { importerSchemaVersion: "9.9.9" as typeof sample.liner.importerSchemaVersion },
    };
    const result = adaptLegacyRoadInput(mutated);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("unsupported-version");
  });

  it("rejects non-meter coordinate units", () => {
    const sample = createSampleImporterProject();
    const mutated = {
      ...sample,
      coordinateSystem: {
        ...sample.coordinateSystem,
        horizontal: {
          ...sample.coordinateSystem.horizontal,
          unit: "ft" as typeof sample.coordinateSystem.horizontal.unit,
        },
      },
    };
    const result = adaptLegacyRoadInput(mutated);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("ambiguous-coordinate");
  });

  it("rejects unresolved girderLineSet references", () => {
    const sample = createSampleImporterProject();
    const bridge = sample.bridges[0]!;
    const mutated = {
      ...sample,
      bridges: [
        {
          ...bridge,
          spans: [
            {
              ...bridge.spans[0]!,
              girderLineSetId: "missing-set",
            },
          ],
        },
      ],
    };
    const result = adaptLegacyRoadInput(mutated);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("unresolved-reference");
  });

  it("rejects unsupported formats", () => {
    const result = adaptLegacyRoadInput({ schemaVersion: 1, nodes: [] });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("unsupported-format");
  });

  it("preserves stable ids via deterministic derivation", () => {
    const sample = createSampleImporterProject();
    const result = adaptLegacyRoadInput(sample, { clock: FIXED_CLOCK });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.document.documentId).toBe(
      deriveStableUuid("legacy.road.document", sample.id),
    );
    expect(result.document.bridges[0]?.entityId).toBe(
      deriveStableUuid("legacy.road.bridge", sample.bridges[0]!.id),
    );
  });
});
