import type { AnalysisResult, EndForce } from "../types";

export type MemberSectionForceComponent = "N" | "Qy" | "Qz" | "Mx" | "My" | "Mz";

export type DisplacementViewModel = {
  resultId: string;
  loadCaseId: string;
  items: Array<{
    nodeId: string;
    ux: number;
    uy: number;
    uz: number;
    rx: number;
    ry: number;
    rz: number;
    magnitude: number;
  }>;
};

export type ReactionViewModel = {
  resultId: string;
  loadCaseId: string;
  items: Array<{
    nodeId: string;
    fx: number;
    fy: number;
    fz: number;
    mx: number;
    my: number;
    mz: number;
    constrainedDofs: string[];
  }>;
};

export type MemberForceViewModel = {
  resultId: string;
  loadCaseId: string;
  items: Array<{
    memberId: string;
    component: MemberSectionForceComponent;
    i: number;
    j: number;
  }>;
};

export type ResultViewModel = {
  resultId: string;
  loadCaseId: string;
  displacements: DisplacementViewModel;
  reactions: ReactionViewModel;
  memberForces: MemberForceViewModel;
};

const componentMap: Record<MemberSectionForceComponent, keyof EndForce> = {
  N: "fx",
  Qy: "fy",
  Qz: "fz",
  Mx: "mx",
  My: "my",
  Mz: "mz",
};

export const phase2MemberForceComponents: MemberSectionForceComponent[] = ["N", "My", "Mz"];

export function buildResultViewModel(
  result: AnalysisResult | null,
  loadCaseId: string,
): ResultViewModel | null {
  if (!result || result.errors.length > 0) return null;

  const resultId = `${result.projectId}:${loadCaseId || "all"}`;
  const displacements = result.displacements
    .filter((row) => !loadCaseId || row.loadCaseId === loadCaseId)
    .map((row) => ({
      ...row,
      magnitude: Math.hypot(row.ux, row.uy, row.uz),
    }));
  const reactions = result.reactions.filter((row) => !loadCaseId || row.loadCaseId === loadCaseId);
  const memberForces = result.memberEndForces
    .filter((row) => !loadCaseId || row.loadCaseId === loadCaseId)
    .flatMap((row) =>
      phase2MemberForceComponents.map((component) => ({
        memberId: row.memberId,
        component,
        i: row.i[componentMap[component]],
        j: row.j[componentMap[component]],
      })),
    );

  return {
    resultId,
    loadCaseId,
    displacements: {
      resultId,
      loadCaseId,
      items: displacements,
    },
    reactions: {
      resultId,
      loadCaseId,
      items: reactions,
    },
    memberForces: {
      resultId,
      loadCaseId,
      items: memberForces,
    },
  };
}
