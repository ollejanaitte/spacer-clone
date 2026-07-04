/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach } from "vitest";
import {
  clearConversionLogsForTests,
  defaultConversionLogWriter,
  readConversionLogFromStorage,
} from "./ConversionLogWriter";
import { createSampleImporterProject } from "../__tests__/fixtures/sampleProject";
import { convertImporterToPhase35Draft } from "./ImporterToPhase35Adapter";
import { IMPORTER_SCHEMA_VERSION } from "../version";
import { LINER_DRAFT_SCHEMA_VERSION } from "../../schema/version";

describe("ConversionLogWriter", () => {
  beforeEach(() => {
    clearConversionLogsForTests();
  });

  it("writes and reads conversion log", () => {
    const project = createSampleImporterProject();
    const result = convertImporterToPhase35Draft(project);
    expect(result.conversionLog).not.toBeNull();

    const log = {
      ...result.conversionLog!,
      sourceImporterSchemaVersion: IMPORTER_SCHEMA_VERSION,
      targetDraftSchemaVersion: LINER_DRAFT_SCHEMA_VERSION,
    };

    defaultConversionLogWriter.write(project.id, log);
    const loaded = readConversionLogFromStorage(project.id);
    expect(loaded?.id).toBe(log.id);
    expect(loaded?.sourceRefs.length).toBeGreaterThan(0);
  });
});
