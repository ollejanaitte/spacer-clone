import type {
  ApolloPhase1Unit2AuditRecord,
  ApolloPhase1Unit2Draft,
  ApolloPhase1Unit2MaterialReference,
  ApolloPhase1Unit2Member,
  ApolloPhase1Unit2Node,
  ApolloPhase1Unit2ProjectMetadata,
  ApolloPhase1Unit2SourceStatus,
  ApolloPhase1Unit2Support,
  ApolloPhase1Unit2SupportState,
  ProjectModel,
  StructuredMessage,
} from "../types";

export const APOLLO_PHASE1_UNIT2_SCHEMA_VERSION = "2.0.0";
const MAX_AUDIT_RECORDS = 50;

export type ApolloPhase1Unit2Validation = {
  readonly errors: StructuredMessage[];
  readonly warnings: StructuredMessage[];
};

export type ApolloPhase1Unit2HydrationResult =
  | { readonly ok: true; readonly project: ProjectModel }
  | { readonly ok: false; readonly diagnostics: readonly string[] };

export type ApolloPhase1Unit2SerializationResult =
  | { readonly ok: true; readonly project: ProjectModel }
  | { readonly ok: false; readonly diagnostics: readonly string[] };

export type ApolloPhase1Unit2ReferenceUsage = {
  readonly nodeToMemberIds: ReadonlyMap<string, readonly string[]>;
  readonly nodeToSupportIds: ReadonlyMap<string, readonly string[]>;
  readonly materialToMemberIds: ReadonlyMap<string, readonly string[]>;
};

export type ApolloPhase1Unit2ViewSelection =
  | { readonly kind: "node"; readonly id: string }
  | { readonly kind: "member"; readonly id: string }
  | { readonly kind: "support"; readonly id: string }
  | { readonly kind: "material"; readonly id: string }
  | null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function sanitizeText(value: string | undefined): string {
  return value?.trim() ?? "";
}

function inferSourceStatus(): ApolloPhase1Unit2SourceStatus {
  return "blocked_by_numeric_evidence";
}

function supportStateFromBoolean(value: boolean | undefined): ApolloPhase1Unit2SupportState {
  if (value === true) return "FIXED";
  if (value === false) return "FREE";
  return "UNDEFINED";
}

function supportBooleanFromState(value: ApolloPhase1Unit2SupportState): boolean {
  return value === "FIXED";
}

function createMetadata(project: ProjectModel, localDraftStatus: "saved" | "dirty"): ApolloPhase1Unit2ProjectMetadata {
  return {
    projectId: project.project.id,
    name: project.project.name,
    description: project.project.description,
    createdAt: project.project.createdAt,
    updatedAt: project.project.updatedAt,
    provisionalStatus: "unverified",
    localDraftStatus,
  };
}

function createAuditId(existing: readonly ApolloPhase1Unit2AuditRecord[]): string {
  const used = new Set(existing.map((entry) => entry.id));
  let counter = existing.length + 1;
  while (used.has(`AUD-${counter}`)) {
    counter += 1;
  }
  return `AUD-${counter}`;
}

export function nextApolloUnit2Id(prefix: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  let counter = 1;
  while (used.has(`${prefix}${counter}`)) {
    counter += 1;
  }
  return `${prefix}${counter}`;
}

export function createApolloPhase1Unit2DraftFromProject(project: ProjectModel): ApolloPhase1Unit2Draft {
  return {
    schemaVersion: APOLLO_PHASE1_UNIT2_SCHEMA_VERSION,
    metadata: createMetadata(project, "saved"),
    nodes: project.nodes.map((node) => ({
      id: node.id,
      label: node.label ?? node.id,
      x: node.x,
      y: node.y,
      z: node.z,
      active: true,
      comment: "",
    })),
    materialReferences: project.materials.map((material) => ({
      id: material.id,
      displayName: material.name,
      category: "legacy-import",
      sourceStatus: inferSourceStatus(),
      provisionalStatus: "unverified",
      active: true,
      comment: "",
    })),
    members: project.members.map((member) => ({
      id: member.id,
      label: member.label ?? member.id,
      nodeI: member.nodeI,
      nodeJ: member.nodeJ,
      materialRefId: member.materialId,
      active: true,
      comment: "",
    })),
    supports: project.supports.map((support, index) => ({
      id: `SUP-${index + 1}`,
      nodeId: support.nodeId,
      label: support.nodeId,
      ux: supportStateFromBoolean(support.ux),
      uy: supportStateFromBoolean(support.uy),
      uz: supportStateFromBoolean(support.uz),
      rx: supportStateFromBoolean(support.rx),
      ry: supportStateFromBoolean(support.ry),
      rz: supportStateFromBoolean(support.rz),
      active: true,
      comment: "",
    })),
    audit: [],
  };
}

