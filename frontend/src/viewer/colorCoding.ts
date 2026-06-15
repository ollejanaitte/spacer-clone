import type { ProjectModel } from "../types";
import { BRIDGE_SOFT_PIERS, BRIDGE_ROCK_PIERS } from "../data/defaultProject";

/**
 * Display-only color mode for the bridge viewer.
 *
 *  - default:  monochrome blue steel, original Viewer behavior.
 *  - ground:   rock piers / soft piers / suspended junctions are colored
 *              differently so the user can read the ground condition and
 *              suspended layout at a glance.
 *  - auto:     picks `ground` for the bridge default projects and
 *              `default` for everything else.
 */
export type MemberColorMode = "default" | "ground" | "auto";

export const ROCK_COLOR = "#1b6b93";
export const SOFT_COLOR = "#c94f4f";
export const SUSPENDED_COLOR = "#f2c94c";
export const DEFAULT_MEMBER_COLOR = "#2f6f9f";
export const DECK_COLOR = "#2f6f9f";
export const PIER_COLOR_DEFAULT = "#1b6b93";
export const SUSPENDED_BEARING_COLOR = "#f2c94c";

export function resolveMemberColorMode(
  project: ProjectModel,
  mode: MemberColorMode,
): "default" | "ground" {
  if (mode === "default") return "default";
  if (mode === "ground") return "ground";
  // auto: any bridge project with rock/soft piers or suspended nodes
  // gets the color-coded variant.
  if (project.nodes.some((n) => n.id === "G3L" || n.id === "G3R" || n.id === "P3TOP")) return "ground";
  const pierIds = (BRIDGE_ROCK_PIERS as readonly string[]).concat(BRIDGE_SOFT_PIERS as readonly string[]);
  if (project.supports.some((s) => pierIds.includes(s.nodeId))) return "ground";
  return "default";
}

export function isSoftPierBase(nodeId: string): boolean {
  return (BRIDGE_SOFT_PIERS as readonly string[]).includes(nodeId);
}

export function isRockPierBase(nodeId: string): boolean {
  return (BRIDGE_ROCK_PIERS as readonly string[]).includes(nodeId);
}

export function isPierBase(nodeId: string): boolean {
  return isRockPierBase(nodeId) || isSoftPierBase(nodeId);
}

export function isSuspendedJunctionNode(nodeId: string): boolean {
  return nodeId === "G3L" || nodeId === "G3R" || nodeId === "P3TOP";
}

export function isSuspendedBearingMember(memberId: string): boolean {
  return memberId === "MBR3L" || memberId === "MBR3R";
}

export function memberColorForMember(
  project: ProjectModel,
  memberId: string,
  memberNodeI: string,
  memberNodeJ: string,
  mode: MemberColorMode,
  selected: boolean,
): string {
  if (selected) return SUSPENDED_COLOR;
  const effective = resolveMemberColorMode(project, mode);
  if (effective === "default") return DEFAULT_MEMBER_COLOR;
  // Suspended bearings stay yellow.
  if (isSuspendedBearingMember(memberId)) return SUSPENDED_BEARING_COLOR;
  // Piers are colored by their base ground condition.
  if (isPierBase(memberNodeI)) return isSoftPierBase(memberNodeI) ? SOFT_COLOR : ROCK_COLOR;
  if (isPierBase(memberNodeJ)) return isSoftPierBase(memberNodeJ) ? SOFT_COLOR : ROCK_COLOR;
  // Deck members that touch suspended junctions get a yellow highlight on
  // the segment closest to the junction so the split is visible.
  if (isSuspendedJunctionNode(memberNodeI) || isSuspendedJunctionNode(memberNodeJ)) {
    return SUSPENDED_COLOR;
  }
  return DECK_COLOR;
}