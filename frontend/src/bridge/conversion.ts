import type { BridgeProject, BridgeFemResponse } from "./types";
import type { ProjectModel } from "../types";

/**
 * Convert a bridge project's BridgeFemResponse.fem (which is in the existing
 * project.json shape) into the UI's ProjectModel by ensuring the schemaVersion
 * and field names are aligned.
 */
export function bridgeProjectToProjectModel(fem: BridgeFemResponse["fem"]): ProjectModel {
  return {
    ...fem,
  } as ProjectModel;
}

/**
 * Load a JSON object that may be a BridgeProject or a project.json,
 * normalizing into a BridgeProject.
 */
export function loadJsonFileAsBridge(data: unknown): BridgeProject {
  if (data == null || typeof data !== "object") {
    throw new Error("Invalid JSON: not an object");
  }
  const obj = data as Record<string, unknown>;
  if (obj["schemaVersion"] === "0.1.0" && obj["crossSection"]) {
    return obj as unknown as BridgeProject;
  }
  // If it is a project.json, wrap it into a bridge
  return {
    id: (obj["project"] as { id?: string } | undefined)?.id || "bridge-imported",
    name: (obj["project"] as { name?: string } | undefined)?.name || "imported",
    schemaVersion: "0.1.0",
    crossSection: { lane_count: 2, lane_width: 3.5, median_width: 0, sidewalk_width: 0, barrier_width: 0 },
    spans: [{ index: 1, length: 10, offset: 0 }],
    impactFactor: { value: 0, auto: true },
    lines: [],
    loads: [],
    generationSettings: { mesh_division: 4, mesh_density: "coarse" },
  };
}
