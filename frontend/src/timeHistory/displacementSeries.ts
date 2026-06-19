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

export type PeakResponseComponent = "X" | "Y" | "Z" | "XYZ";

export type PeakResponseRow = {
  nodeId: string;
  component: PeakResponseComponent;
  label: string;
  maxValue: number;
  maxTime: number;
  minValue: number | null;
  minTime: number | null;
  absMaxValue: number;
  absMaxTime: number;
  unit: "m";
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

export function buildPeakResponseRows(
  result: TimeHistoryResult | null | undefined,
): PeakResponseRow[] {
  if (!result?.displacements || !isValidTimeAxis(result.time)) return [];
  const activeDirection = inferTimeHistoryActiveDirection(result);
  const componentSeries = new Map<
    string,
    Partial<Record<TimeHistoryTranslationComponent, number[]>>
  >();

  for (const [key, values] of Object.entries(result.displacements)) {
    const parsed = parseTimeHistoryDisplacementKey(key, activeDirection);
    if (!parsed || !isValidResponseSeries(values, result.time.length)) continue;
    const node = componentSeries.get(parsed.nodeId) ?? {};
    if (!node[parsed.component] || parsed.format === "component") {
      node[parsed.component] = values;
    }
    componentSeries.set(parsed.nodeId, node);
  }

  const xyzByNode = new Map(
    buildXyzDisplacementSeries(result)
      .filter((series) => series.status === "available")
      .map((series) => [series.nodeId, series] as const),
  );
  const nodeIds = new Set([...componentSeries.keys(), ...xyzByNode.keys()]);
  const rows: PeakResponseRow[] = [];

  for (const nodeId of [...nodeIds].sort(compareNodeIds)) {
    const node = componentSeries.get(nodeId) ?? {};
    for (const component of translationComponents) {
      const values = node[component];
      if (!values) continue;
      const extrema = findSignedSeriesExtrema(values, result.time);
      if (!extrema) continue;
      rows.push({
        nodeId,
        component: componentLabel(component),
        label: `${componentLabel(component)}変位`,
        ...extrema,
        unit: "m",
      });
    }
    const xyz = xyzByNode.get(nodeId);
    if (xyz) {
      const maximum = findSeriesMaximum(xyz.values, result.time);
      if (maximum) {
        rows.push({
          nodeId,
          component: "XYZ",
          label: "XYZ合成",
          maxValue: maximum.value,
          maxTime: maximum.time,
          minValue: null,
          minTime: null,
          absMaxValue: maximum.value,
          absMaxTime: maximum.time,
          unit: "m",
        });
      }
    }
  }
  return rows;
}

export function formatPeakResponseCsv(rows: PeakResponseRow[]): string {
  const header = [
    "nodeId",
    "component",
    "maxValue",
    "maxTime",
    "minValue",
    "minTime",
    "absMaxValue",
    "absMaxTime",
    "unit",
  ];
  return [
    header,
    ...rows.map((row) => [
      row.nodeId,
      row.component,
      row.maxValue,
      row.maxTime,
      row.minValue ?? "",
      row.minTime ?? "",
      row.absMaxValue,
      row.absMaxTime,
      row.unit,
    ]),
  ].map((columns) => columns.map(csvCell).join(",")).join("\r\n");
}

export function formatPeakResponseTsv(rows: PeakResponseRow[]): string {
  const header = ["nodeId", "component", "maxValue", "maxTime", "minValue", "minTime", "absMaxValue", "absMaxTime", "unit"];
  return [
    header,
    ...rows.map((row) => [
      row.nodeId,
      row.component,
      row.maxValue,
      row.maxTime,
      row.minValue ?? "",
      row.minTime ?? "",
      row.absMaxValue,
      row.absMaxTime,
      row.unit,
    ]),
  ].map((columns) => columns.join("\t")).join("\n");
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

function findSignedSeriesExtrema(
  values: number[],
  time: number[],
): Pick<PeakResponseRow, "maxValue" | "maxTime" | "minValue" | "minTime" | "absMaxValue" | "absMaxTime"> | null {
  if (!isValidResponseSeries(values, time.length) || !isValidTimeAxis(time)) return null;
  let maxIndex = 0;
  let minIndex = 0;
  let absMaxIndex = 0;
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] > values[maxIndex]) maxIndex = index;
    if (values[index] < values[minIndex]) minIndex = index;
    if (Math.abs(values[index]) > Math.abs(values[absMaxIndex])) absMaxIndex = index;
  }
  return {
    maxValue: values[maxIndex],
    maxTime: time[maxIndex],
    minValue: values[minIndex],
    minTime: time[minIndex],
    absMaxValue: Math.abs(values[absMaxIndex]),
    absMaxTime: time[absMaxIndex],
  };
}

function isValidTimeAxis(time: number[]): boolean {
  return Array.isArray(time) && time.length > 0 && time.every(Number.isFinite);
}

function isValidResponseSeries(values: number[], expectedLength: number): boolean {
  return Array.isArray(values) && values.length > 0 && values.length === expectedLength && values.every(Number.isFinite);
}

function componentLabel(component: TimeHistoryTranslationComponent): Exclude<PeakResponseComponent, "XYZ"> {
  return component === "ux" ? "X" : component === "uy" ? "Y" : "Z";
}

function compareNodeIds(left: string, right: string): number {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}
