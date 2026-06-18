export type EngineeringScale = {
  factor: number;
  prefix: "" | "μ" | "m" | "k";
};

export function chooseEngineeringScale(maxAbs: number): EngineeringScale {
  if (!Number.isFinite(maxAbs) || maxAbs === 0) return { factor: 1, prefix: "" };
  if (maxAbs < 1e-3) return { factor: 1e6, prefix: "μ" };
  if (maxAbs < 1) return { factor: 1e3, prefix: "m" };
  if (maxAbs >= 1e3) return { factor: 1e-3, prefix: "k" };
  return { factor: 1, prefix: "" };
}

export function formatExponentialTick(value: number): string {
  if (!Number.isFinite(value)) return "-";
  return Number(value).toExponential(2);
}

export function formatEngineeringValue(value: number, scale: EngineeringScale): string {
  if (!Number.isFinite(value)) return "-";
  const scaled = value * scale.factor;
  const formatted = Math.abs(scaled) >= 1000 || (Math.abs(scaled) > 0 && Math.abs(scaled) < 0.01)
    ? scaled.toExponential(2)
    : scaled.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  return `${formatted}${scale.prefix}`;
}

export function finiteDomain(values: number[]): [number, number] {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return [-1, 1];
  let min = Math.min(...finite);
  let max = Math.max(...finite);
  if (min === max) {
    const padding = Math.abs(min) > 0 ? Math.abs(min) * 0.1 : 1;
    min -= padding;
    max += padding;
  }
  return [min, max];
}
