import type {
  AnalysisResult,
  DirectionalValue,
  EndForce,
  EigenModeShape,
  InfluenceTarget,
  MemberSectionForceResult,
  NodeDisplacementResult,
  NodeReactionResult,
  ResponseSpectrumModalResult,
} from "../types";

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
    stations: Array<{
      station: number;
      value: number;
    }>;
  }>;
};

export type ResponseSpectrumSelection = "SRSS" | `mode:${number}`;

export type ResultViewModel = {
  resultId: string;
  loadCaseId: string;
  displacements: DisplacementViewModel;
  reactions: ReactionViewModel;
  memberForces: MemberForceViewModel;
  eigenModes: EigenModeViewModel | null;
  responseSpectrum: ResponseSpectrumViewModel | null;
  influence: InfluenceLineViewModel | null;
};

export type EigenModeViewModel = {
  resultId: string;
  selectedModeNo: number;
  modes: Array<{
    modeNo: number;
    eigenvalue: number;
    circularFrequency: number;
    frequency: number;
    period: number;
    modalMass: number;
    participationFactorX: number;
    participationFactorY: number;
    participationFactorZ: number;
    effectiveMassRatioX: number;
    effectiveMassRatioY: number;
    effectiveMassRatioZ: number;
    shape: EigenModeShape[];
  }>;
};

export type ResponseSpectrumViewModel = {
  resultId: string;
  selectedResultKey: ResponseSpectrumSelection;
  selectedResultLabel: string;
  spectrumCaseId: string;
  direction: string;
  dampingRatio: number;
  combinationMethod: "SRSS" | "CQC";
  modeOptions: Array<{ key: ResponseSpectrumSelection; label: string; modeNo?: number }>;
  modalRows: Array<{
    modeNo: number;
    spectralAcceleration: number;
    maxDisplacement: number;
    maxReaction: number;
    maxMemberForce: number;
  }>;
  srssRows: Array<{
    method: "SRSS" | "CQC";
    maxDisplacement: number;
    maxReaction: number;
    maxMemberForce: number;
  }>;
  displacements: DisplacementViewModel;
  reactions: ReactionViewModel;
  memberSectionForces: {
    resultId: string;
    loadCaseId: string;
    items: Array<{
      memberId: string;
      station: number;
      component: MemberSectionForceComponent;
      value: number;
    }>;
  };
  memberForces: MemberForceViewModel;
};

export type InfluenceLineViewModel = {
  resultId: string;
  caseId: string;
  lineMemberId: string;
  stationCount: number;
  loadMagnitude: number;
  loadDirection: { x: number; y: number; z: number };
  targets: Array<InfluenceTarget & { label: string; maxAbs: number; min: number; max: number }>;
  series: Array<{
    targetId: string;
    label: string;
    target: InfluenceTarget;
    points: Array<{ station: number; ratio: number; value: number }>;
  }>;
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
  responseSpectrumSelection: ResponseSpectrumSelection = "SRSS",
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
      phase2MemberForceComponents.map((component) => {
        // Element end forces act on the nodes; diagrams use the internal section-force convention.
        const rawI = row.i[componentMap[component]];
        const i = rawI === 0 ? 0 : -rawI;
        const j = row.j[componentMap[component]];
        return {
          memberId: row.memberId,
          component,
          i,
          j,
          stations: [
            { station: 0, value: i },
            { station: 1, value: j },
          ],
        };
      }),
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
    eigenModes: buildEigenModeViewModel(result, 1),
    responseSpectrum: buildResponseSpectrumViewModel(result, responseSpectrumSelection),
    influence: buildInfluenceLineViewModel(result),
  };
}

