import { describe, expect, it } from "vitest";
import { DEFAULT_SEMANTIC_TOLERANCE } from "../tolerance";
import {
  canonicalizeParityReportEnvelope,
  createParityReportEnvelope,
  PARITY_REPORT_ENVELOPE_SCHEMA_VERSION,
  serializeParityReportEnvelope,
} from "../serializer";
import type {
  AmbiguousMatch,
  ParityMismatch,
  ParityReport,
  ParityReportEnvelope,
  SemanticParityDiagnostic,
  UnmatchedItem,
} from "../types";

function emptyGeometryMetrics() {
  return {
    nodeCount: 0,
    memberCount: 0,
    boundingBox: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 0, y: 0, z: 0 },
    },
    centroid: { x: 0, y: 0, z: 0 },
    memberLengths: {
      min: 0,
      max: 0,
      mean: 0,
      total: 0,
      count: 0,
    },
  };
}

function emptyTopologyMetrics() {
  return {
    degreeHistogram: {},
    isolatedNodeCount: 0,
    connectedComponentCount: 1,
    connectedComponentSizes: [0],
    parallelEdgeCandidateCount: 0,
    selfLoopCandidateCount: 0,
  };
}

function emptyStructuralValidationSummary() {
  return {
    valid: true,
    isolatedNodeCount: 0,
    disconnectedComponentCount: 0,
    zeroLengthMemberCount: 0,
    selfLoopCount: 0,
    missingEndpointCount: 0,
    nonFiniteGeometryCount: 0,
  };
}

function createMinimalReport(overrides: Partial<ParityReport> = {}): ParityReport {
  const status = overrides.status ?? "equivalent";
  return {
    status,
    tolerance: DEFAULT_SEMANTIC_TOLERANCE,
    counts: {
      left: { nodes: 0, members: 0, supports: 0, sections: 0 },
      right: { nodes: 0, members: 0, supports: 0, sections: 0 },
      matched: { nodes: 0, members: 0 },
    },
    unmatchedLeft: [],
    unmatchedRight: [],
    mismatches: [],
    ambiguities: [],
    warnings: [],
    errors: [],
    metrics: {
      geometry: {
        left: emptyGeometryMetrics(),
        right: emptyGeometryMetrics(),
        equivalent: true,
      },
      topology: {
        left: emptyTopologyMetrics(),
        right: emptyTopologyMetrics(),
        equivalent: true,
      },
      structuralValidation: {
        left: emptyStructuralValidationSummary(),
        right: emptyStructuralValidationSummary(),
      },
      support: {
        matchedSupportCount: 0,
        unmatchedLeftCount: 0,
        unmatchedRightCount: 0,
        fixityMismatchCount: 0,
        ambiguousNodeCount: 0,
      },
      property: {
        comparedMemberCount: 0,
        sectionMismatchCount: 0,
        materialMismatchCount: 0,
        orientationMismatchCount: 0,
        orientationOppositeCount: 0,
        skippedUndefinedCount: 0,
      },
    },
    summary: {
      status,
      matchedNodes: 0,
      matchedMembers: 0,
      unmatchedLeft: 0,
      unmatchedRight: 0,
      mismatchCount: 0,
      ambiguityCount: 0,
      warningCount: 0,
      errorCount: 0,
      geometryEquivalent: true,
      topologyEquivalent: true,
      structurallyValid: true,
      supportEquivalent: true,
      propertyEquivalent: true,
    },
    ...overrides,
  };
}

function createEnvelope(report: ParityReport, overrides: Partial<ParityReportEnvelope> = {}): ParityReportEnvelope {
  return createParityReportEnvelope(report, {
    sources: {
      left: { source: "legacy", label: "legacy-model" },
      right: { source: "bridgeDefinition", label: "bd-model" },
    },
    generatedAt: "2026-07-11T12:00:00.000Z",
    toolVersion: "test-serializer",
    ...overrides,
  });
}

