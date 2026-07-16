import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../../data/defaultProject";
import { getActiveAlignmentBundle } from "../../adapters/linerDomainDraftRoadDesignMapper";
import { linerDraftFromProject } from "../../adapters/linerProjectDraft";
import { createSampleImporterProject } from "../__tests__/fixtures/sampleProject";
import { convertImporterToPhase35Draft } from "./ImporterToPhase35Adapter";
import {
  convertAndStoreImporterDraft,
  domainDraftToDownloadJson,
  storeImporterDomainDraftInProject,
} from "./importerPhase35Bridge";
import { resolveLinerUiRoutePath } from "../../uiPreparation";

describe("importerPhase35Bridge", () => {
  it("stores importer domain draft in project.liner.domainDraft", () => {
    const importerProject = createSampleImporterProject();
    const conversion = convertImporterToPhase35Draft(importerProject);
    expect(conversion.draft).not.toBeNull();

    const stored = storeImporterDomainDraftInProject(createDefaultProject(), conversion.draft!);

    const storedBundle = getActiveAlignmentBundle(stored.project.liner?.domainDraft!)!;
    expect(stored.project.liner?.domainDraft).toBeDefined();
    expect(stored.project.liner?.draft).toBeUndefined();
    expect(storedBundle.alignment.elements.length).toBeGreaterThan(0);
    expect(storedBundle.verticalAlignment.elements.length).toBeGreaterThan(0);
    expect(storedBundle.crossSections.length).toBeGreaterThan(0);
    expect(linerDraftFromProject(stored.project)).toEqual(stored.draft);
  });

  it("convertAndStoreImporterDraft returns bridge result for valid project", () => {
    const importerProject = createSampleImporterProject();
    const bridgeId = importerProject.bridges[0]!.id;
    const result = convertAndStoreImporterDraft(createDefaultProject(), importerProject, bridgeId);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const bridgeBundle = getActiveAlignmentBundle(result.bridge.domainDraft)!;
    expect(bridgeBundle.alignment.elements).toEqual(
      importerProject.bridges[0]!.alignmentMetadata!.plan!.elements.map((element) => ({
        ...element,
      })),
    );
    expect(bridgeBundle.verticalAlignment.elements[0]).toMatchObject({
      type: "grade",
      startStation: 0,
      endStation: 40.286699999999996,
    });
  });

  it("convertAndStoreImporterDraft blocks when export is blocked", () => {
    const importerProject = createSampleImporterProject();
    importerProject.bridges[0]!.alignmentMetadata = undefined;
    const result = convertAndStoreImporterDraft(
      createDefaultProject(),
      importerProject,
      importerProject.bridges[0]!.id,
    );

    expect(result.ok).toBe(false);
  });

  it("domainDraftToDownloadJson serializes the vNext domain draft", () => {
    const importerProject = createSampleImporterProject();
    const conversion = convertImporterToPhase35Draft(importerProject);
    const json = domainDraftToDownloadJson(conversion.draft!);
    const parsed = JSON.parse(json) as { linerModelId: string };

    expect(parsed.linerModelId).toBe(conversion.draft?.linerModelId);
  });

  it("Phase 3.5 setup route is used after export open", () => {
    expect(resolveLinerUiRoutePath("liner.setup")).toBe("/pro/liner/setup");
    expect(resolveLinerUiRoutePath("liner.preview")).toBe("/pro/liner/preview");
    expect(resolveLinerUiRoutePath("liner.mappingReview")).toBe("/pro/liner/mapping-review");
  });
});