function normalizeApolloNode(value: unknown): ApolloPhase1Unit2Node | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string") return null;
  if (!isFiniteNumber(value.x) || !isFiniteNumber(value.y) || !isFiniteNumber(value.z)) return null;
  return {
    id: value.id,
    label: typeof value.label === "string" ? value.label : value.id,
    x: value.x,
    y: value.y,
    z: value.z,
    active: value.active !== false,
    comment: typeof value.comment === "string" ? value.comment : "",
  };
}

function normalizeMaterialReference(value: unknown): ApolloPhase1Unit2MaterialReference | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  const sourceStatus =
    value.sourceStatus === "licensed_source_pending" ||
    value.sourceStatus === "reference_only" ||
    value.sourceStatus === "blocked_by_numeric_evidence"
      ? value.sourceStatus
      : inferSourceStatus();
  const provisionalStatus =
    value.provisionalStatus === "provisional" || value.provisionalStatus === "unverified"
      ? value.provisionalStatus
      : "unverified";
  return {
    id: value.id,
    displayName: typeof value.displayName === "string" ? value.displayName : value.id,
    category: typeof value.category === "string" ? value.category : "general",
    sourceStatus,
    provisionalStatus,
    active: value.active !== false,
    comment: typeof value.comment === "string" ? value.comment : "",
  };
}

function normalizeApolloMember(value: unknown): ApolloPhase1Unit2Member | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  if (typeof value.nodeI !== "string" || typeof value.nodeJ !== "string") return null;
  if (typeof value.materialRefId !== "string") return null;
  return {
    id: value.id,
    label: typeof value.label === "string" ? value.label : value.id,
    nodeI: value.nodeI,
    nodeJ: value.nodeJ,
    materialRefId: value.materialRefId,
    active: value.active !== false,
    comment: typeof value.comment === "string" ? value.comment : "",
  };
}

function normalizeSupportState(value: unknown): ApolloPhase1Unit2SupportState {
  return value === "FIXED" || value === "FREE" || value === "UNDEFINED" ? value : "UNDEFINED";
}

function normalizeApolloSupport(value: unknown): ApolloPhase1Unit2Support | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.nodeId !== "string") return null;
  return {
    id: value.id,
    nodeId: value.nodeId,
    label: typeof value.label === "string" ? value.label : value.nodeId,
    ux: normalizeSupportState(value.ux),
    uy: normalizeSupportState(value.uy),
    uz: normalizeSupportState(value.uz),
    rx: normalizeSupportState(value.rx),
    ry: normalizeSupportState(value.ry),
    rz: normalizeSupportState(value.rz),
    active: value.active !== false,
    comment: typeof value.comment === "string" ? value.comment : "",
  };
}

function normalizeAuditRecord(value: unknown): ApolloPhase1Unit2AuditRecord | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.timestamp !== "string") return null;
  if (
    value.entityType !== "project" &&
    value.entityType !== "node" &&
    value.entityType !== "member" &&
    value.entityType !== "support" &&
    value.entityType !== "material"
  ) {
    return null;
  }
  if (typeof value.action !== "string" || typeof value.message !== "string") return null;
  return {
    id: value.id,
    timestamp: value.timestamp,
    action: value.action,
    entityType: value.entityType,
    entityId: typeof value.entityId === "string" ? value.entityId : null,
    message: value.message,
  };
}

