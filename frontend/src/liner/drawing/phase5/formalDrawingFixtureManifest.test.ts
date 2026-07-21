import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  P5_D01_FORMAL_DRAWING_FIXTURE_MANIFEST,
  validatePhase5FormalDrawingFixture,
  validatePhase5FormalDrawingFixtureDocuments,
  validatePhase5FormalDrawingFixtureGate,
  validatePhase5FormalDrawingFixtureManifest,
  type Phase5FormalDrawingFixture,
} from "./formalDrawingFixtureManifest";
import { createDefaultLinerDraft } from "../../adapters/linerUiAdapter";
import { buildFormalDrawingWorkspaceDocuments } from "../formalDrawingWorkspaceDocuments";

const repoRoot = resolve(__dirname, "../../../../..");

function pathExists(path: string): boolean {
  return existsSync(resolve(repoRoot, path));
}

function withFixturePatch(
  fixtureId: string,
  patch: Partial<Phase5FormalDrawingFixture>,
) {
  return {
    ...P5_D01_FORMAL_DRAWING_FIXTURE_MANIFEST,
    fixtures: P5_D01_FORMAL_DRAWING_FIXTURE_MANIFEST.fixtures.map((fixture) =>
      fixture.fixtureId === fixtureId ? { ...fixture, ...patch } : fixture,
    ),
  };
}

