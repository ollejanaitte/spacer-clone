import type { BuildIntermediateInput } from "../core/pipeline/pipeline";
import { buildIntermediateResult } from "../core/pipeline/pipeline";
import { hasFatalIssues, LINER_DIAGNOSTIC_CODES, createIssue } from "../core/diagnostics";
import type { CanonicalLinerIntermediateResult, ComputationDiagnostic } from "../core/types";
import type { FrameMappingOptions, FrameMappingResult } from "../mapper/frameModelMapper";
import { mapToFrameModel } from "../mapper/frameModelMapper";
import { attachLinerMappingToProject } from "../schema/attachLinerMappingToProject";
import type { ProjectModel } from "../../types";
import { CURRENT_PROJECT_SCHEMA_VERSION } from "../../projectMigration";
import { convertFrameMappingEntities } from "./convertFrameMappingEntities";
import {
  LINER_HEADLESS_ANALYSIS_SETTINGS,
  LINER_HEADLESS_FIXTURE_MATERIALS,
  LINER_HEADLESS_FIXTURE_SECTION_IDS,
  LINER_HEADLESS_FIXTURE_MATERIAL_IDS,
  LINER_HEADLESS_FIXTURE_SECTIONS,
  LINER_HEADLESS_UNITS,
} from "./linerProjectDefaults";
import { mergeLinerFrameEntitiesIntoProject } from "./mergeLinerFrameEntities";
import { validateGeneratedLinerProject } from "./validateGeneratedLinerProject";

export type HeadlessLinerFrameProjectOptions = {
  generatedAt?: string;
  projectId?: string;
  projectName?: string;
  timestamp?: string;
  useFixtureMaterials?: boolean;
};

export type HeadlessLinerFrameProjectInput = {
  intermediate: CanonicalLinerIntermediateResult;
  mappingResult?: FrameMappingResult;
  mappingOptions?: FrameMappingOptions;
  baseProject?: ProjectModel;
  options?: HeadlessLinerFrameProjectOptions;
};

export type HeadlessLinerFrameProjectResult = {
  project: ProjectModel | null;
  mappingResult: FrameMappingResult;
  diagnostics: ComputationDiagnostic[];
  validationReady: boolean;
};

function collectRequiredMaterialSectionIds(mappingResult: FrameMappingResult): {
  materialIds: Set<string>;
  sectionIds: Set<string>;
} {
  const materialIds = new Set<string>();
  const sectionIds = new Set<string>();

  for (const member of mappingResult.members) {
    if (member.materialId) {
      materialIds.add(member.materialId);
    }
    if (member.sectionId) {
      sectionIds.add(member.sectionId);
    }
  }

  return { materialIds, sectionIds };
}

