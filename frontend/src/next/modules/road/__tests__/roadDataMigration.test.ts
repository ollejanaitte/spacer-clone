import { describe, expect, it } from "vitest";
import { buildCanonicalRoadData, computeRoadDataChecksum, finalizeCanonicalRoadData, validateCanonicalRoadData } from "../roadDataSchema";
import {
  domainDraftFromRoadInput,
  ensureCanonicalRoadData,
  isReferenceMountainDefault,
} from "../roadDataMigration";
import { createDefaultProject } from "../../../../data/defaultProject";
import { withProjectLinerDraft, serializeProjectForPersistence } from "../../../../liner/adapters/linerProjectDraft";
import { createDefaultLinerDraft } from "../../../../liner/adapters/linerUiAdapter";
import type { LinerDomainDraftVNext } from "../../../../liner/schema/types";

function makeDomainDraft(): LinerDomainDraftVNext {
  return {
    id: "AL-1",
    linerModelId: "road",
    coordinatePolicyId: null as unknown as string,
    alignments: [
      {
        id: "AL-1",
        name: "Test Road",
        enabled: true,
        sortIndex: 0,
        alignment: { id: "H-1", elements: [] },
        stationDefinition: { originDisplayedStation: 0, interval: 20 },
        verticalAlignment: { id: "VA-1", elements: [] },
        crossSections: [],
        gridDefinitions: [],
        spans: [],
        piers: [],
      },
    ],
    generationSettings: {},
    sampling: {
      display: { maxChordLength: 0.5, maxSagitta: 0.01, minSegmentsPerElement: 4 },
      dxf: { maxChordLength: 0.1, maxSagitta: 0.005, minSegmentsPerElement: 4 },
      frame: { maxMemberLength: 0.25, maxSagitta: 0.005, stationIntervalFallback: 0.25 },
    },
  };
}

function makeRoadProject(): ReturnType<typeof createDefaultProject> {
  return createDefaultProject();
}

function makeLinerProject() {
  const draft = createDefaultLinerDraft();
  const project = withProjectLinerDraft(createDefaultProject(), draft);
  const serialized = serializeProjectForPersistence(project);
  if (!serialized.ok) {
    throw new Error("failed to build liner project fixture");
  }
  return serialized.project;
}

describe("roadDataSchema (Phase 7.3 WP-A)", () => {
  it("computes a deterministic checksum", () => {
    expect(computeRoadDataChecksum(makeDomainDraft())).toBe(computeRoadDataChecksum(makeDomainDraft()));
    expect(computeRoadDataChecksum(makeDomainDraft())).toMatch(/^[0-9a-f]{64}$/);
  });

  it("finalize rejects checksum mismatch (fail-closed)", () => {
    const rd = buildCanonicalRoadData(makeDomainDraft(), { source: "new" });
    expect(finalizeCanonicalRoadData({ ...rd, contentChecksum: "f".repeat(64) })).toBeNull();
    expect(finalizeCanonicalRoadData(rd)).not.toBeNull();
  });

  it("validate detects malformed shape", () => {
    expect(validateCanonicalRoadData(null).length).toBeGreaterThan(0);
    expect(validateCanonicalRoadData(buildCanonicalRoadData(makeDomainDraft(), { source: "new" }))).toHaveLength(0);
  });
});

describe("roadDataMigration (Phase 7.3 WP-A)", () => {
  it("new project -> empty canonical (source=new)", () => {
    const result = ensureCanonicalRoadData(undefined, { project: makeRoadProject() });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.roadData._meta.source).toBe("new");
      expect(result.migrated).toBe(false);
    }
  });

  it("roadInput only -> migrates with source=roadInput", () => {
    const roadInput = { label: "My Road", horizontal: { id: "H-1", elements: [] }, vertical: [], crossSections: [] };
    const result = ensureCanonicalRoadData(undefined, { project: makeRoadProject(), roadInput });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.roadData._meta.source).toBe("roadInput");
      expect(result.roadData._meta.roadLabel).toBe("My Road");
      expect(result.migrated).toBe(true);
    }
  });

  it("roadInput with no horizontal -> fail-closed", () => {
    const result = ensureCanonicalRoadData(undefined, { project: makeRoadProject(), roadInput: { label: "x" } });
    expect(result.ok).toBe(false);
  });

  it("existing canonical roadData with valid checksum -> no migration", () => {
    const rd = buildCanonicalRoadData(makeDomainDraft(), { source: "new" });
    const result = ensureCanonicalRoadData(rd, { project: makeRoadProject() });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.migrated).toBe(false);
      expect(result.roadData.contentChecksum).toBe(rd.contentChecksum);
    }
  });

  it("existing canonical roadData with bad checksum -> block", () => {
    const tampered = { ...buildCanonicalRoadData(makeDomainDraft(), { source: "new" }), contentChecksum: "f".repeat(64) };
    const result = ensureCanonicalRoadData(tampered, { project: makeRoadProject() });
    expect(result.ok).toBe(false);
  });

  it("project.liner only -> migrates with source=liner", () => {
    const project = makeLinerProject();
    const result = ensureCanonicalRoadData(undefined, { project });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.roadData._meta.source).toBe("liner");
      expect(result.migrated).toBe(true);
    }
  });

  it("Reference Mountain roadInput with liner -> liner preferred", () => {
    const linerProject = makeLinerProject();
    const roadInput = { label: "Mountain Road" };
    expect(isReferenceMountainDefault(roadInput)).toBe(true);
    const result = ensureCanonicalRoadData(undefined, { project: linerProject, roadInput });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.roadData._meta.source).toBe("liner");
    }
  });

  it("domainDraftFromRoadInput wraps geometry blobs", () => {
    const draft = domainDraftFromRoadInput({ label: "R", horizontal: { id: "H1", elements: [] }, vertical: [], crossSections: [] });
    expect(draft).not.toBeNull();
    expect(draft!.alignments[0]!.name).toBe("R");
  });
});
