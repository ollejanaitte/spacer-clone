import { describe, expect, it } from "vitest";
import { buildIntermediateInputFromDomainDraft } from "../../adapters/linerProjectDraft";
import { createDefaultLinerDraft } from "../../adapters/linerUiAdapter";
import type { BuildIntermediateInput } from "../../core/pipeline/pipeline";
import {
  LINER_DRAFT_SCHEMA_VERSION,
  migrateLinerDraftToVNext,
  PROJECT_LINER_METADATA_SCHEMA_VERSION,
} from "../index";
import type { LinerDomainDraftVNext } from "../types";

function saveLoad<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function linerMetadataWithV01Draft(draft: BuildIntermediateInput) {
  return {
    schemaVersion: PROJECT_LINER_METADATA_SCHEMA_VERSION,
    linerModelId: draft.alignment.linerModelId,
    coordinatePolicyId: draft.alignment.coordinatePolicyId,
    intermediateSchemaVersion: "0.2.0" as const,
    draft,
  };
}

function linerMetadataWithV02DomainDraft(domainDraft: LinerDomainDraftVNext) {
  return {
    schemaVersion: PROJECT_LINER_METADATA_SCHEMA_VERSION,
    draftSchemaVersion: LINER_DRAFT_SCHEMA_VERSION,
    linerModelId: domainDraft.linerModelId,
    coordinatePolicyId: domainDraft.coordinatePolicyId,
    intermediateSchemaVersion: "0.2.0" as const,
    domainDraft,
  };
}

function createFixedZDraft(): BuildIntermediateInput {
  return {
    alignment: {
      id: "alignment-test",
      linerModelId: "gc06",
      coordinatePolicyId: "global",
      elements: [
        {
          type: "straight",
          id: "L1",
          start: { x: 0, y: 0 },
          azimuth: 0,
          length: 50,
        },
      ],
    },
    stationDefinition: {
      originDisplayedStation: 0,
      interval: 10,
    },
    offsets: [-2, 0, 2],
    sampleInterval: 1.5,
    z: 12.5,
  };
}

describe("migrateLinerDraftToVNext", () => {
  it("converts a v0.1 fixed-z/offset draft to vNext with expected domain defaults", () => {
    const draft = createFixedZDraft();
    const result = migrateLinerDraftToVNext(linerMetadataWithV01Draft(draft));

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const { domainDraft } = result;

    expect(domainDraft.alignment).toEqual({
      id: "alignment-test",
      elements: [
        {
          type: "straight",
          id: "L1",
          start: { x: 0, y: 0 },
          azimuth: 0,
          length: 50,
        },
      ],
    });
    expect(domainDraft.stationDefinition).toEqual(draft.stationDefinition);

    expect(domainDraft.verticalAlignment.elements).toEqual([
      {
        type: "grade",
        id: "VG-default",
        startPhysicalDistance: 0,
        endPhysicalDistance: 50,
        startElevation: 12.5,
        grade: 0,
      },
    ]);

    expect(domainDraft.crossSections).toEqual([
      {
        id: "CS-default",
        name: "Default",
        offsetLines: [
          { id: "OL-0", offset: -2, elevation: 0, role: "custom" },
          { id: "OL-1", offset: 0, elevation: 0, role: "custom" },
          { id: "OL-2", offset: 2, elevation: 0, role: "custom" },
        ],
      },
    ]);

    expect(domainDraft.gridDefinitions).toEqual([
      {
        id: "GRID-default",
        crossSectionTemplateId: "CS-default",
        stationRange: {
          startPhysicalDistance: 0,
          endPhysicalDistance: 50,
        },
        stationInterval: 1.5,
        offsetLineIds: ["OL-0", "OL-1", "OL-2"],
      },
    ]);

    expect(domainDraft.sampling).toEqual({
      display: {
        maxChordLength: 1.5,
        maxSagitta: 0.005,
        minSegmentsPerElement: 1,
      },
      dxf: {
        maxChordLength: 0.1,
        maxSagitta: 0.001,
        minSegmentsPerElement: 1,
      },
      frame: {
        maxMemberLength: 0.25,
        maxSagitta: 0.0025,
        stationIntervalFallback: 1.5,
      },
    });

    expect(buildIntermediateInputFromDomainDraft(domainDraft)).toMatchObject({
      alignment: draft.alignment,
      stationDefinition: draft.stationDefinition,
      offsets: draft.offsets,
      sampleInterval: draft.sampleInterval,
      z: draft.z,
    });
  });

  it("rejects unsupported free-form drafts and unknown fields with LINER_SCHEMA_INVALID", () => {
    const freeFormResult = migrateLinerDraftToVNext({
      schemaVersion: PROJECT_LINER_METADATA_SCHEMA_VERSION,
      linerModelId: "gc06",
      coordinatePolicyId: "global",
      intermediateSchemaVersion: "0.2.0",
      draft: [{ alignment: { id: "broken" } }],
    });
    expect(freeFormResult).toEqual({
      ok: false,
      domainDraft: null,
      diagnostics: [
        expect.objectContaining({
          code: "LINER_SCHEMA_INVALID",
          path: "/liner/draft",
        }),
      ],
    });

    const unknownFieldResult = migrateLinerDraftToVNext(
      linerMetadataWithV01Draft({
        ...createFixedZDraft(),
        unknownField: true,
      } as BuildIntermediateInput),
    );
    expect(unknownFieldResult).toEqual({
      ok: false,
      domainDraft: null,
      diagnostics: [
        expect.objectContaining({
          code: "LINER_SCHEMA_INVALID",
          path: "/liner/draft",
        }),
      ],
    });
  });

  it("migrates createDefaultLinerDraft placed in project.liner.draft", () => {
    const draft = createDefaultLinerDraft();
    const result = migrateLinerDraftToVNext(linerMetadataWithV01Draft(draft));

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.domainDraft.verticalAlignment.elements[0]).toMatchObject({
      type: "grade",
      grade: 0,
      startElevation: 0,
      endPhysicalDistance: 100,
    });
    expect(result.domainDraft.crossSections[0]?.offsetLines).toEqual([
      { id: "OL-0", offset: 0, elevation: 0, role: "custom" },
    ]);
    expect(result.diagnostics).toEqual([]);
  });
});

