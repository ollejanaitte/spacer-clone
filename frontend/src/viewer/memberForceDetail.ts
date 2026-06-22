import type { AnalysisResult, ProjectModel } from "../types";
import { buildResultViewModel, buildResponseSpectrumViewModel, type ResponseSpectrumSelection, type MemberSectionForceComponent } from "../results/resultViewModel";
import { ja } from "../i18n/ja";

export type MemberForceDetailItem = {
  component: MemberSectionForceComponent;
  label: string;
  unit: string;
  iValue: number;
  jValue: number;
};

export type MemberForceDetail = {
  memberId: string;
  memberLabel: string;
  nodeI: string;
  nodeJ: string;
  forces: MemberForceDetailItem[];
};

const COMPONENT_META: Array<{ component: MemberSectionForceComponent; label: string; unit: string }> = [
  { component: "N", label: ja.viewer.memberForce.components.N, unit: "kN" },
  { component: "Qy", label: ja.viewer.memberForce.components.Qy, unit: "kN" },
  { component: "Qz", label: ja.viewer.memberForce.components.Qz, unit: "kN" },
  { component: "Mx", label: ja.viewer.memberForce.components.Mx, unit: "kN·m" },
  { component: "My", label: ja.viewer.memberForce.components.My, unit: "kN·m" },
  { component: "Mz", label: ja.viewer.memberForce.components.Mz, unit: "kN·m" },
];

export function buildMemberForceDetail(
  project: ProjectModel,
  result: AnalysisResult | null,
  selectedMemberId: string | null,
  loadCaseId: string,
  selectedResponseSpectrumResult: ResponseSpectrumSelection = "SRSS",
): MemberForceDetail | null {
  if (!selectedMemberId || !result || result.errors.length > 0) return null;

  const member = project.members.find((m) => m.id === selectedMemberId);
  if (!member) return null;

  const responseSpectrumVM = buildResponseSpectrumViewModel(result, selectedResponseSpectrumResult);
  const staticVM = buildResultViewModel(result, loadCaseId);
  const vm = responseSpectrumVM ?? staticVM;
  if (!vm) return null;

  const forces: MemberForceDetailItem[] = COMPONENT_META.map(({ component, label, unit }) => {
    const item = vm.memberForces.items.find(
      (fi) => fi.memberId === selectedMemberId && fi.component === component,
    );
    return {
      component,
      label,
      unit,
      iValue: item?.i ?? 0,
      jValue: item?.j ?? 0,
    };
  });

  return {
    memberId: member.id,
    memberLabel: member.label || member.id,
    nodeI: member.nodeI,
    nodeJ: member.nodeJ,
    forces,
  };
}

export function formatForceValue(value: number): string {
  if (!Number.isFinite(value)) return "--";
  const abs = Math.abs(value);
  if (abs > 1e5 || (abs > 0 && abs < 1e-3)) return value.toExponential(3);
  return value.toFixed(4).replace(/\.?0+$/, "");
}
