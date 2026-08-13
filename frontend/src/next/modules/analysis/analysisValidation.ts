/**
 * AnalysisDocument validation (Phase 7-01 A §5 FROZEN / Phase 7-02 WP-A).
 *
 * Fail-closed: numeric non-finite values reject, dangling entity references
 * reject, unsupported analysis rejects, section/material/load MISSING states
 * are surfaced as NOT_AVAILABLE (never fabricated).
 */

import {
  ANALYSIS_DOCUMENT_KIND,
  ANALYSIS_SCHEMA_VERSION,
  type AnalysisDocument,
  type AnalysisIssue,
  type AnalysisMember,
  type AnalysisNode,
  type AnalysisSupport,
} from "./analysisDocumentTypes";

const DOF_NAMES = ["ux", "uy", "uz", "rx", "ry", "rz"] as const;

function isFiniteNumber(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value);
}

function nodeIdSet(document: AnalysisDocument): ReadonlySet<string> {
  return new Set(document.nodes.map((node) => node.entityId));
}

function memberIdSet(document: AnalysisDocument): ReadonlySet<string> {
  return new Set(document.members.map((member) => member.entityId));
}

function materialIdSet(document: AnalysisDocument): ReadonlySet<string> {
  return new Set(document.materials.map((material) => material.entityId));
}

function sectionIdSet(document: AnalysisDocument): ReadonlySet<string> {
  return new Set(document.sections.map((section) => section.entityId));
}

/** Validates entityId + sourceEntityId + sourceKind presence (D-11). */
function validateEntityIdentity(
  entity: { entityId: string; sourceEntityId: string; sourceKind: string },
  path: string,
  issues: AnalysisIssue[],
): void {
  if (entity.entityId.trim().length === 0) {
    issues.push({ path: `${path}.entityId`, message: "entityId must be non-empty." });
  }
  if (entity.sourceEntityId.trim().length === 0) {
    issues.push({ path: `${path}.sourceEntityId`, message: "sourceEntityId must be non-empty." });
  }
  if (entity.sourceKind.trim().length === 0) {
    issues.push({ path: `${path}.sourceKind`, message: "sourceKind must be non-empty." });
  }
}

function validateNode(node: AnalysisNode, issues: AnalysisIssue[]): void {
  validateEntityIdentity(node, `nodes[${node.sourceEntityId}]`, issues);
  if (!isFiniteNumber(node.x) || !isFiniteNumber(node.y) || !isFiniteNumber(node.z)) {
    issues.push({
      path: `nodes[${node.sourceEntityId}].position`,
      message: "node coordinates must be finite numbers.",
    });
  }
}

function validateMember(
  member: AnalysisMember,
  nodeIds: ReadonlySet<string>,
  materialIds: ReadonlySet<string>,
  sectionIds: ReadonlySet<string>,
  issues: AnalysisIssue[],
): void {
  validateEntityIdentity(member, `members[${member.sourceEntityId}]`, issues);
  if (member.elementType !== "frame") {
    issues.push({
      path: `members[${member.sourceEntityId}].elementType`,
      message: "only frame elements are supported in Phase 7-02.",
    });
  }
  if (!nodeIds.has(member.nodeIId) || !nodeIds.has(member.nodeJId)) {
    issues.push({
      path: `members[${member.sourceEntityId}]`,
      message: "member end nodes must exist.",
    });
  }
  if (member.nodeIId === member.nodeJId) {
    issues.push({
      path: `members[${member.sourceEntityId}]`,
      message: "member must not have the same start and end node (ZERO_LENGTH_MEMBER).",
    });
  }
  if (!materialIds.has(member.materialId)) {
    issues.push({
      path: `members[${member.sourceEntityId}].materialId`,
      message: "material reference must exist.",
    });
  }
  if (!sectionIds.has(member.sectionId)) {
    issues.push({
      path: `members[${member.sourceEntityId}].sectionId`,
      message: "section reference must exist.",
    });
  }
  const o = member.orientationVector;
  if (!isFiniteNumber(o.x) || !isFiniteNumber(o.y) || !isFiniteNumber(o.z)) {
    issues.push({
      path: `members[${member.sourceEntityId}].orientationVector`,
      message: "orientationVector must be finite.",
    });
  }
}

function validateSupport(
  support: AnalysisSupport,
  nodeIds: ReadonlySet<string>,
  issues: AnalysisIssue[],
): void {
  validateEntityIdentity(support, `supports[${support.sourceEntityId}]`, issues);
  if (!nodeIds.has(support.nodeId)) {
    issues.push({
      path: `supports[${support.sourceEntityId}].nodeId`,
      message: "support node must exist.",
    });
  }
  const c = support.constraint;
  for (const dof of DOF_NAMES) {
    if (typeof c[dof] !== "boolean") {
      issues.push({
        path: `supports[${support.sourceEntityId}].constraint.${dof}`,
        message: "constraint DOF must be boolean.",
      });
    }
  }
}

