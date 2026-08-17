/**
 * Lane U Wave 2: Road / Bridge workflow state carried on the shared PDC
 * Project module slots.
 *
 * Design rule: the PDC Project (frontend/src/next/project) is the single
 * source of truth. Each workflow step records a lightweight `workflowState`
 * Record inside the owning module slot:
 *   - Road step        → project.modules.road.workflowState
 *   - Bridge step      → project.modules.bridgeLayout.workflowState
 *
 * The slot is a plain Record so `parseProject` (projectDataCore) validates the
 * project without deep-validating lane-owned documents. Lane-owned keys
 * (roadDesignDocument / bridgeLayoutDocument / ...) are preserved untouched.
 */

import { parseProject } from "../project/projectDataCore";
import type { Project } from "../project/schema";

export const ROAD_WORKFLOW_STATE_KEY = "workflowState" as const;
export const BRIDGE_WORKFLOW_STATE_KEY = "workflowState" as const;

export interface RoadBridgeCandidate {
  readonly startStation: number;
  readonly endStation: number;
  readonly nominalSpanM: number;
  readonly note: string;
}

export interface RoadWorkflowState {
  readonly roadId: string;
  readonly alignmentId: string;
  readonly name: string;
  readonly totalLengthM: number;
  readonly bridgeCandidate: RoadBridgeCandidate;
  readonly placedAt: string;
}

export interface BridgePierWorkflowState {
  readonly supportId: string;
  readonly station: number;
}

export interface BridgeSpanWorkflowState {
  readonly spanId: string;
  readonly index: number;
  readonly startSupportId: string;
  readonly endSupportId: string;
  readonly startStation: number;
  readonly endStation: number;
  readonly length: number;
}

export interface BridgeWorkflowState {
  readonly bridgeId: string;
  readonly name: string;
  readonly roadId: string;
  readonly bridgeRange: {
    readonly startStation: number;
    readonly endStation: number;
    readonly bridgeLength: number;
  };
  readonly piers: readonly BridgePierWorkflowState[];
  readonly spans: readonly BridgeSpanWorkflowState[];
  readonly placedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readRoadWorkflowState(project: Project): RoadWorkflowState | undefined {
  const module = project.modules.road;
  if (!isRecord(module)) return undefined;
  const state = module[ROAD_WORKFLOW_STATE_KEY];
  return state && typeof state === "object" && !Array.isArray(state)
    ? (state as RoadWorkflowState)
    : undefined;
}

export function writeRoadWorkflowState(
  project: Project,
  state: RoadWorkflowState,
): Project {
  const next: Project = {
    ...project,
    updatedAt: new Date().toISOString(),
    modules: {
      ...project.modules,
      road: {
        ...(isRecord(project.modules.road) ? project.modules.road : {}),
        [ROAD_WORKFLOW_STATE_KEY]: structuredClone(state),
      },
    },
  };
  return assertWorkflowProjectValid(next);
}

export function readBridgeWorkflowState(project: Project): BridgeWorkflowState | undefined {
  const module = project.modules.bridgeLayout;
  if (!isRecord(module)) return undefined;
  const state = module[BRIDGE_WORKFLOW_STATE_KEY];
  return state && typeof state === "object" && !Array.isArray(state)
    ? (state as BridgeWorkflowState)
    : undefined;
}

export function writeBridgeWorkflowState(
  project: Project,
  state: BridgeWorkflowState,
): Project {
  const next: Project = {
    ...project,
    updatedAt: new Date().toISOString(),
    modules: {
      ...project.modules,
      bridgeLayout: {
        ...(isRecord(project.modules.bridgeLayout) ? project.modules.bridgeLayout : {}),
        [BRIDGE_WORKFLOW_STATE_KEY]: structuredClone(state),
      },
    },
  };
  return assertWorkflowProjectValid(next);
}

/** Every workflow write must stay parseProject-valid (fail-closed). */
export function assertWorkflowProjectValid(project: Project): Project {
  const parsed = parseProject(project);
  if (!parsed.ok) {
    throw new Error(`WORKFLOW-STATE-INVALID-PROJECT: ${parsed.issues.join("; ")}`);
  }
  return parsed.project;
}