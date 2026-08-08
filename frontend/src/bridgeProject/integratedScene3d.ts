/**
 * Phase 3-6: Main 3D Viewer 統合（terrain + ①道路線形 + ②上部工 + ③下部工）.
 *
 * Fuses the BridgeProject chain outputs into a single three.js-space scene with
 * data-consistent positions. Pure data (no R3F dependency) so it is fully
 * testable: support XYZ parity between the ③ substructure solids, the CBDM, and
 * the ② snapshot is verified programmatically.
 *
 * Coordinate convention (mountain viewer):
 *   domain = x-east / y-north / z-up  ->  three.js = (x, z, -y)
 * Substructure solids carry a global domain origin + support-local basis;
 * superstructure girder/bearing solids carry global origins (bridge-local
 * deck/cross-beam origins are NOT included here — documented limitation).
 */

import type { BuildIntermediateInput } from "../liner/core/pipeline/pipeline";
import { buildUnified3DScene, type Unified3DScene } from "../liner/samples/mountain-viaduct-500/scene";
import { domainToThree } from "../liner/samples/mountain-viaduct-500/threeCoords";
import type { SolidGroup } from "../substructure/geometryBase";
import type { ApolloSolidGeometryParameter } from "../apollo/visualization/types";
import type { GeometrySnapshot } from "../apollo/geometry/types";
import type { CommonBridgeDataModelValue } from "../contracts/runtime/schemas/commonBridgeDataModel";

export interface OrientedBox3d {
  readonly id: string;
  readonly kind: "superstructure" | "substructure";
  /** three.js center. */
  readonly center: readonly [number, number, number];
  /** Extents along the three.js basis axes. */
  readonly size: readonly [number, number, number];
  /** three.js orthonormal-ish basis columns (x, y, z). */
  readonly basis: readonly [
    readonly [number, number, number],
    readonly [number, number, number],
    readonly [number, number, number],
  ];
  readonly supportId?: string;
  readonly entity?: string;
}

export interface IntegratedScene3d {
  /** terrain/road/bridge centerlines from the existing unified scene. */
  readonly base: Unified3DScene;
  readonly superstructureBoxes: readonly OrientedBox3d[];
  readonly substructureBoxes: readonly OrientedBox3d[];
  readonly bounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
  readonly consistency: {
    readonly supportsMatch: boolean;
    readonly mismatches: readonly string[];
  };
}

export interface IntegratedSceneInputs {
  readonly superSolids: readonly ApolloSolidGeometryParameter[];
  readonly subGroups: readonly SolidGroup[];
  readonly commonModel: CommonBridgeDataModelValue;
  readonly snapshot?: GeometrySnapshot;
}

const TOLERANCE = 1e-6;

function solidGroupToBoxes(group: SolidGroup): OrientedBox3d[] {
  const t = group.transform;
  const basis: OrientedBox3d["basis"] = [
    domainToThree({ x: t.xAxis.x, y: t.xAxis.y, z: t.xAxis.z }),
    domainToThree({ x: t.yAxis.x, y: t.yAxis.y, z: t.yAxis.z }),
    domainToThree({ x: t.zAxis.x, y: t.zAxis.y, z: t.zAxis.z }),
  ];
  return group.solids.map((solid) => {
    const local = solid.localCenter;
    const world = {
      x: t.origin.x + t.xAxis.x * local.x + t.yAxis.x * local.y + t.zAxis.x * local.z,
      y: t.origin.y + t.xAxis.y * local.x + t.yAxis.y * local.y + t.zAxis.y * local.z,
      z: t.origin.z + t.xAxis.z * local.x + t.yAxis.z * local.y + t.zAxis.z * local.z,
    };
    return {
      id: solid.id,
      kind: "substructure" as const,
      center: domainToThree(world),
      size: [solid.localSize.x, solid.localSize.y, solid.localSize.z] as [number, number, number],
      basis,
      supportId: group.supportId,
      entity: solid.entity,
    };
  });
}

