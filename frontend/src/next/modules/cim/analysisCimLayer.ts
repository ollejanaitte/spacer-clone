/**
 * Analysis / FEM CIM overlay layers (Phase 8-02 WP-H).
 *
 * Renders FEM nodes / members / supports / springs / loads from the canonical
 * AnalysisDocument, plus a result overlay (deformed / reaction / N-Q-M-T color
 * map) from an IF3 result resource. Result layers are guarded by the IF3
 * status + analysis document status; stale results are never rendered as
 * authoritative.
 */

import * as THREE from "three";
import type { ProjectManager } from "../../project/projectManager";
import { readModuleFromManager } from "../adapter";
import { deserializeAnalysisModuleDataFromPersistence } from "../analysis/analysisModuleData";
import type { AnalysisDocument } from "../analysis/analysisDocumentTypes";
import type { FrameAnalysisResultResource } from "../../../contracts/frameAnalysisResultResource";
import { extractLinearStaticResultFromIf3, isAuthoritativeIf3For } from "../analysis/resultAdapter";
import { deriveAnalysisEntityId } from "../analysis/analysisId";
import { memberForceColor, computeForceColorRange } from "../../../viewer/memberForceColorMap";
import { domainToThree } from "../renderCoordinate";
import { attachCimMetadata, type CimEntityMetadata, type CimLayerId } from "./integrated3dScene";
import { buildAnalysisModel } from "../analysis/analysisModel";
import { finalizeAnalysisDocument } from "../analysis/analysisDocument";
import { buildAuthorizedDeadLoad } from "../analysis/authorizedDeadLoad";
import { readSuperstructureDocument } from "../superstructureModuleAdapter";
import { regenerateSuperstructureDerived } from "../superstructure/superstructurePersistence";
import { readSubstructureDocument } from "../substructureModuleAdapter";
import { buildLinerIntermediateFromRoad, generateSuperstructureSnapshot } from "../superstructure/superstructureGeometry";
import { readRoadData } from "../roadModuleAdapter";
import { loadRoadEditorDraft } from "../road/roadEditorDraft";
import { verticalDraftAlignmentToElements } from "../road/verticalDraftBridge";

export interface AnalysisCimLayerResult {
  readonly femNodesGroup: THREE.Group;
  readonly femMembersGroup: THREE.Group;
  readonly supportsGroup: THREE.Group;
  readonly springsGroup: THREE.Group;
  readonly loadsGroup: THREE.Group;
  readonly deformedGroup: THREE.Group;
  readonly reactionGroup: THREE.Group;
  readonly resultGroup: THREE.Group;
  readonly metadata: readonly CimEntityMetadata[];
  readonly ok: boolean;
  readonly issues: readonly { path: string; message: string }[];
  readonly resultStatus: "none" | "authoritative" | "stale" | "invalid";
}

/** Read the canonical AnalysisDocument from the project. */
export function readAnalysisDocument(manager: ProjectManager, projectId: string): AnalysisDocument | undefined {
  const moduleData = readModuleFromManager(manager, projectId, "analysis");
  const raw = moduleData?.data?.analysisDocument;
  if (raw === undefined) {
    return undefined;
  }
  const parsed = deserializeAnalysisModuleDataFromPersistence({ analysisDocument: raw });
  return parsed.ok ? parsed.data.analysisDocument : undefined;
}

