/**
 * Integrated 3D export (Phase 8-02 WP-K).
 *
 * Serializes the derived CIM scene to glTF (GLB) using three.js GLTFExporter.
 * Layer groups are preserved as named nodes; CIM metadata is embedded in the
 * node `extras`. Export is a display/derived artifact — never a source of truth.
 */

import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import type { CimEntityMetadata, CimLayerId, Integrated3DScene } from "./integrated3dScene";

export interface ExportCimSceneResult {
  readonly ok: boolean;
  readonly issues: readonly string[];
  readonly glb?: ArrayBuffer;
  readonly gltfJson?: unknown;
}

function collectMetadata(object: THREE.Object3D): CimEntityMetadata | undefined {
  return object.userData?.cimMetadata as CimEntityMetadata | undefined;
}

export function buildCimExportScene(scene: Integrated3DScene): THREE.Group {
  const root = new THREE.Group();
  root.name = "CIM-Integrated3D";
  for (const [layer, group] of Object.entries(scene.layers) as [CimLayerId, THREE.Group][]) {
    const layerGroup = new THREE.Group();
    layerGroup.name = `layer:${layer}`;
    layerGroup.userData.layerId = layer;
    for (const child of group.children) {
      const clone = child.clone();
      const meta = collectMetadata(child) ?? collectMetadata(group);
      if (meta) {
        clone.userData.meta = meta;
      }
      layerGroup.add(clone);
    }
    if (layerGroup.children.length > 0) {
      root.add(layerGroup);
    }
  }
  return root;
}

export function exportCimSceneAsGlb(scene: Integrated3DScene): Promise<ExportCimSceneResult> {
  const exporter = new GLTFExporter();
  const root = buildCimExportScene(scene);
  return new Promise((resolve) => {
    exporter.parse(
      root,
      (glbValue: ArrayBuffer | { [key: string]: unknown }) => {
        const glb = glbValue as ArrayBuffer;
        resolve({ ok: true, glb, issues: [] });
      },
      (error) => {
        resolve({ ok: false, issues: [error instanceof Error ? error.message : String(error)] });
      },
      { binary: true, onlyVisible: true },
    );
  });
}

export function exportCimSceneAsGltfJson(scene: Integrated3DScene): Promise<ExportCimSceneResult> {
  const exporter = new GLTFExporter();
  const root = buildCimExportScene(scene);
  return new Promise((resolve) => {
    exporter.parse(
      root,
      (result: unknown) => {
        resolve({ ok: true, gltfJson: result, issues: [] });
      },
      (error) => {
        resolve({ ok: false, issues: [error instanceof Error ? error.message : String(error)] });
      },
      { binary: false, onlyVisible: true },
    );
  });
}

/** Download a GLB blob in the browser. */
export function downloadGlb(glb: ArrayBuffer, fileName = "cim-integrated3d.glb"): void {
  const blob = new Blob([glb], { type: "model/gltf-binary" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