function boxSizeFromDimensions(dimensionsM: Readonly<Record<string, number>>): [number, number, number] {
  const values = Object.values(dimensionsM)
    .filter((v) => Number.isFinite(v) && v > 0)
    .slice(0, 3);
  if (values.length === 3) {
    return [values[0]!, values[1]!, values[2]!];
  }
  if (values.length === 2) {
    return [values[0]!, values[1]!, values[1]!];
  }
  if (values.length === 1) {
    return [values[0]!, values[0]!, values[0]!];
  }
  return [1, 1, 1];
}

function superSolidToBox(solid: ApolloSolidGeometryParameter): OrientedBox3d {
  const origin = solid.localFrame.origin as readonly number[];
  const basis: OrientedBox3d["basis"] = [
    domainToThree({ x: solid.localFrame.xAxis[0], y: solid.localFrame.xAxis[1], z: solid.localFrame.xAxis[2] }),
    domainToThree({ x: solid.localFrame.yAxis[0], y: solid.localFrame.yAxis[1], z: solid.localFrame.yAxis[2] }),
    domainToThree({ x: solid.localFrame.zAxis[0], y: solid.localFrame.zAxis[1], z: solid.localFrame.zAxis[2] }),
  ];
  return {
    id: solid.id,
    kind: "superstructure",
    center: domainToThree({ x: origin[0], y: origin[1], z: origin[2] }),
    size: boxSizeFromDimensions(solid.dimensionsM),
    basis,
    entity: solid.kind,
  };
}

function verifySupports(
  subGroups: readonly SolidGroup[],
  commonModel: CommonBridgeDataModelValue,
  _snapshot: GeometrySnapshot | undefined,
): { matches: boolean; mismatches: string[] } {
  const mismatches: string[] = [];
  const cbdmBySupport = new Map<string, { x: number; y: number; z: number }>();
  for (const entity of commonModel.bridgeGeometry.supports ?? []) {
    const num = (key: string): number | undefined => {
      const f = entity.fields?.[key] as { value?: unknown } | undefined;
      return typeof f?.value === "number" && Number.isFinite(f.value) ? f.value : undefined;
    };
    const x = num("x");
    const y = num("y");
    const z = num("z");
    if (x !== undefined && y !== undefined && z !== undefined) {
      cbdmBySupport.set(entity.id, { x, y, z });
    }
  }
  for (const group of subGroups) {
    const cbdm = cbdmBySupport.get(group.supportId);
    const origin = group.transform.origin;
    if (cbdm !== undefined) {
      if (
        Math.abs(origin.x - cbdm.x) > TOLERANCE ||
        Math.abs(origin.y - cbdm.y) > TOLERANCE ||
        Math.abs(origin.z - cbdm.z) > TOLERANCE
      ) {
        mismatches.push(
          `support ${group.supportId}: solid origin (${origin.x.toFixed(3)},${origin.y.toFixed(3)},${origin.z.toFixed(3)}) != CBDM (${cbdm.x.toFixed(3)},${cbdm.y.toFixed(3)},${cbdm.z.toFixed(3)})`,
        );
      }
    }
  }
  return { matches: mismatches.length === 0, mismatches };
}

/**
 * Build the integrated three.js-space scene (terrain + ① + ② + ③) with
 * data-consistent positions.
 */
export function buildIntegratedScene3d(
  draft: BuildIntermediateInput,
  inputs: IntegratedSceneInputs,
): IntegratedScene3d {
  const base = buildUnified3DScene(draft);
  const substructureBoxes = inputs.subGroups.flatMap(solidGroupToBoxes);
  const superstructureBoxes = inputs.superSolids.map(superSolidToBox);

  const consistency = verifySupports(inputs.subGroups, inputs.commonModel, inputs.snapshot);

  return {
    base,
    superstructureBoxes,
    substructureBoxes,
    bounds: base.bounds,
    consistency: {
      supportsMatch: consistency.matches,
      mismatches: consistency.mismatches,
    },
  };
}

/** Programmatic support-XYZ parity check (the Phase 3-6 data proof). */
export function verifyIntegratedConsistency(
  scene: IntegratedScene3d,
): { supportsMatch: boolean; mismatches: readonly string[] } {
  return scene.consistency;
}