describe("liner domain draft migration round-trip", () => {
  it("round-trip 1: v0.1 fixed-z draft survives migrate and JSON save/load", () => {
    const draft = createFixedZDraft();
    const migrated = migrateLinerDraftToVNext(linerMetadataWithV01Draft(draft));
    expect(migrated.ok).toBe(true);
    if (!migrated.ok) {
      return;
    }

    const reloaded = saveLoad(migrated.domainDraft);
    expect(reloaded).toEqual(migrated.domainDraft);
  });

  it("round-trip 2: v0.2 domainDraft survives edit and JSON save/load", () => {
    const initial = migrateLinerDraftToVNext(
      linerMetadataWithV01Draft(createFixedZDraft()),
    );
    expect(initial.ok).toBe(true);
    if (!initial.ok) {
      return;
    }

    const edited: LinerDomainDraftVNext = {
      ...initial.domainDraft,
      sampling: {
        ...initial.domainDraft.sampling,
        display: {
          ...initial.domainDraft.sampling.display,
          maxChordLength: 0.75,
        },
      },
    };

    const saved = saveLoad(linerMetadataWithV02DomainDraft(edited));
    const loaded = migrateLinerDraftToVNext(saved);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) {
      return;
    }

    expect(loaded.domainDraft).toEqual(edited);
  });

  it("round-trip 3: v0.1 migrate -> save/load -> v0.2 persist -> re-migrate is idempotent", () => {
    const v01Metadata = linerMetadataWithV01Draft(createFixedZDraft());

    const firstMigration = migrateLinerDraftToVNext(v01Metadata);
    expect(firstMigration.ok).toBe(true);
    if (!firstMigration.ok) {
      return;
    }

    const migrationAfterV01Reload = migrateLinerDraftToVNext(saveLoad(v01Metadata));
    expect(migrationAfterV01Reload.ok).toBe(true);
    if (!migrationAfterV01Reload.ok) {
      return;
    }
    expect(migrationAfterV01Reload.domainDraft).toEqual(firstMigration.domainDraft);

    const v02Metadata = saveLoad(
      linerMetadataWithV02DomainDraft(firstMigration.domainDraft),
    );
    const migrationFromV02 = migrateLinerDraftToVNext(v02Metadata);
    expect(migrationFromV02.ok).toBe(true);
    if (!migrationFromV02.ok) {
      return;
    }

    const migrationAfterV02Reload = migrateLinerDraftToVNext(saveLoad(v02Metadata));
    expect(migrationAfterV02Reload.ok).toBe(true);
    if (!migrationAfterV02Reload.ok) {
      return;
    }

    expect(migrationFromV02.domainDraft).toEqual(firstMigration.domainDraft);
    expect(migrationAfterV02Reload.domainDraft).toEqual(firstMigration.domainDraft);
  });
});