function createMinimalProjectShell(
  linerModelId: string,
  options: HeadlessLinerFrameProjectOptions | undefined,
  requiredMaterialIds: Set<string>,
  requiredSectionIds: Set<string>,
): ProjectModel {
  const timestamp = options?.timestamp ?? options?.generatedAt ?? new Date().toISOString();
  const useFixture = options?.useFixtureMaterials ?? true;

  const materials = useFixture
    ? LINER_HEADLESS_FIXTURE_MATERIALS.filter((material) => requiredMaterialIds.has(material.id))
    : [];
  const sections = useFixture
    ? LINER_HEADLESS_FIXTURE_SECTIONS.filter((section) => requiredSectionIds.has(section.id))
    : [];

  return {
    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    project: {
      id: options?.projectId ?? `liner-${linerModelId}`,
      name: options?.projectName ?? `Liner generated ${linerModelId}`,
      schemaVersion: "1.0.0",
      description: "Headless liner-generated frame model (P1-5 fixture).",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    units: { ...LINER_HEADLESS_UNITS },
    nodes: [],
    materials,
    sections,
    members: [],
    supports: [],
    loadCases: [
      {
        id: "LC_LINER_PLACEHOLDER",
        name: "Liner placeholder",
        type: "static",
      },
    ],
    nodalLoads: [],
    memberLoads: [],
    analysisSettings: { ...LINER_HEADLESS_ANALYSIS_SETTINGS },
  };
}

function ensureCatalogEntries(
  project: ProjectModel,
  requiredMaterialIds: Set<string>,
  requiredSectionIds: Set<string>,
  useFixture: boolean,
): ProjectModel {
  if (!useFixture) {
    return project;
  }

  const materialIds = new Set(project.materials.map((material) => material.id));
  const sectionIds = new Set(project.sections.map((section) => section.id));
  const materials = [...project.materials];
  const sections = [...project.sections];

  for (const material of LINER_HEADLESS_FIXTURE_MATERIALS) {
    if (requiredMaterialIds.has(material.id) && !materialIds.has(material.id)) {
      materials.push(material);
      materialIds.add(material.id);
    }
  }
  for (const section of LINER_HEADLESS_FIXTURE_SECTIONS) {
    if (requiredSectionIds.has(section.id) && !sectionIds.has(section.id)) {
      sections.push(section);
      sectionIds.add(section.id);
    }
  }

  return {
    ...project,
    materials,
    sections,
  };
}

export function createHeadlessLinerFrameProject(
  input: HeadlessLinerFrameProjectInput,
): HeadlessLinerFrameProjectResult {
  const diagnostics: ComputationDiagnostic[] = [...input.intermediate.diagnostics];
  const mappingResult =
    input.mappingResult ??
    mapToFrameModel(input.intermediate, input.mappingOptions ?? {});

  diagnostics.push(...mappingResult.diagnostics);

  if (hasFatalIssues(diagnostics) || hasFatalIssues(mappingResult.diagnostics)) {
    return {
      project: null,
      mappingResult,
      diagnostics,
      validationReady: false,
    };
  }

  const converted = convertFrameMappingEntities(mappingResult);
  diagnostics.push(...converted.diagnostics);

  if (hasFatalIssues(converted.diagnostics)) {
    return {
      project: null,
      mappingResult,
      diagnostics,
      validationReady: false,
    };
  }

  const { materialIds, sectionIds } = collectRequiredMaterialSectionIds(mappingResult);
  const useFixture = input.options?.useFixtureMaterials ?? true;

  if (useFixture) {
    const fixtureMaterialIds = new Set<string>(Object.values(LINER_HEADLESS_FIXTURE_MATERIAL_IDS));
    const fixtureSectionIds = new Set<string>(Object.values(LINER_HEADLESS_FIXTURE_SECTION_IDS));
    for (const materialId of materialIds) {
      if (!fixtureMaterialIds.has(materialId)) {
        diagnostics.push(
          createIssue("error", LINER_DIAGNOSTIC_CODES.missingFrameSection, {
            detail: `No P1-5 fixture material registered for ${materialId}`,
          }),
        );
      }
    }
    for (const sectionId of sectionIds) {
      if (!fixtureSectionIds.has(sectionId)) {
        diagnostics.push(
          createIssue("error", LINER_DIAGNOSTIC_CODES.missingFrameSection, {
            detail: `No P1-5 fixture section registered for ${sectionId}`,
          }),
        );
      }
    }
  }

  if (hasFatalIssues(diagnostics)) {
    return {
      project: null,
      mappingResult,
      diagnostics,
      validationReady: false,
    };
  }

  const frameEntities = {
    nodes: converted.nodes,
    members: converted.members,
    supports: converted.supports,
  };

  let project: ProjectModel;
  if (input.baseProject) {
    const catalogProject = ensureCatalogEntries(
      input.baseProject,
      materialIds,
      sectionIds,
      useFixture,
    );
    project = mergeLinerFrameEntitiesIntoProject(
      catalogProject,
      input.intermediate.linerModelId,
      mappingResult,
      frameEntities,
    );
  } else {
    const shell = createMinimalProjectShell(
      input.intermediate.linerModelId,
      input.options,
      materialIds,
      sectionIds,
    );
    project = {
      ...shell,
      ...frameEntities,
      linerTrace: mappingResult.linerTrace,
    };
  }

  project = attachLinerMappingToProject(
    project,
    input.intermediate,
    mappingResult,
    { generatedAt: input.options?.generatedAt },
  );

  const validationDiagnostics = validateGeneratedLinerProject(project);
  diagnostics.push(...validationDiagnostics);

  const validationReady = !hasFatalIssues(validationDiagnostics);

  return {
    project: validationReady ? project : null,
    mappingResult,
    diagnostics,
    validationReady,
  };
}

export function buildHeadlessLinerFrameProjectFromAlignment(
  pipelineInput: BuildIntermediateInput,
  headlessOptions?: HeadlessLinerFrameProjectOptions & {
    mappingOptions?: FrameMappingOptions;
    baseProject?: ProjectModel;
  },
): HeadlessLinerFrameProjectResult {
  const intermediate = buildIntermediateResult(pipelineInput);
  return createHeadlessLinerFrameProject({
    intermediate,
    mappingOptions: headlessOptions?.mappingOptions,
    baseProject: headlessOptions?.baseProject,
    options: headlessOptions,
  });
}
