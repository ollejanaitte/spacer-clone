import { WORKSPACE_SECTIONS, type WorkspaceSection } from "../workspace/sections";

/**
 * Guided workflow order for the Design Platform business workspace.
 * Free navigation is retained; guided flow provides 戻る / 次へ ordering.
 */
export const GUIDED_WORKFLOW: readonly WorkspaceSection[] = [
  "overview",
  "road",
  "superstructure",
  "substructure",
  "analysis",
  "main3d",
  "deliverables",
  "data",
];

export interface GuidedNavigation {
  readonly hasPrev: boolean;
  readonly hasNext: boolean;
  readonly prev: WorkspaceSection | null;
  readonly next: WorkspaceSection | null;
  readonly index: number;
}

export function resolveGuidedNavigation(current: WorkspaceSection): GuidedNavigation {
  const index = GUIDED_WORKFLOW.indexOf(current);
  if (index === -1) {
    return { hasPrev: false, hasNext: false, prev: null, next: null, index: -1 };
  }
  const prev = index > 0 ? GUIDED_WORKFLOW[index - 1]! : null;
  const next = index < GUIDED_WORKFLOW.length - 1 ? GUIDED_WORKFLOW[index + 1]! : null;
  return {
    hasPrev: prev !== null,
    hasNext: next !== null,
    prev,
    next,
    index,
  };
}

export function isGuidedSection(value: string): value is WorkspaceSection {
  return (WORKSPACE_SECTIONS as readonly string[]).includes(value);
}

export function guidedProgress(current: WorkspaceSection): number {
  const index = GUIDED_WORKFLOW.indexOf(current);
  return index === -1 ? 0 : index + 1;
}