/** Build a derived FEM AnalysisDocument from the super/sub models (no stored doc). */
export function buildDerivedAnalysisDocument(
  manager: ProjectManager,
  projectId: string,
): AnalysisDocument | undefined {
  const superDoc = readSuperstructureDocument(manager, projectId);
  if (!superDoc) {
    return undefined;
  }
  const roadData = readRoadData(manager, projectId);
  if (!roadData) {
    return undefined;
  }
  const loaded = loadRoadEditorDraft(roadData);
  if (!loaded.ok) {
    return undefined;
  }
  const draft = loaded.draft;
  const intermediate = buildLinerIntermediateFromRoad({
    label: "",
    horizontal: draft.alignment,
    vertical: verticalDraftAlignmentToElements(draft.verticalAlignment),
    crossSections: draft.crossSections ?? [],
  } as never);
  if (!intermediate) {
    return undefined;
  }
  const regen = regenerateSuperstructureDerived(manager, projectId, superDoc);
  const generated = generateSuperstructureSnapshot(intermediate, regen);
  if (!generated.ok) {
    return undefined;
  }
  const subDoc = readSubstructureDocument(manager, projectId);
  const model = buildAnalysisModel({
    projectId,
    createdBy: "cim-integrated3d",
    superstructure: superDoc,
    substructure: subDoc ?? null,
    snapshot: generated.snapshot,
    sourceReferences: { bridgeLayout: null, superstructure: null, substructure: null, loadFingerprint: null, solverSettingsFingerprint: null },
  });
  // The derived AnalysisDocument must have a STABLE documentId across builds
  // (Phase 9-04R3 Sol #2): otherwise the IF3 source binding (sourceDocumentId)
  // can never match a fresh rebuild and authoritative results would be INVALID.
  const stableDocumentId = deriveAnalysisEntityId("analysis-document", projectId);
  const base = { ...model.document, documentId: stableDocumentId };
  // Authorized dead-load case (WP-R2D): derived from the FROZEN load model,
  // never invented. Uses the regenerated document so span references (from
  // Bridge Layout) feed the load model. Fail-closed when no finite total.
  const load = buildAuthorizedDeadLoad(regen, base);
  if (load !== null) {
    const withLoads = finalizeAnalysisDocument({
      ...base,
      loadCases: [load.loadCase],
      nodalLoads: load.nodalLoads,
      analysisStatus: "NOT_RUN",
    });
    return withLoads;
  }
  return base;
}

const NODE_COLOR = 0x64748b;
const MEMBER_COLOR = 0x334155;
const SUPPORT_COLOR = 0x16a34a;
const SPRING_COLOR = 0x9333ea;
const LOAD_COLOR = 0xdc2626;
const REACTION_COLOR = 0x059669;
const NODE_RADIUS = 0.35;
const DEFORMATION_SCALE = 100;

function toThree(x: number, y: number, z: number): [number, number, number] {
  return domainToThree({ x, y, z });
}

export interface AnalysisOverlayInput {
  readonly if3Result?: FrameAnalysisResultResource | null;
  readonly resultComponent?: "N" | "Q" | "M" | "T";
}

