import type { AnalysisResult, EndForce, ProjectModel } from "../types";
import type { ResponseSpectrumSelection } from "../results/resultViewModel";
import { buildResultViewModel, buildResponseSpectrumViewModel, type MemberSectionForceComponent } from "../results/resultViewModel";

export type ForceColorComponent = "N" | "Vy" | "Vz" | "My" | "Mz" | "Mt";

export type ForceColorValueType = "max" | "min" | "absMax";

export type MemberForceColorMode = {
  enabled: boolean;
  component: ForceColorComponent;
  valueType: ForceColorValueType;
};

export const FORCE_COLOR_COMPONENTS: ForceColorComponent[] = ["N", "Vy", "Vz", "My", "Mz", "Mt"];

export const FORCE_COLOR_COMPONENT_LABELS: Record<ForceColorComponent, string> = {
  N: "軸力 N",
  Vy: "せん断 Vy",
  Vz: "せん断 Vz",
  My: "曲げ My",
  Mz: "曲げ Mz",
  Mt: "ねじり Mt",
};

export const FORCE_COLOR_VALUE_TYPE_LABELS: Record<ForceColorValueType, string> = {
  max: "最大値",
  min: "最小値",
  absMax: "絶対最大値",
};

const componentToSectionForce: Record<ForceColorComponent, MemberSectionForceComponent> = {
  N: "N",
  Vy: "Qy",
  Vz: "Qz",
  My: "My",
  Mz: "Mz",
  Mt: "Mx",
};

export const DEFAULT_FORCE_COLOR_MODE: MemberForceColorMode = {
  enabled: false,
  component: "N",
  valueType: "absMax",
};

export type ForceColorModeData = {
  enabled: boolean;
  component: ForceColorComponent;
  valueType: ForceColorValueType;
};

type MemberForceEntry = {
  memberId: string;
  value: number;
};

export function computeMemberForceColorValues(
  project: ProjectModel,
  result: AnalysisResult | null,
  loadCaseId: string,
  component: ForceColorComponent,
  valueType: ForceColorValueType,
  selectedResponseSpectrumResult: ResponseSpectrumSelection = "SRSS",
): Map<string, number> {
  const map = new Map<string, number>();
  if (!result || result.errors.length > 0) return map;

  const sectionForceComponent = componentToSectionForce[component];

  const responseSpectrumVM = buildResponseSpectrumViewModel(result, selectedResponseSpectrumResult);
  const staticVM = buildResultViewModel(result, loadCaseId);
  const vm = responseSpectrumVM ?? staticVM;
  if (!vm) return map;

  const forceItems = vm.memberForces.items.filter(
    (item) => item.component === sectionForceComponent,
  );

  for (const item of forceItems) {
    let value: number;
    switch (valueType) {
      case "max":
        value = Math.max(item.i, item.j);
        break;
      case "min":
        value = Math.min(item.i, item.j);
        break;
      case "absMax":
      default:
        value = Math.max(Math.abs(item.i), Math.abs(item.j));
        break;
    }
    map.set(item.memberId, value);
  }

  return map;
}

export type ForceColorRange = {
  min: number;
  max: number;
};

export function computeForceColorRange(values: Map<string, number>): ForceColorRange {
  if (values.size === 0) return { min: 0, max: 0 };
  let min = Infinity;
  let max = -Infinity;
  for (const v of values.values()) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!Number.isFinite(min)) min = 0;
  if (!Number.isFinite(max)) max = 0;
  return { min, max };
}

export type ForceColorStop = {
  t: number;
  r: number;
  g: number;
  b: number;
};

const COLOR_STOPS: ForceColorStop[] = [
  { t: 0.0, r: 0x1a, g: 0x56, b: 0xdb },
  { t: 0.25, r: 0x22, g: 0xc5, b: 0x5e },
  { t: 0.5, r: 0xeb, g: 0xc7, b: 0x2e },
  { t: 0.75, r: 0xf5, g: 0x7a, b: 0x1a },
  { t: 1.0, r: 0xdc, g: 0x26, b: 0x26 },
];

export function forceValueToColor(t: number): string {
  const clamped = Math.min(Math.max(t, 0), 1);
  let lower = COLOR_STOPS[0];
  let upper = COLOR_STOPS[COLOR_STOPS.length - 1];
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    if (clamped >= COLOR_STOPS[i].t && clamped <= COLOR_STOPS[i + 1].t) {
      lower = COLOR_STOPS[i];
      upper = COLOR_STOPS[i + 1];
      break;
    }
  }
  const span = upper.t - lower.t;
  const f = span > 0 ? (clamped - lower.t) / span : 0;
  const r = Math.round(lower.r + (upper.r - lower.r) * f);
  const g = Math.round(lower.g + (upper.g - lower.g) * f);
  const b = Math.round(lower.b + (upper.b - lower.b) * f);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function memberForceColor(
  value: number,
  range: ForceColorRange,
): string {
  const span = range.max - range.min;
  if (span <= 1e-12) return forceValueToColor(0.5);
  const t = (value - range.min) / span;
  return forceValueToColor(t);
}
