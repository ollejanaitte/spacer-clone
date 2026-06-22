import { ja } from "../i18n/ja";
import type {
  BridgeProject,
  CrossSection,
  Span,
  ImpactFactor,
  BridgeLine,
  BridgeLoad,
  BridgeGenerationSettings,
} from "./types";

export const WIZARD_STEPS = [1, 2, 3, 4, 5, 6] as const;
export type WizardStepNumber = (typeof WIZARD_STEPS)[number];

export function stepTitle(step: WizardStepNumber): string {
  return ja.bridgeSteps.stepTitles[step];
}

export const defaultCrossSection = (): CrossSection => ({
  lane_count: 2,
  lane_width: 3.5,
  median_width: 0.0,
  sidewalk_width: 1.5,
  barrier_width: 0.5,
});

export const defaultImpactFactor = (): ImpactFactor => ({
  value: 0.0,
  auto: true,
});

export const defaultGenerationSettings = (): BridgeGenerationSettings => ({
  mesh_division: 10,
  mesh_density: "standard",
});

let idCounter = 1;
export function nextLineId(): string {
  return `line-${idCounter++}`;
}

let loadCounter = 1;
export function nextLoadId(): string {
  return `load-${loadCounter++}`;
}

export function makeInitialBridgeProject(
  name = ja.defaults.newBridgeName,
  id = "bridge-001",
): BridgeProject {
  idCounter = 1;
  loadCounter = 1;
  const now = new Date().toISOString();
  return {
    id,
    name,
    schemaVersion: "0.1.0",
    description: ja.defaults.newBridgeDescription,
    createdAt: now,
    updatedAt: now,
    crossSection: defaultCrossSection(),
    spans: [{ index: 1, length: 30.0, offset: 0.0 }],
    impactFactor: defaultImpactFactor(),
    lines: [],
    loads: [],
    generationSettings: defaultGenerationSettings(),
  };
}

export function computeImpactFactor(spanLengths: number[]): number {
  if (!spanLengths.length) return 0;
  const L = Math.max(...spanLengths);
  if (L <= 0) return 0;
  return Math.min(0.3, 20 / (50 + L));
}

export function yPositionsFor(cross: CrossSection): number[] {
  const laneTotal = cross.lane_count * cross.lane_width;
  const halfLane = laneTotal / 2;
  const halfMed = cross.median_width / 2;
  const halfWalk = cross.sidewalk_width;
  const halfBar = cross.barrier_width;
  const yLeft = -(halfLane + halfMed + halfWalk + halfBar);
  const yRight = +(halfLane + halfMed + halfWalk + halfBar);
  const yBarL = yLeft;
  const yBarR = yRight;
  const yWalkL = -(halfLane + halfMed + halfWalk);
  const yWalkR = +(halfLane + halfMed + halfWalk);
  const yLaneL = -(halfLane + halfMed);
  const yLaneR = +(halfLane + halfMed);
  const yMedL = -halfMed;
  const yMedR = +halfMed;
  const interior: number[] = [];
  if (cross.lane_count > 1) {
    const nInner = cross.lane_count - 1;
    const step = (2 * halfLane) / nInner;
    for (let k = 0; k < nInner; k++) {
      interior.push(-halfLane + step * (k + 0.5));
    }
  }
  const cand = [
    yLeft,
    yBarL,
    yWalkL,
    yLaneL,
    yMedL,
    ...interior,
    yMedR,
    yLaneR,
    yWalkR,
    yBarR,
    yRight,
  ];
  return Array.from(new Set(cand.map((v) => Number(v.toFixed(6)))).values()).sort(
    (a, b) => a - b,
  );
}

export function xPositionsFor(spans: Span[], meshDivision: number): number[] {
  if (meshDivision < 1) return [0];
  const out: number[] = [0];
  let cursor = 0;
  for (const sp of spans) {
    for (let i = 1; i <= meshDivision; i++) {
      out.push(Number((cursor + (sp.length * i) / meshDivision).toFixed(6)));
    }
    cursor += sp.length;
  }
  return out;
}

export function totalLength(spans: Span[]): number {
  return spans.reduce((acc, s) => acc + (s.length || 0), 0);
}

export function addSpan(spans: Span[]): Span[] {
  const next: Span = { index: spans.length + 1, length: 30.0, offset: 0.0 };
  return [...spans, next];
}

export function removeSpan(spans: Span[], index: number): Span[] {
  const filtered = spans.filter((s) => s.index !== index);
  return filtered.map((s, i) => ({ ...s, index: i + 1 }));
}

export function addLine(
  project: BridgeProject,
  line: Omit<BridgeLine, "id">,
): BridgeLine {
  const id = nextLineId();
  const full: BridgeLine = { id, ...line };
  return full;
}

export function appendLine(
  project: BridgeProject,
  line: BridgeLine,
): BridgeProject {
  return { ...project, lines: [...project.lines, line] };
}

export function removeLine(project: BridgeProject, id: string): BridgeProject {
  const lines = project.lines.filter((l) => l.id !== id);
  const loads = project.loads.filter((l) => l.line_id !== id);
  return { ...project, lines, loads };
}

export function addLoad(
  project: BridgeProject,
  load: Omit<BridgeLoad, "id">,
): BridgeLoad {
  return { id: nextLoadId(), ...load };
}

export function appendLoad(
  project: BridgeProject,
  load: BridgeLoad,
): BridgeProject {
  return { ...project, loads: [...project.loads, load] };
}

export function removeLoad(project: BridgeProject, id: string): BridgeProject {
  return { ...project, loads: project.loads.filter((l) => l.id !== id) };
}

export function setStep<T>(step: number, next: T, setStep: (n: number) => void) {
  setStep(step + 1);
  return next;
}