export function normalizeApolloPhase1Unit2Draft(
  project: ProjectModel,
  value: unknown,
): ApolloPhase1Unit2HydrationResult {
  if (!isRecord(value)) {
    return { ok: false, diagnostics: ["Apollo Phase 1 unit 2 draft must be an object."] };
  }
  if (value.schemaVersion !== APOLLO_PHASE1_UNIT2_SCHEMA_VERSION) {
    return {
      ok: false,
      diagnostics: [
        `Apollo Phase 1 unit 2 draft schemaVersion must be ${APOLLO_PHASE1_UNIT2_SCHEMA_VERSION}.`,
      ],
    };
  }
  if (!isRecord(value.metadata)) {
    return { ok: false, diagnostics: ["Apollo Phase 1 unit 2 metadata is required."] };
  }
  const metadata: ApolloPhase1Unit2ProjectMetadata = {
    projectId:
      typeof value.metadata.projectId === "string" ? value.metadata.projectId : project.project.id,
    name: typeof value.metadata.name === "string" ? value.metadata.name : project.project.name,
    description:
      typeof value.metadata.description === "string"
        ? value.metadata.description
        : project.project.description,
    createdAt:
      typeof value.metadata.createdAt === "string" ? value.metadata.createdAt : project.project.createdAt,
    updatedAt:
      typeof value.metadata.updatedAt === "string" ? value.metadata.updatedAt : project.project.updatedAt,
    provisionalStatus:
      value.metadata.provisionalStatus === "provisional" ||
      value.metadata.provisionalStatus === "unverified"
        ? value.metadata.provisionalStatus
        : "unverified",
    localDraftStatus: value.metadata.localDraftStatus === "dirty" ? "dirty" : "saved",
  };
  const nodes = Array.isArray(value.nodes)
    ? value.nodes.map(normalizeApolloNode).filter((item): item is ApolloPhase1Unit2Node => item !== null)
    : null;
  const materialReferences = Array.isArray(value.materialReferences)
    ? value.materialReferences
        .map(normalizeMaterialReference)
        .filter((item): item is ApolloPhase1Unit2MaterialReference => item !== null)
    : null;
  const members = Array.isArray(value.members)
    ? value.members.map(normalizeApolloMember).filter((item): item is ApolloPhase1Unit2Member => item !== null)
    : null;
  const supports = Array.isArray(value.supports)
    ? value.supports.map(normalizeApolloSupport).filter((item): item is ApolloPhase1Unit2Support => item !== null)
    : null;
  const audit = Array.isArray(value.audit)
    ? value.audit.map(normalizeAuditRecord).filter((item): item is ApolloPhase1Unit2AuditRecord => item !== null)
    : [];
  if (nodes === null || materialReferences === null || members === null || supports === null) {
    return {
      ok: false,
      diagnostics: ["Apollo Phase 1 unit 2 arrays are missing or malformed."],
    };
  }
  return {
    ok: true,
    project: {
      ...project,
      project: {
        ...project.project,
        id: metadata.projectId,
        name: metadata.name,
        description: metadata.description,
        createdAt: metadata.createdAt,
        updatedAt: metadata.updatedAt,
      },
      apolloPhase1Unit2: {
        schemaVersion: APOLLO_PHASE1_UNIT2_SCHEMA_VERSION,
        metadata,
        nodes,
        materialReferences,
        members,
        supports,
        audit: audit.slice(0, MAX_AUDIT_RECORDS),
      },
    },
  };
}

export function hydrateApolloPhase1Unit2FromPersistence(project: ProjectModel): ApolloPhase1Unit2HydrationResult {
  if (project.apolloPhase1Unit2 === undefined) {
    return {
      ok: true,
      project: {
        ...project,
        apolloPhase1Unit2: createApolloPhase1Unit2DraftFromProject(project),
      },
    };
  }
  return normalizeApolloPhase1Unit2Draft(project, project.apolloPhase1Unit2);
}

export function getApolloPhase1Unit2Draft(project: ProjectModel): ApolloPhase1Unit2Draft {
  return project.apolloPhase1Unit2 ?? createApolloPhase1Unit2DraftFromProject(project);
}

function normalizeDraftForPersistence(
  _project: ProjectModel,
  draft: ApolloPhase1Unit2Draft,
): ApolloPhase1Unit2Draft {
  return {
    schemaVersion: APOLLO_PHASE1_UNIT2_SCHEMA_VERSION,
    metadata: {
      ...draft.metadata,
      projectId: draft.metadata.projectId,
      name: draft.metadata.name,
      description: draft.metadata.description,
      createdAt: draft.metadata.createdAt,
      updatedAt: draft.metadata.updatedAt,
    },
    nodes: draft.nodes.map((node) => ({ ...node })),
    materialReferences: draft.materialReferences.map((material) => ({ ...material })),
    members: draft.members.map((member) => ({ ...member })),
    supports: draft.supports.map((support) => ({ ...support })),
    audit: draft.audit.slice(0, MAX_AUDIT_RECORDS).map((entry) => ({ ...entry })),
  };
}

export function serializeApolloPhase1Unit2ForPersistence(
  project: ProjectModel,
): ApolloPhase1Unit2SerializationResult {
  const draft = getApolloPhase1Unit2Draft(project);
  const normalized = normalizeDraftForPersistence(project, draft);
  return {
    ok: true,
    project: {
      ...project,
      apolloPhase1Unit2: {
        ...normalized,
        metadata: {
          ...normalized.metadata,
          localDraftStatus: "saved",
        },
      },
    },
  };
}