function mismatch(partial: Partial<ParityMismatch> & Pick<ParityMismatch, "path">): ParityMismatch {
  return {
    category: "geometry",
    leftValue: 1,
    rightValue: 2,
    severity: "error",
    message: partial.path,
    ...partial,
  };
}

function diagnostic(partial: Partial<SemanticParityDiagnostic> & Pick<SemanticParityDiagnostic, "path">): SemanticParityDiagnostic {
  return {
    category: "topology",
    severity: "warning",
    code: partial.path.toUpperCase(),
    message: partial.path,
    ...partial,
  };
}

describe("parity report serializer", () => {
  it("serializes the same report byte-identically every time", () => {
    const envelope = createEnvelope(createMinimalReport());
    const first = serializeParityReportEnvelope(envelope);
    const second = serializeParityReportEnvelope(envelope);

    expect(first).toBe(second);
    expect(first).toBe(serializeParityReportEnvelope(envelope));
  });

  it("serializes mismatches identically regardless of input order", () => {
    const ordered = createEnvelope(createMinimalReport({
      mismatches: [
        mismatch({ category: "geometry", path: "geometry/a", severity: "error", message: "a" }),
        mismatch({ category: "node", path: "nodes/b", severity: "warning", message: "b" }),
      ],
    }));
    const reversed = createEnvelope(createMinimalReport({
      mismatches: [
        mismatch({ category: "node", path: "nodes/b", severity: "warning", message: "b" }),
        mismatch({ category: "geometry", path: "geometry/a", severity: "error", message: "a" }),
      ],
    }));

    expect(serializeParityReportEnvelope(ordered)).toBe(serializeParityReportEnvelope(reversed));
  });

  it("serializes warnings and errors identically regardless of input order", () => {
    const ordered = createEnvelope(createMinimalReport({
      warnings: [
        diagnostic({ path: "warnings/a", severity: "warning", code: "W_A" }),
        diagnostic({ path: "warnings/b", severity: "info", code: "W_B" }),
      ],
      errors: [
        diagnostic({ path: "errors/a", severity: "error", code: "E_A" }),
        diagnostic({ path: "errors/b", severity: "blocker", code: "E_B" }),
      ],
    }));
    const reversed = createEnvelope(createMinimalReport({
      warnings: [
        diagnostic({ path: "warnings/b", severity: "info", code: "W_B" }),
        diagnostic({ path: "warnings/a", severity: "warning", code: "W_A" }),
      ],
      errors: [
        diagnostic({ path: "errors/b", severity: "blocker", code: "E_B" }),
        diagnostic({ path: "errors/a", severity: "error", code: "E_A" }),
      ],
    }));

    expect(serializeParityReportEnvelope(ordered)).toBe(serializeParityReportEnvelope(reversed));
  });

  it("serializes identically regardless of object key insertion order", () => {
    const report = createMinimalReport({
      counts: {
        matched: { members: 0, nodes: 0 },
        right: { sections: 0, supports: 0, members: 0, nodes: 0 },
        left: { nodes: 0, members: 0, supports: 0, sections: 0 },
      },
    });
    const envelopeA = createParityReportEnvelope(report, {
      sources: {
        right: { label: "bd-model", source: "bridgeDefinition" },
        left: { label: "legacy-model", source: "legacy" },
      },
      generatedAt: "2026-07-11T12:00:00.000Z",
      toolVersion: "test-serializer",
    });
    const envelopeB = createParityReportEnvelope(report, {
      sources: {
        left: { source: "legacy", label: "legacy-model" },
        right: { source: "bridgeDefinition", label: "bd-model" },
      },
      toolVersion: "test-serializer",
      generatedAt: "2026-07-11T12:00:00.000Z",
    });

    expect(serializeParityReportEnvelope(envelopeA)).toBe(serializeParityReportEnvelope(envelopeB));
  });

  it("serializes negative zero as zero", () => {
    const envelope = createEnvelope(createMinimalReport({
      mismatches: [
        mismatch({
          path: "geometry/delta",
          delta: -0,
          leftValue: -0,
          rightValue: 0,
        }),
      ],
    }));

    const parsed = JSON.parse(serializeParityReportEnvelope(envelope)) as ParityReportEnvelope;
    const serializedMismatch = parsed.report.mismatches[0];

    expect(serializedMismatch.delta).toBe(0);
    expect(Object.is(serializedMismatch.delta, -0)).toBe(false);
    expect(serializedMismatch.leftValue).toBe(0);
    expect(Object.is(serializedMismatch.leftValue as number, -0)).toBe(false);
  });

  it("allows generatedAt to be fixed for golden output", () => {
    const envelope = createEnvelope(createMinimalReport(), {
      generatedAt: "2026-07-11T00:00:00.000Z",
    });

    const serialized = serializeParityReportEnvelope(envelope, {
      generatedAt: "2026-07-11T12:34:56.000Z",
    });

    expect(serialized).toContain("\"generatedAt\":\"2026-07-11T12:34:56.000Z\"");
    expect(envelope.generatedAt).toBe("2026-07-11T00:00:00.000Z");
  });

  it("rejects NaN values", () => {
    const envelope = createEnvelope(createMinimalReport({
      mismatches: [mismatch({ path: "geometry/nan", delta: Number.NaN })],
    }));

    expect(() => serializeParityReportEnvelope(envelope)).toThrow(/Non-finite number/);
  });

  it("rejects Infinity values", () => {
    const envelope = createEnvelope(createMinimalReport({
      mismatches: [mismatch({ path: "geometry/inf", leftValue: Number.POSITIVE_INFINITY })],
    }));

    expect(() => serializeParityReportEnvelope(envelope)).toThrow(/Non-finite number/);
  });

  it("parses compact and pretty output to the same object", () => {
    const envelope = createEnvelope(createMinimalReport({
      mismatches: [
        mismatch({ category: "node", path: "nodes/x", severity: "error", message: "x" }),
        mismatch({ category: "geometry", path: "geometry/y", severity: "warning", message: "y" }),
      ],
    }));

    const compact = JSON.parse(serializeParityReportEnvelope(envelope));
    const pretty = JSON.parse(serializeParityReportEnvelope(envelope, { pretty: true }));

    expect(pretty).toEqual(compact);
  });

  it("preserves schemaVersion", () => {
    const envelope = createEnvelope(createMinimalReport(), {
      schemaVersion: "1.0.0",
    });

    const parsed = JSON.parse(serializeParityReportEnvelope(envelope)) as ParityReportEnvelope;
    expect(parsed.schemaVersion).toBe("1.0.0");
    expect(PARITY_REPORT_ENVELOPE_SCHEMA_VERSION).toBe("1.0.0");
  });

  it("preserves source metadata", () => {
    const envelope = createEnvelope(createMinimalReport());

    const parsed = JSON.parse(serializeParityReportEnvelope(envelope)) as ParityReportEnvelope;
    expect(parsed.sources.left).toEqual({ source: "legacy", label: "legacy-model" });
    expect(parsed.sources.right).toEqual({ source: "bridgeDefinition", label: "bd-model" });
  });

  it("preserves extended source metadata including generatorRoute and metadata", () => {
    const envelope = createParityReportEnvelope(createMinimalReport(), {
      sources: {
        left: {
          source: "legacy",
          label: "legacy-model",
          generatorRoute: "liner-bridge",
          metadata: {
            spanCount: 2,
            trace: ["import", "normalize"],
            nested: { units: "metric", revision: 1 },
          },
        },
        right: {
          source: "bridgeDefinition",
          label: "bd-model",
          generatorRoute: "structural-model",
          metadata: {
            schemaVersion: "1.0.0",
            flags: { validated: true },
          },
        },
      },
      generatedAt: "2026-07-11T12:00:00.000Z",
      toolVersion: "test-serializer",
    });

    const parsed = JSON.parse(serializeParityReportEnvelope(envelope)) as ParityReportEnvelope;
    expect(parsed.sources.left).toEqual({
      source: "legacy",
      label: "legacy-model",
      generatorRoute: "liner-bridge",
      metadata: {
        spanCount: 2,
        trace: ["import", "normalize"],
        nested: { units: "metric", revision: 1 },
      },
    });
    expect(parsed.sources.right).toEqual({
      source: "bridgeDefinition",
      label: "bd-model",
      generatorRoute: "structural-model",
      metadata: {
        schemaVersion: "1.0.0",
        flags: { validated: true },
      },
    });
  });

  it("serializes source metadata identically regardless of metadata key insertion order", () => {
    const report = createMinimalReport();
    const envelopeA = createParityReportEnvelope(report, {
      sources: {
        left: {
          source: "generated",
          label: "generated-left",
          generatorRoute: "from-liner",
          metadata: { z: 3, a: 1, m: { y: 2, x: 1 } },
        },
        right: {
          source: "imported",
          label: "imported-right",
          generatorRoute: "from-project",
          metadata: { beta: true, alpha: "first" },
        },
      },
      generatedAt: "2026-07-11T12:00:00.000Z",
      toolVersion: "test-serializer",
    });
    const envelopeB = createParityReportEnvelope(report, {
      sources: {
        left: {
          source: "generated",
          label: "generated-left",
          generatorRoute: "from-liner",
          metadata: { a: 1, m: { x: 1, y: 2 }, z: 3 },
        },
        right: {
          source: "imported",
          label: "imported-right",
          generatorRoute: "from-project",
          metadata: { alpha: "first", beta: true },
        },
      },
      toolVersion: "test-serializer",
      generatedAt: "2026-07-11T12:00:00.000Z",
    });

    expect(serializeParityReportEnvelope(envelopeA)).toBe(serializeParityReportEnvelope(envelopeB));
  });

  it("preserves backward-compatible sources without generatorRoute or metadata", () => {
    const envelope = createParityReportEnvelope(createMinimalReport(), {
      sources: {
        left: { source: "unknown" },
        right: { source: "liner", label: "liner-only" },
      },
      generatedAt: "2026-07-11T12:00:00.000Z",
    });

    const canonical = canonicalizeParityReportEnvelope(envelope);
    expect(canonical.sources.left).toEqual({ source: "unknown" });
    expect(canonical.sources.right).toEqual({ source: "liner", label: "liner-only" });
  });

  it("does not mutate the original report or envelope", () => {
    const report = createMinimalReport({
      mismatches: [
        mismatch({ category: "node", path: "nodes/z", severity: "error", message: "z" }),
        mismatch({ category: "geometry", path: "geometry/a", severity: "warning", message: "a" }),
      ],
      warnings: [
        diagnostic({ path: "warnings/z", code: "Z" }),
        diagnostic({ path: "warnings/a", code: "A" }),
      ],
      unmatchedLeft: [
        { side: "left", key: "z", path: "nodes/z", reason: "missing" },
        { side: "left", key: "a", path: "nodes/a", reason: "missing" },
      ] satisfies UnmatchedItem[],
      ambiguities: [
        { category: "node", leftKeys: ["b", "a"], rightKeys: ["y", "x"], message: "second" },
        { category: "member", leftKeys: ["m2"], rightKeys: ["m1"], message: "first" },
      ] satisfies AmbiguousMatch[],
    });
    const envelope = createEnvelope(report);
    const reportSnapshot = JSON.stringify(report);
    const envelopeSnapshot = JSON.stringify(envelope);

    serializeParityReportEnvelope(envelope);
    canonicalizeParityReportEnvelope(envelope);

    expect(JSON.stringify(report)).toBe(reportSnapshot);
    expect(JSON.stringify(envelope)).toBe(envelopeSnapshot);
  });
});
