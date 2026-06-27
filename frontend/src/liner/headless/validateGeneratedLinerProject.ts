import Ajv2020 from "ajv/dist/2020.js";
import projectSchema from "../../../../schemas/project.schema.json";
import { LINER_DIAGNOSTIC_CODES, createIssue } from "../core/diagnostics";
import type { ComputationDiagnostic } from "../core/types";
import { validateProjectLinerExtension } from "../schema/validateProjectLinerExtension";
import type { ProjectModel } from "../../types";

let cachedValidator: ReturnType<Ajv2020["compile"]> | undefined;

function getProjectSchemaValidator(): ReturnType<Ajv2020["compile"]> {
  if (!cachedValidator) {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    cachedValidator = ajv.compile(projectSchema);
  }
  return cachedValidator;
}

function linerExtensionDiagnosticsToComputationDiagnostics(
  extensionDiagnostics: ReturnType<typeof validateProjectLinerExtension>,
): ComputationDiagnostic[] {
  return extensionDiagnostics.map((diagnostic) =>
    createIssue("error", LINER_DIAGNOSTIC_CODES.invalidFrameSchema, {
      entityPath: diagnostic.path,
      detail: diagnostic.message,
    }),
  );
}

export function validateGeneratedLinerProject(project: ProjectModel): ComputationDiagnostic[] {
  const diagnostics: ComputationDiagnostic[] = [];

  const linerDiagnostics = validateProjectLinerExtension(project);
  if (linerDiagnostics.length > 0) {
    diagnostics.push(...linerExtensionDiagnosticsToComputationDiagnostics(linerDiagnostics));
  }

  const validator = getProjectSchemaValidator();
  const valid = validator(project);
  if (!valid) {
    for (const error of validator.errors ?? []) {
      const path = error.instancePath.length > 0 ? error.instancePath : "/";
      diagnostics.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.invalidFrameSchema, {
          entityPath: path,
          detail: error.message ?? "Project schema validation failed.",
        }),
      );
    }
  }

  const nodeIds = new Set(project.nodes.map((node) => node.id));
  const materialIds = new Set(project.materials.map((material) => material.id));
  const sectionIds = new Set(project.sections.map((section) => section.id));
  const memberIds = new Set(project.members.map((member) => member.id));
  const loadCaseIds = new Set(project.loadCases.map((loadCase) => loadCase.id));

  for (const member of project.members) {
    if (!nodeIds.has(member.nodeI) || !nodeIds.has(member.nodeJ)) {
      diagnostics.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.missingFrameNode, {
          entityType: "member",
          entityId: member.id,
        }),
      );
    }
    if (!materialIds.has(member.materialId)) {
      diagnostics.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.missingFrameSection, {
          entityType: "member",
          entityId: member.id,
          detail: `Missing material ${member.materialId}`,
        }),
      );
    }
    if (!sectionIds.has(member.sectionId)) {
      diagnostics.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.missingFrameSection, {
          entityType: "member",
          entityId: member.id,
          detail: `Missing section ${member.sectionId}`,
        }),
      );
    }
  }

  for (const support of project.supports) {
    if (!nodeIds.has(support.nodeId)) {
      diagnostics.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.missingFrameNode, {
          entityType: "support",
          entityId: support.nodeId,
        }),
      );
    }
  }

  for (const load of project.nodalLoads) {
    if (!loadCaseIds.has(load.loadCaseId)) {
      diagnostics.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.invalidFrameSchema, {
          entityType: "nodalLoad",
          entityId: load.id,
          detail: `Missing load case ${load.loadCaseId}`,
        }),
      );
    }
    if (!nodeIds.has(load.nodeId)) {
      diagnostics.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.missingFrameNode, {
          entityType: "nodalLoad",
          entityId: load.id,
        }),
      );
    }
  }

  for (const load of project.memberLoads) {
    if (!loadCaseIds.has(load.loadCaseId)) {
      diagnostics.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.invalidFrameSchema, {
          entityType: "memberLoad",
          entityId: load.id,
          detail: `Missing load case ${load.loadCaseId}`,
        }),
      );
    }
    if (!memberIds.has(load.memberId)) {
      diagnostics.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.invalidFrameSchema, {
          entityType: "memberLoad",
          entityId: load.id,
          detail: `Missing member ${load.memberId}`,
        }),
      );
    }
  }

  for (const entry of project.linerTrace ?? []) {
    if (entry.frameEntityType === "node" && !nodeIds.has(entry.frameEntityId)) {
      diagnostics.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.missingFrameNode, {
          entityType: "linerTrace",
          entityId: entry.frameEntityId,
        }),
      );
    }
    if (entry.frameEntityType === "member" && !memberIds.has(entry.frameEntityId)) {
      diagnostics.push(
        createIssue("error", LINER_DIAGNOSTIC_CODES.invalidFrameSchema, {
          entityType: "linerTrace",
          entityId: entry.frameEntityId,
          detail: "linerTrace member id is missing from project.members",
        }),
      );
    }
  }

  return diagnostics;
}
