/**
 * CIM Integrated 3D scene builder (Phase 8-01 FROZEN / Phase 8-02 WP-A).
 *
 * Reads each module's canonical source and assembles the derived CIM layers in
 * the shared world coordinate space (renderCoordinate). The scene is never
 * persisted; it is deterministically regenerated from the source documents.
 *
 * WP-A wires: terrain / existing / roadPavement / bridgeLayout.
 * Superstructure / substructure / foundation / bearing / FEM are layered in by
 * later work packages (WP-E/F/G/H) through the same layer contract.
 */

import * as THREE from "three";
import type { ProjectManager } from "../../project/projectManager";
import { readTerrainDocument } from "../terrainModuleAdapter";
import { readExistingConditions } from "../existingConditionsAdapter";
import { readRoadData } from "../roadModuleAdapter";
import { loadRoadEditorDraft } from "../road/roadEditorDraft";
import { buildRoadMesh } from "../road/roadMesh";
import { gridToMesh, type TerrainMesh } from "../terrain/terrainSurface";
import { createReferenceMountain } from "../terrain/referenceMountain";
import { buildExistingSceneGroup } from "../existingViewerBuilder";
import { buildTerrainThreeScene, applyDomainToThreeTransform } from "../terrain/terrainViewerBuilder";
import { domainVerticesToThree } from "../renderCoordinate";
import { readBridgeLayoutDocument } from "../bridgeLayoutModuleAdapter";
import { buildBridgeLayoutThreeScene, type BridgeLayoutSceneBuildResult } from "../bridgeLayout/bridgeLayoutScene";
import { readRoadAlignmentContext } from "../bridgeLayout/bridgeLayoutDomain";
import { verticalDraftAlignmentToElements } from "../road/verticalDraftBridge";
import { buildRoadCimSurface } from "./roadCimSurface";
import { buildSuperstructureCimLayer } from "./superstructureCimLayer";
import { buildSubstructureCimLayer } from "./substructureCimLayer";
import { buildAnalysisCimLayer } from "./analysisCimLayer";
import {
  attachCimMetadata,
  defaultCimLayerState,
  mergeBounds,
  type CimEntityMetadata,
  type CimLayerId,
  type CimLayerState,
  type Integrated3DScene,
} from "./integrated3dScene";

function layerGroup(state: CimLayerState, layer: CimLayerId): THREE.Group | null {
  return state[layer] ? new THREE.Group() : null;
}

/** Default reference terrain mesh (Reference Mountain grid). */
export function referenceTerrainMesh(): TerrainMesh {
  return gridToMesh(createReferenceMountain().terrainGrid);
}

function buildRoadMeshFromCanonical(manager: ProjectManager, projectId: string) {
  const roadData = readRoadData(manager, projectId);
  if (!roadData) {
    return null;
  }
  const loaded = loadRoadEditorDraft(roadData);
  if (!loaded.ok) {
    return null;
  }
  const draft = loaded.draft;
  const vertical = verticalDraftAlignmentToElements(draft.verticalAlignment);
  const crossSection = Array.isArray(draft.crossSections) ? draft.crossSections[0] : undefined;
  if (!crossSection) {
    return null;
  }
  const mesh = buildRoadMesh({
    horizontal: draft.alignment,
    vertical,
    crossSection,
    widthChangePoints: draft.widthChangePoints ?? [],
    crossSlopeIntervals: draft.crossSlopeIntervals ?? [],
    stationInterval: 5,
  });
  return mesh.vertices.length > 0 ? mesh : null;
}

/** Load the canonical roadData and build the Road CIM surface (width/widening/cross-slope aware). */
function buildRoadSurfaceFromCanonical(manager: ProjectManager, projectId: string) {
  const roadData = readRoadData(manager, projectId);
  if (!roadData) {
    return null;
  }
  const loaded = loadRoadEditorDraft(roadData);
  if (!loaded.ok) {
    return null;
  }
  const surface = buildRoadCimSurface(loaded.draft, { sampleInterval: 5 });
  return surface.vertices.length > 0 ? surface : null;
}

export interface BuildCimSceneInput {
  readonly layerState?: CimLayerState;
  /** Reference Mountain fallback terrain when the terrain document has no mesh data. */
  readonly useReferenceTerrain?: boolean;
  /** Authoritative IF3 result to overlay (deformed / reaction / N-Q-M-T). */
  readonly if3Result?: import("../../../contracts/frameAnalysisResultResource").FrameAnalysisResultResource | null;
  /** Result component for the member force color map. */
  readonly resultComponent?: "N" | "Q" | "M" | "T";
}

/**
 * Assemble the full derived CIM scene from the project's canonical sources.
 */