export function buildAnalysisCimLayer(
  manager: ProjectManager,
  projectId: string,
  input: AnalysisOverlayInput = {},
): AnalysisCimLayerResult {
  const document = readAnalysisDocument(manager, projectId)
    ?? buildDerivedAnalysisDocument(manager, projectId);
  const femNodesGroup = new THREE.Group();
  const femMembersGroup = new THREE.Group();
  const supportsGroup = new THREE.Group();
  const springsGroup = new THREE.Group();
  const loadsGroup = new THREE.Group();
  const deformedGroup = new THREE.Group();
  const reactionGroup = new THREE.Group();
  const resultGroup = new THREE.Group();
  const metadata: CimEntityMetadata[] = [];

  if (!document) {
    return {
      femNodesGroup, femMembersGroup, supportsGroup, springsGroup, loadsGroup,
      deformedGroup, reactionGroup, resultGroup, metadata,
      ok: true, issues: [], resultStatus: "none",
    };
  }

  const nodeById = new Map<string, AnalysisDocument["nodes"][number]>(
    document.nodes.map((n) => [n.entityId, n] as const),
  );
  const addMeta = (layer: CimLayerId, sourceEntityId: string, stableId: string, mesh: THREE.Object3D, label?: string) => {
    const meta: CimEntityMetadata = {
      sourceModule: layer,
      sourceEntityId,
      stableId,
      coordinateContext: "world",
      label: label ?? sourceEntityId,
    };
    attachCimMetadata(mesh, meta);
    metadata.push(meta);
  };

  // FEM nodes
  for (const node of document.nodes) {
    const [tx, ty, tz] = toThree(node.x, node.y, node.z);
    const geo = new THREE.SphereGeometry(NODE_RADIUS, 8, 8);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: NODE_COLOR }));
    mesh.position.set(tx, ty, tz);
    addMeta("femNodes", node.sourceEntityId, `fem:${node.entityId}`, mesh, node.entityId);
    femNodesGroup.add(mesh);
  }

  // FEM members
  for (const member of document.members) {
    const nodeI = nodeById.get(member.nodeIId);
    const nodeJ = nodeById.get(member.nodeJId);
    if (!nodeI || !nodeJ) continue;
    const points: [number, number, number][] = [
      toThree(nodeI.x, nodeI.y, nodeI.z),
      toThree(nodeJ.x, nodeJ.y, nodeJ.z),
    ];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(
      points.map((p) => new THREE.Vector3(...p)),
    );
    const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: MEMBER_COLOR }));
    addMeta("femMembers", member.sourceEntityId, `fem:${member.entityId}`, line, member.entityId);
    femMembersGroup.add(line);
  }

  // Supports
  for (const support of document.supports) {
    const node = nodeById.get(support.nodeId);
    if (!node) continue;
    const [tx, ty, tz] = toThree(node.x, node.y, node.z);
    const geo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: SUPPORT_COLOR }));
    mesh.position.set(tx, ty, tz);
    addMeta("supports", support.sourceEntityId, `fem:${support.entityId}`, mesh, support.entityId);
    supportsGroup.add(mesh);
  }

  // Springs
  for (const spring of [...document.springs, ...document.foundationSprings]) {
    const node = nodeById.get(spring.nodeId);
    if (!node) continue;
    const [tx, ty, tz] = toThree(node.x, node.y, node.z);
    const geo = new THREE.CylinderGeometry(0.2, 0.2, 1.2, 8);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: SPRING_COLOR }));
    mesh.position.set(tx, ty, tz);
    addMeta("springs", spring.entityId, `fem:${spring.entityId}`, mesh, spring.entityId);
    springsGroup.add(mesh);
  }

  // Loads (nodal loads as arrows along the largest component)
  for (const load of document.nodalLoads) {
    const node = nodeById.get(load.nodeId);
    if (!node) continue;
    const magnitude = Math.hypot(load.fx, load.fy, load.fz);
    if (magnitude < 1e-9) continue;
    const [tx, ty, tz] = toThree(node.x, node.y, node.z);
    const dir = new THREE.Vector3(load.fx, load.fz, -load.fy).normalize();
    const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(tx, ty, tz), 3, LOAD_COLOR, 1, 0.6);
    addMeta("loads", load.id, `fem:${load.id}`, arrow, load.id);
    loadsGroup.add(arrow);
  }

  // Result overlay (only when an IF3 result is supplied)
  let resultStatus: "none" | "authoritative" | "stale" | "invalid" = "none";
  if (input.if3Result) {
    // Sol review #2 (Phase 9-04R3): authoritative only on (a) explicit
    // SUCCEEDED, (b) runtime schema validation, AND (c) source binding to the
    // current AnalysisDocument (documentId/revision/modelChecksum) + required
    // result kinds present. undefined/unknown/PARTIAL/FAILED/mismatched are
    // INVALID (fail-closed).
    const status = (input.if3Result as { status?: string }).status;
    const authoritative = status === "SUCCEEDED" && isAuthoritativeIf3For(input.if3Result, {
      documentId: document.documentId,
      revisionId: document.revisionId,
      modelChecksum: document.modelChecksum,
      nodeIds: document.nodes.map((n) => n.entityId),
      memberIds: document.members.map((m) => m.entityId),
    });
    resultStatus = authoritative ? "authoritative" : status === "STALE" || status === "stale" ? "stale" : "invalid";
    if (authoritative) {
      const result = extractLinearStaticResultFromIf3(input.if3Result);

      // Reaction arrows
      for (const row of result.reactions) {
        const node = nodeById.get(row.nodeId);
        if (!node || row.fz === undefined || Math.abs(row.fz) < 1e-9) continue;
        const [tx, ty, tz] = toThree(node.x, node.y, node.z);
        const dir = new THREE.Vector3(0, row.fz >= 0 ? 1 : -1, 0);
        const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(tx, ty, tz), Math.max(1, Math.abs(row.fz) * 0.05), REACTION_COLOR, 0.8, 0.5);
        addMeta("reaction", row.nodeId, `fem:reaction:${row.nodeId}`, arrow, `反力 ${row.nodeId}`);
        reactionGroup.add(arrow);
      }

      // Deformed shape (scaled displacement). Only members with displacement
      // for BOTH end nodes are drawn; missing displacement is never coerced to
      // 0 (Sol review #3 / #1).
      const displacementByNode = new Map<string, (typeof result.displacements)[number]>(
        result.displacements.map((d) => [d.nodeId, d] as const),
      );
      for (const member of document.members) {
        const nodeI = nodeById.get(member.nodeIId);
        const nodeJ = nodeById.get(member.nodeJId);
        if (!nodeI || !nodeJ) continue;
        const di = displacementByNode.get(member.nodeIId);
        const dj = displacementByNode.get(member.nodeJId);
        if (!di || !dj) continue;
        if (di.ux === undefined || di.uy === undefined || di.uz === undefined
          || dj.ux === undefined || dj.uy === undefined || dj.uz === undefined) continue;
        const ax = nodeI.x + di.ux * DEFORMATION_SCALE;
        const ay = nodeI.y + di.uy * DEFORMATION_SCALE;
        const az = nodeI.z + di.uz * DEFORMATION_SCALE;
        const bx = nodeJ.x + dj.ux * DEFORMATION_SCALE;
        const by = nodeJ.y + dj.uy * DEFORMATION_SCALE;
        const bz = nodeJ.z + dj.uz * DEFORMATION_SCALE;
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(...toThree(ax, ay, az)),
          new THREE.Vector3(...toThree(bx, by, bz)),
        ]);
        const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xf97316 }));
        addMeta("deformed", member.sourceEntityId, `fem:deformed:${member.entityId}`, line, member.entityId);
        deformedGroup.add(line);
      }

      // Member force color map (N / Q / M / T)
      const componentKey = input.resultComponent ?? "N";
      const valueByMember = new Map<string, number>();
      for (const row of result.memberForces) {
        const iVal = componentKey === "N" ? row.i.fx
          : componentKey === "Q" ? (row.i.fy !== undefined && row.i.fz !== undefined ? Math.hypot(row.i.fy, row.i.fz) : undefined)
          : componentKey === "M" ? (row.i.my !== undefined && row.i.mz !== undefined ? Math.hypot(row.i.my, row.i.mz) : undefined)
          : row.i.mx;
        const jVal = componentKey === "N" ? row.j.fx
          : componentKey === "Q" ? (row.j.fy !== undefined && row.j.fz !== undefined ? Math.hypot(row.j.fy, row.j.fz) : undefined)
          : componentKey === "M" ? (row.j.my !== undefined && row.j.mz !== undefined ? Math.hypot(row.j.my, row.j.mz) : undefined)
          : row.j.mx;
        const absI = iVal === undefined ? undefined : Math.abs(iVal);
        const absJ = jVal === undefined ? undefined : Math.abs(jVal);
        if (absI === undefined && absJ === undefined) continue;
        valueByMember.set(row.memberId, Math.max(absI ?? 0, absJ ?? 0));
      }
      const range = computeForceColorRange(valueByMember);
      for (const member of document.members) {
        const nodeI = nodeById.get(member.nodeIId);
        const nodeJ = nodeById.get(member.nodeJId);
        if (!nodeI || !nodeJ) continue;
        const value = valueByMember.get(member.entityId);
        // Only members with a real result value are rendered in the overlay;
        // members without a value are NOT drawn (Sol review #3).
        if (value === undefined) continue;
        const color = parseInt(memberForceColor(value, range).slice(1), 16);
        const points: [number, number, number][] = [
          toThree(nodeI.x, nodeI.y, nodeI.z),
          toThree(nodeJ.x, nodeJ.y, nodeJ.z),
        ];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(
          points.map((p) => new THREE.Vector3(...p)),
        );
        const line = new THREE.Line(
          lineGeo,
          new THREE.LineBasicMaterial({ color, linewidth: 2 }),
        );
        addMeta("result", member.sourceEntityId, `fem:result:${member.entityId}`, line, member.entityId);
        resultGroup.add(line);
      }
    }
  }

  return {
    femNodesGroup, femMembersGroup, supportsGroup, springsGroup, loadsGroup,
    deformedGroup, reactionGroup, resultGroup, metadata,
    ok: true, issues: [], resultStatus,
  };
}
