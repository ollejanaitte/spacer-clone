import type { TimeHistoryResult } from "../types";

export type TimeHistoryTranslationComponent = "ux" | "uy" | "uz";

export type NormalizedDisplacementKey = {
  nodeId: string;
  component: TimeHistoryTranslationComponent;
  format: "component" | "shorthand";
};

export type XyzDisplacementSeries = {
  key: string;
  nodeId: string;
  label: string;
  status: "available" | "unavailable";
  values: number[];
  missingComponents: TimeHistoryTranslationComponent[];
  reason?: "missing-components" | "invalid-values" | "length-mismatch";
  source: "three-component" | "single-direction";
};

const translationComponents: readonly TimeHistoryTranslationComponent[] = ["ux", "uy", "uz"];
const knownDofSuffix = /_(?:ux|uy|uz|rx|ry|rz)$/;
const virtualKeyPrefix = "xyz:";

export function xyzDisplacementKey(nodeId: string): string {
  return `${virtualKeyPrefix}${nodeId}`;
}

export function isXyzDisplacementKey(key: string): boolean {
  return key.startsWith(virtualKeyPrefix) && key.length > virtualKeyPrefix.length;
}

export function parseTimeHistoryDisplacementKey(
  key: string,
  activeDirection: TimeHistoryTranslationComponent | null = null,
): NormalizedDisplacementKey | null {
  if (typeof key !== "string" || key.length === 0) return null;
  for (const component of translationComponents) {
    const suffix = `_${component}`;
    if (key.endsWith(suffix) && key.length > suffix.length) {
      return {
        nodeId: key.slice(0, -suffix.length),
        component,
        format: "component",
      };
    }
  }
  if (knownDofSuffix.test(key) || activeDirection === null) return null;
  return { nodeId: key, component: activeDirection, format: "shorthand" };
}

export function inferTimeHistoryActiveDirection(
  result: TimeHistoryResult | null | undefined,
): TimeHistoryTranslationComponent | null {
  const direction = result?.meta?.groundMotions?.[0]?.direction;
  if (typeof direction === "string") {
    const upper = direction.toUpperCase();
    if (upper === "X") return "ux";
    if (upper === "Y") return "uy";
    if (upper === "Z") return "uz";
  }
  for (const key of Object.keys(result?.displacements ?? {})) {
    const parsed = parseTimeHistoryDisplacementKey(key);
    if (parsed?.format === "component") return parsed.component;
  }
  return null;
}

export function buildXyzDisplacementSeries(
  result: TimeHistoryResult | null | undefined,
): XyzDisplacementSeries[] {
  if (!result?.displacements) return [];
  const activeDirection = inferTimeHistoryActiveDirection(result);
  const nodes = new Map<
    string,
    Partial<Record<TimeHistoryTranslationComponent, { values: number[]; format: NormalizedDisplacementKey["format"] }>>
  >();
  const explicitComponents = new Set<TimeHistoryTranslationComponent>();

  for (const [key, values] of Object.entries(result.displacements)) {
    const parsed = parseTimeHistoryDisplacementKey(key, activeDirection);
    if (!parsed || !Array.isArray(values)) continue;
    const node = nodes.get(parsed.nodeId) ?? {};
    const current = node[parsed.component];
    if (!current || parsed.format === "component") {
      node[parsed.component] = { values, format: parsed.format };
    }
    nodes.set(parsed.nodeId, node);
    if (parsed.format === "component") explicitComponents.add(parsed.component);
  }

  const clearlySingleDirection =
    activeDirection !== null &&
    explicitComponents.size <= 1 &&
    (explicitComponents.size === 0 || explicitComponents.has(activeDirection));
  const expectedLength = result.time.length;

  return [...nodes.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([nodeId, components]) =>
      deriveNodeMagnitude(nodeId, components, activeDirection, clearlySingleDirection, expectedLength),
    );
}

export function findXyzDisplacementSeries(
  result: TimeHistoryResult | null | undefined,
  key: string,
): XyzDisplacementSeries | null {
  if (!isXyzDisplacementKey(key)) return null;
  return buildXyzDisplacementSeries(result).find((series) => series.key === key) ?? null;
}

export function findSeriesMaximum(
  values: number[],
  time: number[],
): { value: number; time: number; index: number } | null {
  let bestIndex = -1;
  let bestValue = -Infinity;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    const timeValue = time[index];
    if (!Number.isFinite(value) || !Number.isFinite(timeValue)) continue;
    if (value > bestValue) {
      bestValue = value;
      bestIndex = index;
    }
  }
  return bestIndex >= 0 ? { value: bestValue, time: time[bestIndex], index: bestIndex } : null;
}

function deriveNodeMagnitude(
  nodeId: string,
  components: Partial<
    Record<TimeHistoryTranslationComponent, { values: number[]; format: NormalizedDisplacementKey["format"] }>
  >,
  activeDirection: TimeHistoryTranslationComponent | null,
  clearlySingleDirection: boolean,
  expectedLength: number,
): XyzDisplacementSeries {
  const present = translationComponents.filter((component) => components[component]);
  const missingComponents = translationComponents.filter((component) => !components[component]);
  const fullThreeComponent = present.length === translationComponents.length;
  const onlyActiveDirection =
    clearlySingleDirection &&
    activeDirection !== null &&
    present.length === 1 &&
    present[0] === activeDirection;
  const source = fullThreeComponent ? "three-component" : "single-direction";
  const base = {
    key: xyzDisplacementKey(nodeId),
    nodeId,
    label: `${nodeId} XYZ合成`,
    missingComponents,
    source,
  } as const;

  if (!fullThreeComponent && !onlyActiveDirection) {
    return { ...base, status: "unavailable", values: [], reason: "missing-components" };
  }

  const usedComponents = fullThreeComponent ? translationComponents : [activeDirection!];
  const series = usedComponents.map((component) => components[component]!.values);
  if (expectedLength <= 0 || series.some((values) => values.length !== expectedLength)) {
    return { ...base, status: "unavailable", values: [], reason: "length-mismatch" };
  }
  if (series.some((values) => values.some((value) => !Number.isFinite(value)))) {
    return { ...base, status: "unavailable", values: [], reason: "invalid-values" };
  }

  const values = Array.from({ length: expectedLength }, (_, index) =>
    Math.hypot(...series.map((componentValues) => componentValues[index])),
  );
  return { ...base, status: "available", values };
}