/** Full fail-closed validation of an AnalysisDocument. */
export function validateAnalysisDocument(document: AnalysisDocument): readonly AnalysisIssue[] {
  const issues: AnalysisIssue[] = [];

  if (document.schemaId !== "spacer.contracts.analysis-document") {
    issues.push({ path: "schemaId", message: "schemaId mismatch." });
  }
  if (document.schemaVersion !== ANALYSIS_SCHEMA_VERSION) {
    issues.push({
      path: "schemaVersion",
      message: `unsupported schemaVersion ${document.schemaVersion}`,
    });
  }
  if (document.documentKind !== ANALYSIS_DOCUMENT_KIND) {
    issues.push({ path: "documentKind", message: "documentKind mismatch." });
  }
  if (document.documentId.trim().length === 0) {
    issues.push({ path: "documentId", message: "documentId must be a UUID." });
  }
  if (!Number.isInteger(document.revisionId) || document.revisionId < 1) {
    issues.push({ path: "revisionId", message: "revisionId must be a positive integer." });
  }
  if (document.modelChecksum.trim().length !== 64) {
    issues.push({ path: "modelChecksum", message: "modelChecksum must be a sha256 hex digest." });
  }

  const nodeIds = nodeIdSet(document);
  const memberIds = memberIdSet(document);
  const materialIds = materialIdSet(document);
  const sectionIds = sectionIdSet(document);

  const seenNodeIds = new Set<string>();
  for (const node of document.nodes) {
    if (seenNodeIds.has(node.entityId)) {
      issues.push({ path: `nodes[${node.sourceEntityId}].entityId`, message: "duplicate node entityId." });
    }
    seenNodeIds.add(node.entityId);
    validateNode(node, issues);
  }

  for (const material of document.materials) {
    validateEntityIdentity(material, `materials[${material.sourceEntityId}]`, issues);
    if (
      !isFiniteNumber(material.elasticModulus) ||
      material.elasticModulus <= 0 ||
      !isFiniteNumber(material.shearModulus) ||
      material.shearModulus <= 0
    ) {
      issues.push({
        path: `materials[${material.sourceEntityId}]`,
        message: "elasticModulus / shearModulus must be positive finite numbers.",
      });
    }
    if (Math.abs(material.poissonRatio) >= 0.5) {
      issues.push({
        path: `materials[${material.sourceEntityId}].poissonRatio`,
        message: "poissonRatio must satisfy |nu| < 0.5.",
      });
    }
  }

  for (const section of document.sections) {
    validateEntityIdentity(section, `sections[${section.sourceEntityId}]`, issues);
    if (section.derivation === "NOT_AVAILABLE") {
      issues.push({
        path: `sections[${section.sourceEntityId}]`,
        message: "section is NOT_AVAILABLE; analysis cannot run (fail-closed).",
      });
    }
    if (
      !isFiniteNumber(section.area) ||
      section.area <= 0 ||
      !isFiniteNumber(section.iy) ||
      section.iy <= 0 ||
      !isFiniteNumber(section.iz) ||
      section.iz <= 0 ||
      !isFiniteNumber(section.j) ||
      section.j <= 0
    ) {
      issues.push({
        path: `sections[${section.sourceEntityId}]`,
        message: "section area / iy / iz / j must be positive finite numbers.",
      });
    }
  }

  for (const member of document.members) {
    validateMember(member, nodeIds, materialIds, sectionIds, issues);
  }

  for (const support of document.supports) {
    validateSupport(support, nodeIds, issues);
  }

  for (const bearing of document.bearings) {
    validateEntityIdentity(bearing, `bearings[${bearing.seatId}]`, issues);
    if (bearing.bearingType === "pot") {
      issues.push({
        path: `bearings[${bearing.seatId}]`,
        message: "pot bearings are UNSUPPORTED in Phase 7-02 (DEFER).",
      });
    }
  }

  for (const spring of [...document.springs, ...document.foundationSprings]) {
    validateEntityIdentity(spring, `springs[${spring.sourceEntityId}]`, issues);
    if (!nodeIds.has(spring.nodeId)) {
      issues.push({ path: `springs[${spring.sourceEntityId}].nodeId`, message: "spring node must exist." });
    }
    if (spring.stiffness !== null && (!isFiniteNumber(spring.stiffness) || spring.stiffness < 0)) {
      issues.push({
        path: `springs[${spring.sourceEntityId}].stiffness`,
        message: "spring stiffness must be non-negative finite or null.",
      });
    }
  }

  for (const nodalLoad of document.nodalLoads) {
    if (!nodeIds.has(nodalLoad.nodeId)) {
      issues.push({ path: `nodalLoads[${nodalLoad.id}].nodeId`, message: "load node must exist." });
    }
    if (
      !isFiniteNumber(nodalLoad.fx) ||
      !isFiniteNumber(nodalLoad.fy) ||
      !isFiniteNumber(nodalLoad.fz)
    ) {
      issues.push({ path: `nodalLoads[${nodalLoad.id}]`, message: "nodal load values must be finite." });
    }
  }

  for (const memberLoad of document.memberLoads) {
    if (!memberIds.has(memberLoad.memberId)) {
      issues.push({
        path: `memberLoads[${memberLoad.id}].memberId`,
        message: "member load member must exist.",
      });
    }
    if (!isFiniteNumber(memberLoad.magnitude)) {
      issues.push({ path: `memberLoads[${memberLoad.id}].magnitude`, message: "member load magnitude must be finite." });
    }
  }

  if (document.analysisSettings.analysisType !== "linear_static") {
    issues.push({ path: "analysisSettings.analysisType", message: "only linear_static is supported." });
  }
  if (document.analysisSettings.solver !== "scipy_sparse") {
    issues.push({ path: "analysisSettings.solver", message: "only scipy_sparse solver is supported." });
  }

  return issues;
}
