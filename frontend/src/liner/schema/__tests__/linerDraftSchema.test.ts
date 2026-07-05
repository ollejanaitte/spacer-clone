import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { convertImporterToPhase35Draft } from "../../importer/export/ImporterToPhase35Adapter";
import { buildBuiltInSampleProject } from "../../importer/sample/builtInSampleDataset";
import { migrateLinerDraftToVNext, PROJECT_LINER_METADATA_SCHEMA_VERSION } from "../index";
import type { LinerDomainDraftVNext } from "../types";

const schemaDir = dirname(fileURLToPath(import.meta.url));
const linerDraftSchema = JSON.parse(
  readFileSync(join(schemaDir, "../linerDraftSchema.vNext.json"), "utf8"),
);

function compileLinerDraftValidator() {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  return ajv.compile(linerDraftSchema);
}

function createFixedZDraftWithMeasuredGrid(measuredGrid: LinerDomainDraftVNext["measuredGrid"]) {
  return {
    alignment: {
      id: "alignment-test",
      linerModelId: "gc06",
      coordinatePolicyId: "global",
      elements: [
        {
          type: "straight" as const,
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
    offsets: [0],
    z: 12.5,
    measuredGrid,
  };
}

describe("linerDraftSchema.vNext measuredGrid", () => {
  const validate = compileLinerDraftValidator();

  it("accepts built-in sample domainDraft with measuredGrid", () => {
    const result = convertImporterToPhase35Draft(buildBuiltInSampleProject());
    expect(result.draft).not.toBeNull();
    expect(result.draft!.measuredGrid).toBeDefined();

    const valid = validate(result.draft);
    expect(validate.errors ?? []).toEqual([]);
    expect(valid).toBe(true);
  });

  it("accepts v0.1 fixed-z draft migration when measuredGrid is present", () => {
    const sample = convertImporterToPhase35Draft(buildBuiltInSampleProject());
    const migrated = migrateLinerDraftToVNext({
      schemaVersion: PROJECT_LINER_METADATA_SCHEMA_VERSION,
      linerModelId: "gc06",
      coordinatePolicyId: "global",
      intermediateSchemaVersion: "0.2.0",
      draft: createFixedZDraftWithMeasuredGrid(sample.draft?.measuredGrid),
    });

    expect(migrated.ok).toBe(true);
    if (!migrated.ok) {
      return;
    }

    const valid = validate(migrated.domainDraft);
    expect(validate.errors ?? []).toEqual([]);
    expect(valid).toBe(true);
    expect(migrated.domainDraft.measuredGrid).toBeDefined();
  });

  it("accepts domainDraft without measuredGrid", () => {
    const migrated = migrateLinerDraftToVNext({
      schemaVersion: PROJECT_LINER_METADATA_SCHEMA_VERSION,
      linerModelId: "gc06",
      coordinatePolicyId: "global",
      intermediateSchemaVersion: "0.2.0",
      draft: createFixedZDraftWithMeasuredGrid(undefined),
    });

    expect(migrated.ok).toBe(true);
    if (!migrated.ok) {
      return;
    }

    expect(migrated.domainDraft.measuredGrid).toBeUndefined();
    const valid = validate(migrated.domainDraft);
    expect(validate.errors ?? []).toEqual([]);
    expect(valid).toBe(true);
  });
});