export function buildIntegrated3DScene(
  manager: ProjectManager,
  projectId: string,
  input: BuildCimSceneInput = {},
): Integrated3DScene {
  const issues: { path: string; message: string }[] = [];
  const layerState = input.layerState ?? defaultCimLayerState();
  const metadata: CimEntityMetadata[] = [];
  const layers: Partial<Record<CimLayerId, THREE.Group>> = {};
  const bounds: THREE.Box3[] = [];

  // --- terrain ---
  const terrainGroup = layerGroup(layerState, "terrain");
  if (terrainGroup) {
    const terrainMesh = referenceTerrainMesh();
    if (terrainMesh.vertices.length > 0) {
      const built = buildTerrainThreeScene(terrainMesh);
      applyDomainToThreeTransform(built.mesh, null);
      built.wireframe.visible = false;
      const terrainMeta: CimEntityMetadata = {
        sourceModule: "terrain",
        sourceEntityId: "reference-mountain",
        stableId: "terrain:reference-mountain",
        coordinateContext: "world",
        label: "Reference Mountain 地形",
      };
      attachCimMetadata(built.mesh, terrainMeta);
      terrainGroup.add(built.mesh);
      terrainGroup.add(built.wireframe);
      built.mesh.geometry.computeBoundingBox();
      bounds.push(built.mesh.geometry.boundingBox!);
      metadata.push(terrainMeta);
    }
    layers.terrain = terrainGroup;
  }

  // --- existing ---
  const existingDoc = readExistingConditions(manager, projectId);
  const existingEntities = existingDoc?.entities ?? [];
  if (existingEntities.length > 0) {
    const existingGroup = layerGroup(layerState, "existing");
    if (existingGroup) {
      const built = buildExistingSceneGroup(existingEntities, null);
      existingEntities.forEach((entity, index) => {
        const child = built.children[index];
        if (child) {
          attachCimMetadata(child, {
            sourceModule: "existing",
            sourceEntityId: entity.entityId,
            stableId: `existing:${entity.entityId}`,
            coordinateContext: "world",
            label: entity.label ?? entity.entityId,
            meta: { type: entity.type },
          });
        }
      });
      const existingBounds = new THREE.Box3().setFromObject(built);
      if (!existingBounds.isEmpty()) {
        bounds.push(existingBounds);
      }
      existingGroup.add(built);
      layers.existing = existingGroup;
      metadata.push(...existingEntities.map((entity) => ({
        sourceModule: "existing" as const,
        sourceEntityId: entity.entityId,
        stableId: `existing:${entity.entityId}`,
        coordinateContext: "world",
        label: entity.label ?? entity.entityId,
        meta: { type: entity.type },
      })));
    }
  }

  // --- roadPavement ---
  const roadGroup = layerGroup(layerState, "roadPavement") ?? new THREE.Group();
  const roadMeshData = buildRoadSurfaceFromCanonical(manager, projectId);
  if (roadMeshData) {
    const triples = new Float32Array(roadMeshData.vertices.length * 3);
    for (let i = 0; i < roadMeshData.vertices.length; i += 1) {
      const v = roadMeshData.vertices[i];
      triples[i * 3] = v.x;
      triples[i * 3 + 1] = v.y;
      triples[i * 3 + 2] = v.z;
    }
    const position = domainVerticesToThree(triples, null);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(position, 3));
    const indices: number[] = [];
    for (const t of roadMeshData.triangles) {
      indices.push(t.a, t.b, t.c);
    }
    geo.setIndex(indices);
    geo.computeVertexNormals();
    // Raise slightly above the terrain to avoid z-fighting at equal elevation.
    geo.translate(0, 0.2, 0);
    geo.computeBoundingBox();
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, side: THREE.DoubleSide, roughness: 0.8 }),
    );
    const roadMeta: CimEntityMetadata = {
      sourceModule: "roadPavement",
      sourceEntityId: "road-surface",
      stableId: `road-surface:${roadMeshData.stationCount > 0 ? "canonical" : "empty"}`,
      coordinateContext: "world",
      label: "道路面（Road CIM）",
      meta: { stations: roadMeshData.stationCount, width: Math.round(roadMeshData.width) },
    };
    attachCimMetadata(mesh, roadMeta);
    roadGroup.add(mesh);
    bounds.push(geo.boundingBox!);
    metadata.push(roadMeta);
  }
  layers.roadPavement = roadGroup;

  // --- bridgeLayout ---
  const bridgeDoc = readBridgeLayoutDocument(manager, projectId);
  const roadContext = readRoadAlignmentContext(manager, projectId);
  const bridgeGroup = layerGroup(layerState, "bridgeLayout") ?? new THREE.Group();
  const roadMeshForBridge = buildRoadMeshFromCanonical(manager, projectId);
  if (bridgeDoc) {
    const bridgeInput = {
      terrain: null as TerrainMesh | null,
      road: roadMeshForBridge,
      existing: existingEntities,
      roadContext: roadContext.ok ? roadContext : null,
      bridgeRange: bridgeDoc.bridgeRange ?? null,
      candidateA1: bridgeDoc.abutments?.A1?.placement ?? null,
      candidateA2: bridgeDoc.abutments?.A2?.placement ?? null,
      piers: (bridgeDoc.piers ?? [])
        .filter((p) => p.placement)
        .map((p) => ({
          supportId: p.supportId,
          label: p.label ?? p.supportId,
          station: p.station,
          candidate: p.placement!,
          skewAngleRad: p.skewAngleRad,
        })),
      spans: (bridgeDoc.spans ?? []).map((s) => ({
        spanId: s.spanId,
        from: s.startSupportId,
        to: s.endSupportId,
        length: s.length,
      })),
      localOrigin: null,
    };
    const built: BridgeLayoutSceneBuildResult = buildBridgeLayoutThreeScene(bridgeInput);
    // attach metadata to pier markers + abutments + span labels by stable id
    bridgeGroup.add(built.group);
    if (built.bounds && !built.bounds.isEmpty()) {
      bounds.push(built.bounds);
    }
    metadata.push(
      ...(bridgeDoc.piers ?? []).map((p) => ({
        sourceModule: "bridgeLayout" as const,
        sourceEntityId: p.supportId,
        stableId: `bridge:${p.supportId}`,
        coordinateContext: "world",
        label: p.label ?? p.supportId,
        meta: { station: p.station, skewAngleRad: p.skewAngleRad },
      })),
      ...((bridgeDoc.abutments?.A1 ?? null) ? [{
        sourceModule: "bridgeLayout" as const,
        sourceEntityId: "A1",
        stableId: "bridge:A1",
        coordinateContext: "world",
        label: "A1",
      }] : []),
      ...((bridgeDoc.abutments?.A2 ?? null) ? [{
        sourceModule: "bridgeLayout" as const,
        sourceEntityId: "A2",
        stableId: "bridge:A2",
        coordinateContext: "world",
        label: "A2",
      }] : []),
    );
    layers.bridgeLayout = bridgeGroup;
  } else {
    layers.bridgeLayout = bridgeGroup;
  }

  // --- superstructure / substructure / foundation / bearing (WP-E/F/G) ---
  const superLayer = new THREE.Group();
  const subLayer = new THREE.Group();
  const foundationLayer = new THREE.Group();
  const bearingLayer = new THREE.Group();

  const superCim = buildSuperstructureCimLayer(manager, projectId);
  superLayer.add(superCim.superstructureGroup);
  bearingLayer.add(superCim.bearingGroup);
  metadata.push(...superCim.metadata);

  const subCim = buildSubstructureCimLayer(manager, projectId);
  subLayer.add(subCim.substructureGroup);
  foundationLayer.add(subCim.foundationGroup);
  metadata.push(...subCim.metadata);

  layers.superstructure = superLayer;
  layers.substructure = subLayer;
  layers.foundation = foundationLayer;
  layers.bearing = bearingLayer;

  // --- analysis / FEM overlay (WP-H) ---
  const regeneratedFrom: { module: string; checksum?: string }[] = [
    { module: "terrain", checksum: "reference-mountain" },
    { module: "road" },
    { module: "bridgeLayout" },
    { module: "superstructure" },
    { module: "substructure" },
    { module: "analysis" },
  ];
  const analysis = buildAnalysisCimLayer(manager, projectId, {
    if3Result: input.if3Result ?? null,
    resultComponent: input.resultComponent ?? "N",
  });
  layers.femNodes = analysis.femNodesGroup;
  layers.femMembers = analysis.femMembersGroup;
  layers.supports = analysis.supportsGroup;
  layers.springs = analysis.springsGroup;
  layers.loads = analysis.loadsGroup;
  layers.deformed = analysis.deformedGroup;
  layers.reaction = analysis.reactionGroup;
  layers.result = analysis.resultGroup;
  metadata.push(...analysis.metadata);
  if (analysis.resultStatus !== "none") {
    regeneratedFrom.push({ module: "analysisResult", checksum: analysis.resultStatus });
  }

  // --- labels / reference (WP-I) ---
  const deferredLayers: CimLayerId[] = ["labels", "reference"];
  for (const layer of deferredLayers) {
    layers[layer] = new THREE.Group();
  }

  const merged = mergeBounds(...bounds);

  return {
    ok: issues.length === 0,
    issues,
    layers,
    metadata,
    bounds: merged,
    regeneratedFrom,
  };
}