describe("P5-D01 formal drawing fixture manifest", () => {
  it("keeps the authoritative manifest sorted, path-backed, and fail-closed valid", () => {
    const result = validatePhase5FormalDrawingFixtureGate(P5_D01_FORMAL_DRAWING_FIXTURE_MANIFEST, { pathExists });

    expect(result).toEqual({ ok: true, diagnostics: [] });
  });

  it("rejects duplicate fixture ids", () => {
    const first = P5_D01_FORMAL_DRAWING_FIXTURE_MANIFEST.fixtures[0]!;
    const result = validatePhase5FormalDrawingFixtureManifest({
      ...P5_D01_FORMAL_DRAWING_FIXTURE_MANIFEST,
      fixtures: [first, { ...first }],
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("P5_D01_DUPLICATE_FIXTURE_ID");
  });

  it("rejects nondeterministic fixture ordering", () => {
    const result = validatePhase5FormalDrawingFixtureManifest({
      ...P5_D01_FORMAL_DRAWING_FIXTURE_MANIFEST,
      fixtures: [...P5_D01_FORMAL_DRAWING_FIXTURE_MANIFEST.fixtures].reverse(),
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("P5_D01_FIXTURE_ORDER_UNSTABLE");
  });

  it("rejects missing source and golden paths", () => {
    const fixture = P5_D01_FORMAL_DRAWING_FIXTURE_MANIFEST.fixtures[0]!;
    const result = validatePhase5FormalDrawingFixtureManifest(
      {
        ...P5_D01_FORMAL_DRAWING_FIXTURE_MANIFEST,
        fixtures: [{ ...fixture, sourcePath: "missing.source.json", goldenPath: "missing.golden.json" }],
      },
      { pathExists },
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining(["P5_D01_MISSING_SOURCE_PATH", "P5_D01_MISSING_GOLDEN_PATH"]),
    );
  });

  it("rejects unsupported schema and payload versions", () => {
    const fixture = P5_D01_FORMAL_DRAWING_FIXTURE_MANIFEST.fixtures[0]!;
    const result = validatePhase5FormalDrawingFixtureManifest({
      ...P5_D01_FORMAL_DRAWING_FIXTURE_MANIFEST,
      fixtures: [
        {
          ...fixture,
          expectedSchemaVersion: "0.2.0" as typeof fixture.expectedSchemaVersion,
          expectedPayloadVersion: "0.3.0" as typeof fixture.expectedPayloadVersion,
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining(["P5_D01_UNSUPPORTED_SCHEMA_VERSION", "P5_D01_UNSUPPORTED_PAYLOAD_VERSION"]),
    );
  });

  it("rejects invalid tolerance, authority, status, and conventions", () => {
    const fixture = P5_D01_FORMAL_DRAWING_FIXTURE_MANIFEST.fixtures[0]!;
    const result = validatePhase5FormalDrawingFixtureManifest({
      ...P5_D01_FORMAL_DRAWING_FIXTURE_MANIFEST,
      fixtures: [
        {
          ...fixture,
          tolerance: { ...fixture.tolerance, distanceM: 0 },
          stationConvention: "unsupported" as typeof fixture.stationConvention,
          coordinateConvention: "unsupported" as typeof fixture.coordinateConvention,
          sourceAuthority: "unknown" as typeof fixture.sourceAuthority,
          status: "draft" as typeof fixture.status,
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "P5_D01_INVALID_TOLERANCE",
        "P5_D01_INVALID_STATION_CONVENTION",
        "P5_D01_INVALID_COORDINATE_CONVENTION",
        "P5_D01_UNKNOWN_SOURCE_AUTHORITY",
        "P5_D01_UNKNOWN_STATUS",
      ]),
    );
  });

  it("rejects missing preview and DXF expectations", () => {
    const fixture = P5_D01_FORMAL_DRAWING_FIXTURE_MANIFEST.fixtures[0]!;
    const result = validatePhase5FormalDrawingFixtureManifest({
      ...P5_D01_FORMAL_DRAWING_FIXTURE_MANIFEST,
      fixtures: [
        {
          ...fixture,
          expectedPreview: { ...fixture.expectedPreview, requiredPrimitiveKinds: [] },
          expectedDxf: { ...fixture.expectedDxf, requiredLayerNames: [] },
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining(["P5_D01_PREVIEW_EXPECTATION_MISSING", "P5_D01_DXF_EXPECTATION_MISSING"]),
    );
  });

  it("detects stale preview and DXF golden expectations", () => {
    const manifest = withFixturePatch("p5-d01-plan-type-a-default", {
      expectedPreview: {
        ...P5_D01_FORMAL_DRAWING_FIXTURE_MANIFEST.fixtures[1]!.expectedPreview,
        requiredLayerIds: ["missing-layer"],
      },
      expectedDxf: {
        ...P5_D01_FORMAL_DRAWING_FIXTURE_MANIFEST.fixtures[1]!.expectedDxf,
        requiredLayerNames: ["MISSING_LAYER"],
      },
    });
    const result = validatePhase5FormalDrawingFixture(manifest.fixtures[1]!);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("P5_D01_STALE_GOLDEN");
  });

  it("rejects preview, print, and DXF route divergence", () => {
    const fixture = P5_D01_FORMAL_DRAWING_FIXTURE_MANIFEST.fixtures[1]!;
    const bundle = buildFormalDrawingWorkspaceDocuments(createDefaultLinerDraft(), "plan", "road_shape");
    const result = validatePhase5FormalDrawingFixtureDocuments(fixture, {
      previewDocument: bundle.previewDocument,
      dxfDocument: { ...bundle.previewDocument },
      printDocument: bundle.printDocument,
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("P5_D01_PREVIEW_DXF_ROUTE_DIVERGENCE");
  });

  it("serializes validation deterministically for the same manifest input", () => {
    const first = validatePhase5FormalDrawingFixtureGate(P5_D01_FORMAL_DRAWING_FIXTURE_MANIFEST, { pathExists });
    const second = validatePhase5FormalDrawingFixtureGate(P5_D01_FORMAL_DRAWING_FIXTURE_MANIFEST, { pathExists });

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("keeps every representative fixture on the same preview, print, and DXF DrawingDocument route", () => {
    for (const fixture of P5_D01_FORMAL_DRAWING_FIXTURE_MANIFEST.fixtures) {
      const result = validatePhase5FormalDrawingFixture(fixture);
      expect(result, fixture.fixtureId).toEqual({ ok: true, diagnostics: [] });
    }
  });
});