export function appendApolloPhase1Unit2Audit(
  draft: ApolloPhase1Unit2Draft,
  timestamp: string,
  action: string,
  entityType: ApolloPhase1Unit2AuditRecord["entityType"],
  entityId: string | null,
  message: string,
): ApolloPhase1Unit2Draft {
  return {
    ...draft,
    audit: [
      {
        id: createAuditId(draft.audit),
        timestamp,
        action,
        entityType,
        entityId,
        message,
      },
      ...draft.audit,
    ].slice(0, MAX_AUDIT_RECORDS),
  };
}

export function withApolloPhase1Unit2Draft(
  project: ProjectModel,
  update: ApolloPhase1Unit2Draft | ((draft: ApolloPhase1Unit2Draft) => ApolloPhase1Unit2Draft),
): ProjectModel {
  const current = getApolloPhase1Unit2Draft(project);
  const next = typeof update === "function" ? update(current) : update;
  const normalized = normalizeDraftForPersistence(project, next);
  return {
    ...project,
    project: {
      ...project.project,
      id: normalized.metadata.projectId,
      name: normalized.metadata.name,
      description: normalized.metadata.description,
      createdAt: normalized.metadata.createdAt,
      updatedAt: normalized.metadata.updatedAt,
    },
    apolloPhase1Unit2: {
      ...normalized,
      metadata: {
        ...normalized.metadata,
        localDraftStatus: "dirty",
      },
    },
  };
}

function pushMapValue(target: Map<string, string[]>, key: string, value: string): void {
  const current = target.get(key);
  if (current) {
    current.push(value);
    return;
  }
  target.set(key, [value]);
}

export function buildApolloPhase1Unit2ReferenceUsage(
  draft: ApolloPhase1Unit2Draft,
): ApolloPhase1Unit2ReferenceUsage {
  const nodeToMemberIds = new Map<string, string[]>();
  const nodeToSupportIds = new Map<string, string[]>();
  const materialToMemberIds = new Map<string, string[]>();
  for (const member of draft.members) {
    pushMapValue(nodeToMemberIds, member.nodeI, member.id);
    pushMapValue(nodeToMemberIds, member.nodeJ, member.id);
    pushMapValue(materialToMemberIds, member.materialRefId, member.id);
  }
  for (const support of draft.supports) {
    pushMapValue(nodeToSupportIds, support.nodeId, support.id);
  }
  return {
    nodeToMemberIds,
    nodeToSupportIds,
    materialToMemberIds,
  };
}

function duplicateIdMessages(
  rows: readonly { readonly id: string }[],
  entityType: string,
): StructuredMessage[] {
  const seen = new Set<string>();
  const duplicates: StructuredMessage[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) {
      duplicates.push({
        code: `APOLLO_${entityType}_DUPLICATE_ID`,
        message: `Duplicate ${entityType.toLowerCase()} id detected: ${row.id}`,
        path: null,
        entityType,
        entityId: row.id,
      });
      continue;
    }
    seen.add(row.id);
  }
  return duplicates;
}