export function buildInfluenceLineViewModel(result: AnalysisResult | null): InfluenceLineViewModel | null {
  const influence = result?.influenceResult;
  if (!result || result.errors.length > 0 || !influence) return null;

  const targetById = new Map(influence.targets.map((target) => [target.id, target]));
  const series = influence.targetResults
    .map((targetResult) => {
      const target = targetById.get(targetResult.targetId);
      if (!target) return null;
      return {
        targetId: targetResult.targetId,
        label: influenceTargetLabel(target),
        target,
        points: targetResult.values.map((value, index) => ({
          station: influence.stations[index]?.station ?? index,
          ratio: influence.stations[index]?.ratio ?? 0,
          value,
        })),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return {
    resultId: `${result.projectId}:influence:${influence.caseId}`,
    caseId: influence.caseId,
    lineMemberId: influence.line.memberId,
    stationCount: influence.line.stationCount,
    loadMagnitude: influence.line.loadMagnitude,
    loadDirection: influence.line.loadDirection,
    targets: influence.targets.map((target) => {
      const values = influence.targetResults.find((item) => item.targetId === target.id)?.values ?? [];
      return {
        ...target,
        label: influenceTargetLabel(target),
        maxAbs: Math.max(...values.map((value) => Math.abs(value)), 0),
        min: Math.min(...values, 0),
        max: Math.max(...values, 0),
      };
    }),
    series,
  };
}

function influenceTargetLabel(target: InfluenceTarget): string {
  if (target.type === "displacement") return `Disp ${target.nodeId ?? "-"} ${target.component}`;
  if (target.type === "reaction") return `Reaction ${target.nodeId ?? "-"} ${target.component}`;
  return `Member ${target.memberId ?? "-"} ${target.component} ${target.end ?? "i"}`;
}

export function buildEigenModeViewModel(
  result: AnalysisResult | null,
  selectedModeNo: number,
): EigenModeViewModel | null {
  const modes = result?.eigenResult?.modes ?? [];
  if (!result || result.errors.length > 0 || modes.length === 0) return null;
  const modeNos = modes.map((mode) => mode.modeNo);
  const normalizedModeNo = modeNos.includes(selectedModeNo) ? selectedModeNo : modeNos[0];

  return {
    resultId: `${result.projectId}:eigen`,
    selectedModeNo: normalizedModeNo,
    modes: modes.map((mode) => ({
      modeNo: mode.modeNo,
      eigenvalue: mode.eigenvalue,
      circularFrequency: mode.circularFrequency,
      frequency: mode.frequency,
      period: mode.period,
      modalMass: mode.modalMass,
      participationFactorX: directionalValue(mode.participationFactors, "X"),
      participationFactorY: directionalValue(mode.participationFactors, "Y"),
      participationFactorZ: directionalValue(mode.participationFactors, "Z"),
      effectiveMassRatioX: directionalValue(mode.effectiveMassRatios, "X"),
      effectiveMassRatioY: directionalValue(mode.effectiveMassRatios, "Y"),
      effectiveMassRatioZ: directionalValue(mode.effectiveMassRatios, "Z"),
      shape: mode.shape,
    })),
  };
}

function directionalValue(items: DirectionalValue[], direction: string): number {
  return items.find((item) => item.direction === direction)?.value ?? 0;
}

export function buildResponseSpectrumViewModel(
  result: AnalysisResult | null,
  selectedResultKey: ResponseSpectrumSelection,
): ResponseSpectrumViewModel | null {
  const response = result?.responseSpectrumResult;
  if (!result || result.errors.length > 0 || !response) return null;

  const modeNos = response.modalResults.map((mode) => mode.modeNo);
  const requestedModeNo = selectedResultKey.startsWith("mode:") ? Number(selectedResultKey.slice(5)) : null;
  const normalizedKey: ResponseSpectrumSelection =
    requestedModeNo && modeNos.includes(requestedModeNo) ? `mode:${requestedModeNo}` : "SRSS";
  const selectedMode =
    normalizedKey === "SRSS"
      ? null
      : response.modalResults.find((mode) => mode.modeNo === Number(normalizedKey.slice(5))) ?? null;
  const selected = selectedMode ?? response.combinedResult;
  const selectedLabel = selectedMode ? `Mode ${selectedMode.modeNo}` : response.combinedResult.method;
  const resultId = `${result.projectId}:response-spectrum:${selectedLabel}`;
  const displacements = toDisplacementItems(selected.displacements);
  const reactions = toReactionItems(selected.reactions ?? []);
  const memberSectionForces = (selected.memberSectionForces ?? []).filter(isPhase4SectionForce);
  const memberForces = toMemberEndForceItems(memberSectionForces);

  return {
    resultId,
    selectedResultKey: normalizedKey,
    selectedResultLabel: selectedLabel,
    spectrumCaseId: response.spectrumCaseId,
    direction: response.direction,
    dampingRatio: response.dampingRatio,
    combinationMethod: response.combinationMethod,
    modeOptions: [
      ...response.modalResults.map((mode) => ({
        key: `mode:${mode.modeNo}` as const,
        label: `Mode ${mode.modeNo}`,
        modeNo: mode.modeNo,
      })),
      { key: "SRSS" as const, label: response.combinedResult.method },
    ],
    modalRows: response.modalResults.map((mode) => ({
      modeNo: mode.modeNo,
      spectralAcceleration: mode.spectralAcceleration,
      maxDisplacement: maxDisplacement(mode.displacements),
      maxReaction: maxReaction(mode.reactions ?? []),
      maxMemberForce: maxMemberForce(mode.memberSectionForces ?? []),
    })),
    srssRows: [
      {
        method: response.combinedResult.method,
        maxDisplacement: maxDisplacement(response.combinedResult.displacements),
        maxReaction: maxReaction(response.combinedResult.reactions ?? []),
        maxMemberForce: maxMemberForce(response.combinedResult.memberSectionForces ?? []),
      },
    ],
    displacements: {
      resultId,
      loadCaseId: selectedLabel,
      items: displacements,
    },
    reactions: {
      resultId,
      loadCaseId: selectedLabel,
      items: reactions,
    },
    memberSectionForces: {
      resultId,
      loadCaseId: selectedLabel,
      items: memberSectionForces,
    },
    memberForces: {
      resultId,
      loadCaseId: selectedLabel,
      items: memberForces,
    },
  };
}

export function getResponseSpectrumDisplacements(
  result: AnalysisResult | null,
  selectedResultKey: ResponseSpectrumSelection,
): NodeDisplacementResult[] {
  const response = result?.responseSpectrumResult;
  if (!result || result.errors.length > 0 || !response) return [];
  if (selectedResultKey.startsWith("mode:")) {
    const modeNo = Number(selectedResultKey.slice(5));
    return response.modalResults.find((mode) => mode.modeNo === modeNo)?.displacements ?? [];
  }
  return response.combinedResult.displacements;
}

function toDisplacementItems(items: NodeDisplacementResult[]): DisplacementViewModel["items"] {
  return items.map((item) => ({
    ...item,
    magnitude: Math.hypot(item.ux, item.uy, item.uz),
  }));
}

function toReactionItems(items: NodeReactionResult[]): ReactionViewModel["items"] {
  return items.map((item) => ({
    ...item,
    constrainedDofs: item.constrainedDofs ?? [],
  }));
}

function toMemberEndForceItems(
  items: MemberSectionForceResult[],
): MemberForceViewModel["items"] {
  const grouped = new Map<string, MemberSectionForceResult[]>();
  for (const item of items.filter(isPhase4SectionForce)) {
    const key = `${item.memberId}:${item.component}`;
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }
  return [...grouped.values()].map((group) => {
    const sorted = [...group].sort((a, b) => a.station - b.station);
    const first = sorted[0];
    const last = sorted[sorted.length - 1] ?? first;
    return {
      memberId: first.memberId,
      component: first.component,
      i: first.value,
      j: last.value,
      stations: sorted.map((item) => ({
        station: item.station,
        value: item.value,
      })),
    };
  });
}

function isPhase4SectionForce(item: MemberSectionForceResult): boolean {
  return phase2MemberForceComponents.includes(item.component);
}

function maxDisplacement(items: NodeDisplacementResult[]): number {
  return Math.max(...items.map((item) => Math.hypot(item.ux, item.uy, item.uz)), 0);
}

function maxReaction(items: NodeReactionResult[]): number {
  return Math.max(...items.map((item) => Math.hypot(item.fx, item.fy, item.fz)), 0);
}

function maxMemberForce(items: MemberSectionForceResult[]): number {
  return Math.max(...items.filter(isPhase4SectionForce).map((item) => Math.abs(item.value)), 0);
}

export function hasResponseSpectrumResult(result: AnalysisResult | null): boolean {
  return Boolean(result && result.errors.length === 0 && result.responseSpectrumResult);
}