export function validateApolloPhase1Unit2Draft(
  draft: ApolloPhase1Unit2Draft,
): ApolloPhase1Unit2Validation {
  const errors: StructuredMessage[] = [];
  const warnings: StructuredMessage[] = [];
  if (sanitizeText(draft.metadata.name).length === 0) {
    errors.push({
      code: "APOLLO_PROJECT_NAME_REQUIRED",
      message: "Project name is required for the Apollo unit 2 draft.",
      path: "/apolloPhase1Unit2/metadata/name",
      entityType: "project",
      entityId: draft.metadata.projectId,
    });
  }
  errors.push(...duplicateIdMessages(draft.nodes, "node"));
  errors.push(...duplicateIdMessages(draft.materialReferences, "material"));
  errors.push(...duplicateIdMessages(draft.members, "member"));
  errors.push(...duplicateIdMessages(draft.supports, "support"));

  const nodeIds = new Set(draft.nodes.map((node) => node.id));
  const materialIds = new Set(draft.materialReferences.map((material) => material.id));
  const activeMaterialIds = new Set(
    draft.materialReferences.filter((material) => material.active).map((material) => material.id),
  );
  const usage = buildApolloPhase1Unit2ReferenceUsage(draft);

  for (const node of draft.nodes) {
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y) || !Number.isFinite(node.z)) {
      errors.push({
        code: "APOLLO_NODE_COORDINATE_INVALID",
        message: `Node ${node.id} must use finite X/Y/Z coordinates.`,
        path: null,
        entityType: "node",
        entityId: node.id,
      });
    }
  }

  for (const member of draft.members) {
    if (!nodeIds.has(member.nodeI) || !nodeIds.has(member.nodeJ)) {
      errors.push({
        code: "APOLLO_MEMBER_NODE_REFERENCE_INVALID",
        message: `Member ${member.id} references a missing node.`,
        path: null,
        entityType: "member",
        entityId: member.id,
      });
    }
    if (member.nodeI === member.nodeJ) {
      errors.push({
        code: "APOLLO_MEMBER_SELF_REFERENCE",
        message: `Member ${member.id} cannot reference the same node at both ends.`,
        path: null,
        entityType: "member",
        entityId: member.id,
      });
    }
    if (!materialIds.has(member.materialRefId)) {
      errors.push({
        code: "APOLLO_MEMBER_MATERIAL_REFERENCE_INVALID",
        message: `Member ${member.id} references a missing material shell.`,
        path: null,
        entityType: "member",
        entityId: member.id,
      });
    } else if (!activeMaterialIds.has(member.materialRefId) && member.active) {
      warnings.push({
        code: "APOLLO_MEMBER_INACTIVE_MATERIAL",
        message: `Active member ${member.id} references inactive material ${member.materialRefId}.`,
        path: null,
        entityType: "member",
        entityId: member.id,
      });
    }
  }

  for (const support of draft.supports) {
    if (!nodeIds.has(support.nodeId)) {
      errors.push({
        code: "APOLLO_SUPPORT_NODE_REFERENCE_INVALID",
        message: `Support ${support.id} references a missing node.`,
        path: null,
        entityType: "support",
        entityId: support.id,
      });
    }
    if (
      support.ux === "UNDEFINED" &&
      support.uy === "UNDEFINED" &&
      support.uz === "UNDEFINED" &&
      support.rx === "UNDEFINED" &&
      support.ry === "UNDEFINED" &&
      support.rz === "UNDEFINED"
    ) {
      warnings.push({
        code: "APOLLO_SUPPORT_ALL_UNDEFINED",
        message: `Support ${support.id} leaves all DOFs undefined.`,
        path: null,
        entityType: "support",
        entityId: support.id,
      });
    }
  }

  for (const node of draft.nodes) {
    const memberRefs = usage.nodeToMemberIds.get(node.id) ?? [];
    const supportRefs = usage.nodeToSupportIds.get(node.id) ?? [];
    if (!node.active && (memberRefs.length > 0 || supportRefs.length > 0)) {
      warnings.push({
        code: "APOLLO_NODE_INACTIVE_IN_USE",
        message: `Inactive node ${node.id} is still referenced by members or supports.`,
        path: null,
        entityType: "node",
        entityId: node.id,
      });
    }
  }

  return { errors, warnings };
}

export function buildApolloPhase1Unit2ViewProject(project: ProjectModel): ProjectModel {
  const draft = getApolloPhase1Unit2Draft(project);
  const fallbackMaterialId = project.materials[0]?.id ?? "";
  const fallbackSectionId = project.sections[0]?.id ?? "";
  return {
    ...project,
    project: {
      ...project.project,
      id: draft.metadata.projectId,
      name: draft.metadata.name,
      description: draft.metadata.description,
      createdAt: draft.metadata.createdAt,
      updatedAt: draft.metadata.updatedAt,
    },
    nodes: draft.nodes.map((node) => ({
      id: node.id,
      x: node.x,
      y: node.y,
      z: node.z,
      label: node.label,
    })),
    members: draft.members.map((member) => ({
      id: member.id,
      nodeI: member.nodeI,
      nodeJ: member.nodeJ,
      materialId: fallbackMaterialId,
      sectionId: fallbackSectionId,
      label: member.label,
    })),
    supports: draft.supports.map((support) => ({
      id: support.id,
      nodeId: support.nodeId,
      ux: supportBooleanFromState(support.ux),
      uy: supportBooleanFromState(support.uy),
      uz: supportBooleanFromState(support.uz),
      rx: supportBooleanFromState(support.rx),
      ry: supportBooleanFromState(support.ry),
      rz: supportBooleanFromState(support.rz),
    })),
    loadCases: [],
    nodalLoads: [],
    memberLoads: [],
  };
}
